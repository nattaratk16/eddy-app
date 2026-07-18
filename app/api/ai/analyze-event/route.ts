import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { analyzeEventSchedule, type ScheduleAnalysis } from '@/lib/gemini';
import { checkScheduleConflict } from '@/lib/aiMock';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, date, startTime, endTime, categoryId, eventId } = body ?? {};
  if (!title || !date) {
    return NextResponse.json({ error: 'title and date are required' }, { status: 400 });
  }

  const userId = session.user.id;
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [sameDayEventsRaw, categoriesRaw] = await Promise.all([
    prisma.event.findMany({
      // eventId = กิจกรรมที่กำลังแก้ไขอยู่ (ถ้ามี) - ต้องไม่เอามาเทียบกับตัวเอง ไม่งั้นจะโดนมองว่า "ชนกับตัวเอง"
      where: { userId, date: { gte: dayStart, lt: dayEnd }, ...(eventId && { id: { not: eventId } }) },
    }),
    prisma.category.findMany({ where: { userId } }),
  ]);

  const categories: CalendarCategory[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color as CalendarCategory['color'],
  }));
  const sameDayEvents: CalendarEvent[] = sameDayEventsRaw.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString().slice(0, 10),
    startTime: e.startTime ?? undefined,
    endTime: e.endTime ?? undefined,
    categoryId: e.categoryId,
  }));
  const categoryName = categories.find((c) => c.id === categoryId)?.name;

  let analysis: ScheduleAnalysis | null = null;
  try {
    analysis = await analyzeEventSchedule({
      newEvent: { title, date, startTime, endTime, categoryName },
      sameDayEvents,
      categories,
    });
  } catch {
    analysis = null;
  }

  if (!analysis) {
    // fallback: ใช้ตัวตรวจเวลาชนกันแบบ local
    if (startTime) {
      const conflict = checkScheduleConflict(startTime, endTime, sameDayEvents);
      analysis = conflict
        ? {
            hasConflict: true,
            densityLevel: sameDayEvents.length >= 4 ? 'แน่นมาก' : sameDayEvents.length >= 2 ? 'ค่อนข้างแน่น' : 'ปกติ',
            message: `ช่วงเวลานี้ชนกับ "${conflict.conflictsWith.title}" นะ ลองเวลา ${conflict.suggestedStart}-${conflict.suggestedEnd} ดูไหม`,
            suggestedStart: conflict.suggestedStart,
            suggestedEnd: conflict.suggestedEnd,
          }
        : {
            hasConflict: false,
            densityLevel: sameDayEvents.length >= 4 ? 'แน่นมาก' : sameDayEvents.length >= 2 ? 'ค่อนข้างแน่น' : 'ว่าง',
            message: 'ช่วงเวลานี้ว่างอยู่นะ',
          };
    } else {
      analysis = { hasConflict: false, densityLevel: 'ปกติ', message: 'ยังไม่ได้ระบุเวลา' };
    }
  }

  return NextResponse.json({ analysis });
}
