import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { syncDeadlineEvent, syncSubtaskEvent } from '@/lib/taskCalendar';
import type { Subtask } from '@/lib/types';
import type { Subtask as PrismaSubtask } from '@prisma/client';

function serialize(s: PrismaSubtask): Subtask {
  return {
    id: s.id,
    title: s.title,
    done: s.done,
    plannedDate: s.plannedDate ? s.plannedDate.toISOString().slice(0, 10) : undefined,
    startTime: s.startTime ?? undefined,
    endTime: s.endTime ?? undefined,
    estimatedMinutes: s.estimatedMinutes ?? undefined,
    onCalendar: !!s.scheduledEventId,
  };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.subtask.findUnique({ where: { id: params.id }, include: { task: true } });
  if (!existing || existing.task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();

  // ผู้ใช้ปรับวัน/เวลาที่เอ็ดดี้เสนอมาได้เอง (ส่ง null เพื่อล้างค่า)
  let plannedDate: Date | null | undefined;
  if (body.plannedDate !== undefined) {
    plannedDate = body.plannedDate ? new Date(`${body.plannedDate}T00:00:00.000Z`) : null;
    if (plannedDate && Number.isNaN(plannedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid plannedDate' }, { status: 400 });
    }
  }
  for (const key of ['startTime', 'endTime'] as const) {
    if (body[key] !== undefined && body[key] !== null && !TIME_RE.test(String(body[key]))) {
      return NextResponse.json({ error: `Invalid ${key} (ต้องเป็นรูปแบบ HH:mm)` }, { status: 400 });
    }
  }

  await prisma.subtask.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.done !== undefined && { done: body.done }),
      ...(plannedDate !== undefined && { plannedDate }),
      ...(body.startTime !== undefined && { startTime: body.startTime || null }),
      ...(body.endTime !== undefined && { endTime: body.endTime || null }),
    },
  });

  // แก้ชื่อ/วัน/เวลา -> ย้าย event ในปฏิทินตามให้อัตโนมัติ (ล้างวันออก = ลบ event)
  if (body.title !== undefined || plannedDate !== undefined || body.startTime !== undefined || body.endTime !== undefined) {
    await syncSubtaskEvent(params.id, session.user.id);
    // ขั้นตอนอาจเพิ่งถูกวางลง/ย้ายออกจากวันกำหนดส่ง -> หมุดต้องคิดใหม่
    await syncDeadlineEvent(existing.taskId, session.user.id);
  }
  const subtask = (await prisma.subtask.findUnique({ where: { id: params.id } }))!;

  // ติ๊กขั้นตอนย่อยครบทุกข้อ = งานหลักเสร็จ -> ย้ายไปกลุ่ม "เสร็จแล้ว" ให้อัตโนมัติ
  // และถ้าเผลอติ๊กออกทีหลัง งานหลักต้องกลับมาเป็น "ยังไม่เสร็จ" ด้วย
  let taskDone: boolean | undefined;
  if (body.done !== undefined) {
    const remaining = await prisma.subtask.count({ where: { taskId: existing.taskId, done: false } });
    const shouldBeDone = remaining === 0;
    if (shouldBeDone !== existing.task.done) {
      await prisma.task.update({
        where: { id: existing.taskId },
        data: { done: shouldBeDone, completedAt: shouldBeDone ? new Date() : null },
      });
      taskDone = shouldBeDone;
    }
  }

  return NextResponse.json({ subtask: serialize(subtask), ...(taskDone !== undefined && { taskDone }) });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.subtask.findUnique({ where: { id: params.id }, include: { task: true } });
  if (!existing || existing.task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ลบ event ของขั้นตอนนี้ออกจากปฏิทินด้วย ไม่ให้ค้างอยู่หลังขั้นตอนถูกลบ
  if (existing.scheduledEventId) {
    await prisma.event.deleteMany({ where: { id: existing.scheduledEventId, userId: session.user.id } });
  }
  await prisma.subtask.delete({ where: { id: params.id } });
  await syncDeadlineEvent(existing.taskId, session.user.id);

  // ลบขั้นตอนที่ค้างอยู่ออกไป อาจทำให้ที่เหลือเสร็จครบพอดี -> อัปเดตสถานะงานหลักตาม
  const remaining = await prisma.subtask.count({ where: { taskId: existing.taskId, done: false } });
  const total = await prisma.subtask.count({ where: { taskId: existing.taskId } });
  // ถ้าไม่เหลือขั้นตอนย่อยเลย ให้ปล่อยสถานะงานหลักไว้ตามเดิม (กลับไปเป็นงานติ๊กเดียว)
  if (total > 0) {
    const shouldBeDone = remaining === 0;
    if (shouldBeDone !== existing.task.done) {
      await prisma.task.update({
        where: { id: existing.taskId },
        data: { done: shouldBeDone, completedAt: shouldBeDone ? new Date() : null },
      });
    }
  }

  return NextResponse.json({ ok: true, taskDone: total > 0 ? remaining === 0 : existing.task.done });
}
