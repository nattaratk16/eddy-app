import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Task } from '@/lib/types';
import type { Task as PrismaTask, Subtask as PrismaSubtask, Event as PrismaEvent } from '@prisma/client';

function serialize(t: PrismaTask & { subtasks?: PrismaSubtask[]; scheduledEvent?: PrismaEvent | null }): Task {
  return {
    id: t.id,
    title: t.title,
    done: t.done,
    priority: t.priority as Task['priority'],
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
    category: t.category ?? undefined,
    subtasks: t.subtasks?.map((s) => ({ id: s.id, title: s.title, done: s.done })),
    estimatedMinutes: t.estimatedMinutes ?? undefined,
    // งานที่เอ็ดดี้จัดลงปฏิทินให้แล้ว (ถ้า event ถูกลบในหน้าปฏิทิน ความสัมพันธ์จะถูกล้างเป็น null เอง)
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { subtasks: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }, scheduledEvent: true },
  });
  return NextResponse.json({ tasks: tasks.map(serialize) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body?.title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  let dueDate: Date | null = null;
  if (body.dueDate) {
    dueDate = new Date(body.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 });
    }
  }

  const estimatedMinutes =
    typeof body.estimatedMinutes === 'number' && Number.isFinite(body.estimatedMinutes) ? body.estimatedMinutes : null;

  const task = await prisma.task.create({
    data: {
      title: body.title,
      priority: body.priority ?? 'medium',
      category: body.category || null,
      dueDate,
      estimatedMinutes,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ task: serialize(task) }, { status: 201 });
}
