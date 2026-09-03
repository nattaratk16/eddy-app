import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
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
  };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task || task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  if (!body?.title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  const last = await prisma.subtask.findFirst({ where: { taskId: params.id }, orderBy: { order: 'desc' } });
  const subtask = await prisma.subtask.create({
    data: {
      title: body.title,
      taskId: params.id,
      order: (last?.order ?? -1) + 1,
      plannedDate: body.plannedDate ? new Date(`${body.plannedDate}T00:00:00.000Z`) : null,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
    },
  });

  // เพิ่มขั้นตอนใหม่ให้งานที่ปิดไปแล้ว = งานนั้นยังไม่เสร็จจริง ต้องดึงกลับมาเป็น "ยังไม่เสร็จ"
  let taskDone: boolean | undefined;
  if (task.done) {
    await prisma.task.update({ where: { id: params.id }, data: { done: false, completedAt: null } });
    taskDone = false;
  }

  return NextResponse.json({ subtask: serialize(subtask), ...(taskDone !== undefined && { taskDone }) }, { status: 201 });
}
