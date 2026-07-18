import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Task } from '@/lib/types';
import type { Task as PrismaTask } from '@prisma/client';

function serialize(t: PrismaTask): Task {
  return {
    id: t.id,
    title: t.title,
    done: t.done,
    priority: t.priority as Task['priority'],
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
    category: t.category ?? undefined,
    estimatedMinutes: t.estimatedMinutes ?? undefined,
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

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.done !== undefined && { done: body.done }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.category !== undefined && { category: body.category || null }),
      ...(dueDate !== undefined && { dueDate }),
      ...(estimatedMinutes !== undefined && { estimatedMinutes }),
    },
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

  await prisma.task.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
