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
    color: (ev.color ?? undefined) as CalendarEvent['color'],
    isDeadline: ev.isDeadline || undefined,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/events?start=YYYY-MM-DD&end=YYYY-MM-DD (ทั้งคู่ไม่บังคับ)
// ไม่ใส่ = โหลดทั้งหมดเหมือนเดิม (พฤติกรรมเดิมของหน้าปฏิทินที่โหลดครั้งเดียวแล้วสลับสัปดาห์/เดือน
// ฝั่ง client ล้วนไม่ยิง fetch ซ้ำ) ใส่มา = กรองช่วงวันที่ให้ ไว้ให้ผู้เรียกที่ต้องการช่วงจำกัด
// (เช่น export, sync ภายนอก) ใช้ได้โดยไม่ต้องโหลดประวัติ event ทั้งหมดของผู้ใช้ทุกครั้ง
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startParam = req.nextUrl.searchParams.get('start');
  const endParam = req.nextUrl.searchParams.get('end');
  if ((startParam && !DATE_RE.test(startParam)) || (endParam && !DATE_RE.test(endParam))) {
    return NextResponse.json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' }, { status: 400 });
  }

  // รวม gte/lte ไว้ใน object เดียวกันเสมอ (ไม่แยก spread คนละก้อน) ไม่งั้นถ้าใส่มาทั้งคู่
  // ก้อนหลังจะเขียนทับ key "date" ของก้อนแรกทิ้งไปเฉยๆ เหลือกรองแค่ขอบเขตเดียว
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startParam) dateFilter.gte = new Date(`${startParam}T00:00:00.000Z`);
  if (endParam) dateFilter.lte = new Date(`${endParam}T00:00:00.000Z`);

  const events = await prisma.event.findMany({
    where: {
      userId: session.user.id,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    },
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
