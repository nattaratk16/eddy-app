import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { removeAllTaskEvents, removeDeadlineEvent, removeSubtaskEvents, syncDeadlineEvent } from '@/lib/taskCalendar';
import type { Task } from '@/lib/types';
import type { Task as PrismaTask, Event as PrismaEvent } from '@prisma/client';

function serialize(t: PrismaTask & { scheduledEvent?: PrismaEvent | null }): Task {
  return {
    id: t.id,
    title: t.title,
    done: t.done,
    priority: t.priority as Task['priority'],
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
    dueTime: t.dueTime ?? undefined,
    deadlineOnCalendar: !!t.deadlineEventId,
    startDate: t.startDate ? t.startDate.toISOString().slice(0, 10) : undefined,
    category: t.category ?? undefined,
    estimatedMinutes: t.estimatedMinutes ?? undefined,
    scheduled: t.scheduledEvent
      ? {
          eventId: t.scheduledEvent.id,
          date: t.scheduledEvent.date.toISOString().slice(0, 10),
          startTime: t.scheduledEvent.startTime ?? undefined,
          endTime: t.scheduledEvent.endTime ?? undefined,
        }
      : undefined,
  };
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.task.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();

  let dueDate: Date | null | undefined;
  if (body.dueDate !== undefined) {
    dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 });
    }
  }

  // เวลาส่ง (ไม่บังคับ) - ส่ง null หรือสตริงว่างเพื่อล้าง
  let dueTime: string | null | undefined;
  if (body.dueTime !== undefined) {
    if (body.dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.dueTime))) {
      return NextResponse.json({ error: 'รูปแบบเวลาส่งไม่ถูกต้อง (ต้องเป็น HH:mm)' }, { status: 400 });
    }
    dueTime = body.dueTime || null;
  }

  let startDate: Date | null | undefined;
  if (body.startDate !== undefined) {
    startDate = body.startDate ? new Date(body.startDate) : null;
    if (startDate && Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }
  }

  // งานที่มีขั้นตอนย่อย: จะติ๊กว่าเสร็จได้ก็ต่อเมื่อขั้นตอนย่อยเสร็จครบทุกข้อ
  // เช็คฝั่งเซิร์ฟเวอร์ด้วย ไม่ใช่แค่ซ่อนปุ่มใน UI (กัน request ที่ยิงตรงเข้ามา)
  if (body.done === true) {
    const remaining = await prisma.subtask.count({ where: { taskId: params.id, done: false } });
    if (remaining > 0) {
      return NextResponse.json(
        {
          error: `ยังเหลือขั้นตอนย่อยอีก ${remaining} ข้อ — ติ๊กให้ครบก่อนถึงจะปิดงานนี้ได้`,
          remainingSubtasks: remaining,
        },
        { status: 409 },
      );
    }
  }

  const estimatedMinutes =
    body.estimatedMinutes !== undefined
      ? typeof body.estimatedMinutes === 'number' && Number.isFinite(body.estimatedMinutes)
        ? body.estimatedMinutes
        : null
      : undefined;

  // unschedule = เอางานออกจากปฏิทิน -> ลบ event ที่เอ็ดดี้สร้างไว้ (ความสัมพันธ์จะถูกล้างเป็น null เอง)
  // รวมถึง event ของขั้นตอนย่อยด้วย ไม่งั้นงานหายจากปฏิทินแต่ขั้นตอนย่อยยังค้างอยู่
  if (body.unschedule === true) {
    if (existing.scheduledEventId) {
      await prisma.event.deleteMany({ where: { id: existing.scheduledEventId, userId: session.user.id } });
    }
    await removeSubtaskEvents(params.id, session.user.id);
  }

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.done !== undefined && { done: body.done }),
      // completedAt: บันทึกเฉพาะตอนที่ค่าเปลี่ยนจริง (transition) ไม่ใช่ทุกครั้งที่ body.done ถูกส่งมา
      // ไม่งั้นติ๊กซ้ำ/ส่ง done:true ซ้ำจะรีเซ็ตเวลาที่เสร็จจริงให้กลายเป็น "ตอนนี้" ทุกครั้ง
      ...(body.done !== undefined &&
        body.done !== existing.done && { completedAt: body.done ? new Date() : null }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.category !== undefined && { category: body.category || null }),
      ...(dueDate !== undefined && { dueDate }),
      ...(dueTime !== undefined && { dueTime }),
      ...(startDate !== undefined && { startDate }),
      // ล้างวันกำหนดส่ง = ล้างเวลาส่งไปด้วย ไม่งั้นจะเหลือเวลาลอยๆ ที่ไม่มีวัน
      ...(dueDate === null && { dueTime: null }),
      ...(estimatedMinutes !== undefined && { estimatedMinutes }),
      ...(body.unschedule === true && { scheduledEventId: null }),
    },
    include: { scheduledEvent: true },
  });

  // อะไรก็ตามที่กระทบวันกำหนดส่ง/สถานะงาน/ปฏิทิน ต้องคิดหมุดวันต้องส่งใหม่
  if (
    dueDate !== undefined ||
    dueTime !== undefined ||
    body.done !== undefined ||
    body.title !== undefined ||
    body.unschedule === true
  ) {
    if (task.dueDate && !task.done) await syncDeadlineEvent(params.id, session.user.id);
    else await removeDeadlineEvent(params.id, session.user.id);
  }

  const fresh = await prisma.task.findUnique({ where: { id: params.id }, include: { scheduledEvent: true } });
  return NextResponse.json({ task: serialize(fresh ?? task) });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.task.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ลบ event ทุกใบที่เกิดจากงานนี้ (งานหลัก + ขั้นตอนย่อย + หมุดกำหนดส่ง) ในทีเดียว
  // สำคัญ: Subtask ถูก cascade ลบไปพร้อม Task แต่ event ของมันเป็นแถวแยกที่ไม่ได้ถูกลบตาม
  // ต้องเก็บกวาดก่อนลบงาน ไม่งั้นจะเหลือ event ค้างอยู่ในปฏิทินตลอดไป
  const removedEvents = await removeAllTaskEvents(params.id, session.user.id);
  await prisma.task.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true, removedEvents });
}
