import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { CalendarEvent } from '@/lib/types';
import type { Event as PrismaEvent } from '@prisma/client';

function serialize(ev: PrismaEvent): CalendarEvent {
  return {
    id: ev.id,
    title: ev.title,
    date: ev.date.toISOString().slice(0, 10),
    startTime: ev.startTime ?? undefined,
    endTime: ev.endTime ?? undefined,
    location: ev.location ?? undefined,
    description: ev.description ?? undefined,
    categoryId: ev.categoryId,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.event.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();

  if (body.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid categoryId' }, { status: 400 });
    }
  }

  let newDate: Date | undefined;
  if (body.date !== undefined) {
    newDate = new Date(body.date);
    if (Number.isNaN(newDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
  }

  const event = await prisma.event.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(newDate !== undefined && { date: newDate }),
      ...(body.startTime !== undefined && { startTime: body.startTime || null }),
      ...(body.endTime !== undefined && { endTime: body.endTime || null }),
      ...(body.location !== undefined && { location: body.location || null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
    },
  });

  return NextResponse.json({ event: serialize(event) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.event.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.event.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
