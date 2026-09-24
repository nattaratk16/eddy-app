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

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task || task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  if (!body?.title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  for (const key of ['startTime', 'endTime'] as const) {
    if (body[key] && !TIME_RE.test(String(body[key]))) {
      return NextResponse.json({ error: `Invalid ${key} (ต้องเป็นรูปแบบ HH:mm)` }, { status: 400 });
    }
  }

  const last = await prisma.subtask.findFirst({ where: { taskId: params.id }, orderBy: { order: 'desc' } });
  const created = await prisma.subtask.create({
    data: {
      title: body.title,
      taskId: params.id,
      order: (last?.order ?? -1) + 1,
      plannedDate: body.plannedDate ? new Date(`${body.plannedDate}T00:00:00.000Z`) : null,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
    },
  });

  // มีวัน/เวลาตั้งแต่สร้าง -> ต้องขึ้น event ในปฏิทินทันที เหมือนที่ PATCH ทำตอนแก้วัน/เวลาทีหลัง
  // ไม่งั้นขั้นตอนนี้จะโชว์ว่า "มีกำหนดเวลา" ในหน้า To-do แต่ freeTime/conflict ไม่รู้ว่าช่วงนี้ถูกจองแล้ว
  if (created.plannedDate) {
    await syncSubtaskEvent(created.id, session.user.id);
    await syncDeadlineEvent(params.id, session.user.id);
  }
  const subtask = (await prisma.subtask.findUnique({ where: { id: created.id } })) ?? created;

  // เพิ่มขั้นตอนใหม่ให้งานที่ปิดไปแล้ว = งานนั้นยังไม่เสร็จจริง ต้องดึงกลับมาเป็น "ยังไม่เสร็จ"
  let taskDone: boolean | undefined;
  if (task.done) {
    await prisma.task.update({ where: { id: params.id }, data: { done: false, completedAt: null } });
    taskDone = false;
  }

  return NextResponse.json({ subtask: serialize(subtask), ...(taskDone !== undefined && { taskDone }) }, { status: 201 });
}
