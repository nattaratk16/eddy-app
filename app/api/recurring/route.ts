import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { describeLoopConflict, findLoopConflict, parseDays, serializeDays, todayISOForLoops } from '@/lib/recurring';
import type { RecurringEventInfo } from '@/lib/types';
import type { RecurringEvent } from '@prisma/client';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function serialize(re: RecurringEvent): RecurringEventInfo {
  return {
    id: re.id,
    title: re.title,
    courseCode: re.courseCode,
    days: parseDays(re.days),
    startTime: re.startTime,
    endTime: re.endTime,
    categoryId: re.categoryId,
    endDate: re.endDate ? re.endDate.toISOString().slice(0, 10) : null,
  };
}


// GET /api/recurring - รายการ Loop ทั้งหมดของฉัน
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await prisma.recurringEvent.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ recurring: items.map(serialize) });
}

// POST /api/recurring - สร้าง Loop ใหม่
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'กรุณากรอกชื่อกิจกรรม' }, { status: 400 });

  const courseCode = typeof body?.courseCode === 'string' && body.courseCode.trim() ? body.courseCode.trim() : null;
  if (courseCode && courseCode.length > 20) {
    return NextResponse.json({ error: 'รหัสวิชายาวเกินไป' }, { status: 400 });
  }

  const days = serializeDays(Array.isArray(body?.days) ? body.days.map(Number) : []);
  if (!days) return NextResponse.json({ error: 'กรุณาเลือกวันอย่างน้อย 1 วัน' }, { status: 400 });

  const startTime = typeof body?.startTime === 'string' ? body.startTime : '';
  const endTime = typeof body?.endTime === 'string' ? body.endTime : '';
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return NextResponse.json({ error: 'เวลาไม่ถูกต้อง (HH:mm)' }, { status: 400 });
  }
  if (endTime <= startTime) return NextResponse.json({ error: 'เวลาจบต้องหลังเวลาเริ่ม' }, { status: 400 });

  let endDate: Date | null = null;
  if (typeof body?.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.endDate)) {
    endDate = new Date(`${body.endDate}T00:00:00.000Z`);
    if (Number.isNaN(endDate.getTime())) endDate = null;
  }

  // Loop คือ "เวลาไม่ว่างประจำ" ที่ระบบเอาไปคิดเวลาว่าง/ภาระงาน
  // ถ้าลงทับกันได้ เวลาว่างที่คำนวณจะน้อยกว่าความจริง -> ต้องกันตั้งแต่ตอนบันทึก
  const conflict = findLoopConflict(
    { days: parseDays(days), startTime, endTime, endDate: endDate ? endDate.toISOString().slice(0, 10) : null },
    (await prisma.recurringEvent.findMany({ where: { userId: session.user.id } })).map((r) => ({
      id: r.id,
      title: r.courseCode ? `${r.courseCode} ${r.title}` : r.title,
      days: parseDays(r.days),
      startTime: r.startTime,
      endTime: r.endTime,
      endDate: r.endDate ? r.endDate.toISOString().slice(0, 10) : null,
    })),
    todayISOForLoops(),
  );
  if (conflict) {
    return NextResponse.json({ error: describeLoopConflict(conflict) }, { status: 409 });
  }

  const created = await prisma.recurringEvent.create({
    data: {
      userId: session.user.id,
      title,
      courseCode,
      days,
      startTime,
      endTime,
      categoryId: typeof body?.categoryId === 'string' && body.categoryId ? body.categoryId : null,
      endDate,
    },
  });

  return NextResponse.json({ recurring: serialize(created) }, { status: 201 });
}
