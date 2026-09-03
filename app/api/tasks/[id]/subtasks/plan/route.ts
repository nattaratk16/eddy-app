/**
 * POST /api/tasks/[id]/subtasks/plan
 * --------------------------------------------------------------
 * "เอ็ดดี้หาเวลาให้ขั้นตอนย่อยหน่อย" — เสนอวัน/เวลาเท่านั้น ยังไม่บันทึกอะไร
 *
 * ต่างจาก /breakdown ตรงที่ไม่เรียก Gemini เลย ใช้ขั้นตอนที่มีอยู่แล้ว
 * (ไม่ว่าจะมาจาก AI หรือผู้ใช้พิมพ์เอง) แล้วกระจายลงช่องว่างจริงในปฏิทิน
 *
 * ครอบคลุมเคสที่เดิมทำไม่ได้: งานที่ "ไม่มีกำหนดส่ง"
 *   - มีกำหนดส่ง  -> กระจายในช่วง startDate..dueDate
 *   - ไม่มีกำหนดส่ง -> กระจายใน 14 วันข้างหน้า
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { buildDateWindow, freeSlotsForUsers, todayISOBangkok } from '@/lib/schedule';
import { datesBetween, planSubtasks } from '@/lib/subtaskPlan';

const DEFAULT_WINDOW_DAYS = 14;
const MAX_PLAN_DAYS = 60;
const DEFAULT_STEP_MINUTES = 60;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const [task, me] = await Promise.all([
    prisma.task.findUnique({ where: { id: params.id } }),
    prisma.user.findUnique({ where: { id: userId }, select: { bufferMinutes: true } }),
  ]);
  if (!task || task.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  // replan = จัดใหม่ทั้งหมด (ค่าเริ่มต้น = เติมเฉพาะขั้นที่ยังไม่มีวัน)
  const replan = body?.replan === true;

  const subtasks = await prisma.subtask.findMany({
    where: { taskId: params.id, done: false },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  const targets = replan ? subtasks : subtasks.filter((s) => !s.plannedDate);

  if (targets.length === 0) {
    return NextResponse.json({
      proposals: [],
      message: subtasks.length === 0 ? 'งานนี้ยังไม่มีขั้นตอนย่อย' : 'ทุกขั้นตอนมีวันเวลาแล้ว',
    });
  }

  const today = todayISOBangkok();
  const rawStart = (task.startDate ?? task.createdAt).toISOString().slice(0, 10);
  const start = rawStart < today ? today : rawStart;
  const due = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null;

  // ไม่มีกำหนดส่ง (หรือกำหนดส่งเลยไปแล้ว) -> ใช้หน้าต่าง 14 วันข้างหน้าแทน
  // นี่คือจุดที่เดิมพลาด: งานไม่มี deadline เลยไม่เคยได้วัน ทำให้ลงปฏิทินไม่ได้เลย
  const dates =
    due && due >= start ? datesBetween(start, due, MAX_PLAN_DAYS) : buildDateWindow(DEFAULT_WINDOW_DAYS);
  if (dates.length === 0) {
    return NextResponse.json({ proposals: [], message: 'ช่วงเวลาที่ใช้วางแผนไม่ถูกต้อง' });
  }

  // ยกเว้น event ของขั้นตอนที่กำลังจะจัดใหม่ ไม่งั้นตัวมันเองจะถูกนับเป็น "ไม่ว่าง"
  // แล้วกดปุ่มหาเวลาซ้ำทีไร เวลาก็ขยับหนีไปเรื่อยๆ ทั้งที่ตารางไม่ได้เปลี่ยน
  const excludeEventIds = targets.map((t) => t.scheduledEventId).filter((id): id is string => !!id);
  const slotsByUser = await freeSlotsForUsers([userId], dates, { excludeEventIds });
  const slots = slotsByUser.get(userId) ?? [];

  const planned = planSubtasks(
    targets.map((s) => ({ title: s.title, estimatedMinutes: s.estimatedMinutes ?? DEFAULT_STEP_MINUTES })),
    slots,
    dates,
    me?.bufferMinutes ?? 0,
  );

  // planSubtasks เรียงผลลัพธ์ใหม่ตามวันเวลา จึงจับคู่กลับด้วย "ชื่อ" ไม่ได้ตรงๆ ถ้าชื่อซ้ำ
  // ใช้วิธีจับคู่ตามลำดับที่เหลืออยู่แทน (ชื่อเดียวกันตัวแรกที่ยังไม่ถูกใช้)
  const remaining = [...targets];
  const proposals = planned.map((p) => {
    const idx = remaining.findIndex((s) => s.title === p.title);
    const match = idx >= 0 ? remaining.splice(idx, 1)[0] : null;
    return {
      subtaskId: match?.id ?? null,
      title: p.title,
      plannedDate: p.date,
      startTime: p.startTime,
      endTime: p.endTime,
      estimatedMinutes: p.estimatedMinutes,
    };
  });

  const unplaced = proposals.filter((p) => !p.plannedDate).length;
  return NextResponse.json({
    proposals: proposals.filter((p) => p.subtaskId),
    windowStart: dates[0],
    windowEnd: dates[dates.length - 1],
    usedDueDate: !!(due && due >= start),
    message:
      unplaced > 0
        ? `หาเวลาให้ได้ ${proposals.length - unplaced} จาก ${proposals.length} ขั้นตอน — ที่เหลือไม่มีช่องว่างพอ ปรับเองได้`
        : undefined,
  });
}
