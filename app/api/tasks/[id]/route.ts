import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Task } from '@/lib/types';
import type { Task as PrismaTask, Event as PrismaEvent } from '@prisma/client';

function serialize(t: PrismaTask & { scheduledEvent?: PrismaEvent | null }): Task {
  return {
    id: t.id,
    title: t.title,
    done: t.done,
    priority: t.priority as Task['priority'],
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  const estimatedMinutes =
    body.estimatedMinutes !== undefined
      ? typeof body.estimatedMinutes === 'number' && Number.isFinite(body.estimatedMinutes)
        ? body.estimatedMinutes
        : null
      : undefined;

  // unschedule = เอางานออกจากปฏิทิน -> ลบ event ที่เอ็ดดี้สร้างไว้ (ความสัมพันธ์จะถูกล้างเป็น null เอง)
  if (body.unschedule === true && existing.scheduledEventId) {
    await prisma.event.deleteMany({ where: { id: existing.scheduledEventId, userId: session.user.id } });
  }

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.done !== undefined && { done: body.done }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.category !== undefined && { category: body.category || null }),
      ...(dueDate !== undefined && { dueDate }),
      ...(estimatedMinutes !== undefined && { estimatedMinutes }),
      ...(body.unschedule === true && { scheduledEventId: null }),
    },
    include: { scheduledEvent: true },
  });

  return NextResponse.json({ task: serialize(task) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.task.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ลบ event ที่เอ็ดดี้สร้างจากงานนี้ไปด้วย ไม่ให้ค้างในปฏิทินหลังงานถูกลบ
  if (existing.scheduledEventId) {
    await prisma.event.deleteMany({ where: { id: existing.scheduledEventId, userId: session.user.id } });
  }
  await prisma.task.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
