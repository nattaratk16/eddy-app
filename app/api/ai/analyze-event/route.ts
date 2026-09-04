import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { analyzeEventSchedule, buildUserProfileContext, type ScheduleAnalysis } from '@/lib/gemini';
import { checkScheduleConflict } from '@/lib/aiMock';
import { expandRecurring, parseDays } from '@/lib/recurring';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { title, date, startTime, endTime, categoryId, eventId } = body ?? {};
  if (!title || !date) {
    return NextResponse.json({ error: 'title and date are required' }, { status: 400 });
  }

  const userId = session.user.id;
  // Event.date เก็บเป็น "ป้ายวันที่" ที่เที่ยงคืน UTC - สร้างกรอบ 1 วันแบบ UTC ตรงๆ
  // เดิมใช้ setHours(0,0,0,0) + setDate(+1) ซึ่งอิงเวลาท้องถิ่นของเซิร์ฟเวอร์ (และช่วง DST
  // ของบาง timezone จะได้กรอบ 23/25 ชม. แทน 24) ผลลัพธ์เท่าเดิมแต่ไม่ต้องพึ่งโชคอีก
  const dayStart = new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [sameDayEventsRaw, categoriesRaw, user, recurringRaw] = await Promise.all([
    prisma.event.findMany({
      // eventId = กิจกรรมที่กำลังแก้ไขอยู่ (ถ้ามี) - ต้องไม่เอามาเทียบกับตัวเอง ไม่งั้นจะโดนมองว่า "ชนกับตัวเอง"
      // isDeadline:false - หมุดกำหนดส่งมีระยะเวลา 0 นาที ไม่ถือเป็นเวลาที่ถูกจอง เพิ่มกิจกรรมทับได้ตามปกติ
      where: { userId, date: { gte: dayStart, lt: dayEnd }, isDeadline: false, ...(eventId && { id: { not: eventId } }) },
    }),
    prisma.category.findMany({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, bio: true, dayStart: true, dayEnd: true, timezone: true } }),
    // Loop ประจำ (คาบเรียน/เวลาทำงาน) - เป็นเวลาไม่ว่างจริงเหมือนกัน ต้องเอามาเทียบด้วย
    // ไม่งั้นเพิ่มกิจกรรมทับคาบเรียนแล้วระบบจะบอกว่า "ไม่ชน"
    prisma.recurringEvent.findMany({ where: { userId } }),
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
  // กาง Loop ของวันนั้นออกมาเป็นกิจกรรมจริง แล้วรวมเข้ากับกิจกรรมในวันเดียวกัน
  const dateISO = typeof date === 'string' ? date.slice(0, 10) : new Date(date).toISOString().slice(0, 10);
  const loopEvents = expandRecurring(
    recurringRaw.map((r) => ({
      id: r.id,
      title: r.title,
      courseCode: r.courseCode,
      days: parseDays(r.days),
      startTime: r.startTime,
      endTime: r.endTime,
      categoryId: r.categoryId,
      endDate: r.endDate ? r.endDate.toISOString().slice(0, 10) : null,
    })),
    [dateISO],
  );
  const dayEvents: CalendarEvent[] = [...sameDayEvents, ...loopEvents];

  const categoryName = categories.find((c) => c.id === categoryId)?.name;

  let analysis: ScheduleAnalysis | null = null;
  try {
    analysis = await analyzeEventSchedule({
      newEvent: { title, date, startTime, endTime, categoryName },
      sameDayEvents: dayEvents,
      categories,
      userProfile: user ? buildUserProfileContext(user) : undefined,
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
