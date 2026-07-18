import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Subtask } from '@/lib/types';

function serialize(s: { id: string; title: string; done: boolean }): Subtask {
  return { id: s.id, title: s.title, done: s.done };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.subtask.findUnique({ where: { id: params.id }, include: { task: true } });
  if (!existing || existing.task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const subtask = await prisma.subtask.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.done !== undefined && { done: body.done }),
    },
  });

  return NextResponse.json({ subtask: serialize(subtask) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.subtask.findUnique({ where: { id: params.id }, include: { task: true } });
  if (!existing || existing.task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.subtask.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
