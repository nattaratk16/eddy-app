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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const events = await prisma.event.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'asc' },
  });
  return NextResponse.json({ events: events.map(serialize) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body?.title || !body?.date || !body?.categoryId) {
    return NextResponse.json({ error: 'title, date, categoryId are required' }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
  if (!category || category.userId !== session.user.id) {
    return NextResponse.json({ error: 'Invalid categoryId' }, { status: 400 });
  }

  const date = new Date(body.date);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      title: body.title,
      date,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      location: body.location || null,
      description: body.description || null,
      categoryId: body.categoryId,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ event: serialize(event) }, { status: 201 });
}
