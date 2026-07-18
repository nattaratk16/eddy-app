import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Subtask } from '@/lib/types';

function serialize(s: { id: string; title: string; done: boolean }): Subtask {
  return { id: s.id, title: s.title, done: s.done };
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
    data: { title: body.title, taskId: params.id, order: (last?.order ?? -1) + 1 },
  });

  return NextResponse.json({ subtask: serialize(subtask) }, { status: 201 });
}
