import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { eventOverlapsWindow } from '@/lib/eventFilters';
import type { CalendarEvent } from '@/lib/types';
import type { Event as PrismaEvent } from '@prisma/client';

function serialize(ev: PrismaEvent): CalendarEvent {
  return {
    id: ev.id,
    title: ev.title,
    date: ev.date.toISOString().slice(0, 10),
    endDate: ev.endDate ? ev.endDate.toISOString().slice(0, 10) : undefined,
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

  // ใช้ eventOverlapsWindow แทนการกรอง date ตรงๆ เพราะกิจกรรมหลายวัน (มี endDate) อาจเริ่มก่อน
  // ช่วงที่ขอมา แต่ยังสิ้นสุดอยู่ในช่วงนั้น - ไม่ใส่ start/end มาเลย = โหลดทั้งหมดเหมือนเดิม
  const windowStart = startParam ? new Date(`${startParam}T00:00:00.000Z`) : undefined;
  // lte ของเดิม (รวมวันสุดท้าย) เทียบเท่ากับ lt ของวันถัดไป
  const windowEnd = endParam
    ? new Date(new Date(`${endParam}T00:00:00.000Z`).getTime() + 86400000)
    : undefined;

  const events = await prisma.event.findMany({
    where: {
      userId: session.user.id,
      ...(windowStart && windowEnd
        ? eventOverlapsWindow(windowStart, windowEnd)
        : windowStart
          ? { OR: [{ endDate: { gte: windowStart } }, { endDate: null, date: { gte: windowStart } }] }
          : windowEnd
            ? { date: { lt: windowEnd } }
            : {}),
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

  // กิจกรรมหลายวัน (ไม่บังคับ) - ต้องไม่ก่อนวันเริ่ม ไม่งั้นความหมาย "ช่วง" จะกลับด้าน
  let endDate: Date | null = null;
  if (body.endDate) {
    endDate = new Date(body.endDate);
    if (Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
    }
    if (endDate < date) {
      return NextResponse.json({ error: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม' }, { status: 400 });
    }
    if (endDate.getTime() === date.getTime()) endDate = null; // เท่ากับวันเริ่ม = ไม่ใช่กิจกรรมหลายวัน
  }

  // ฟอร์มฝั่ง client เช็คอยู่แล้ว แต่เช็คซ้ำที่นี่กันเรียก API ตรงๆ ข้ามฟอร์ม (เช่นจากแชท quick-add)
  if (body.startTime && body.endTime && body.endTime <= body.startTime) {
    return NextResponse.json({ error: 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม' }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      title: body.title,
      date,
      endDate,
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
