/**
 * POST /api/groups/[id]/tasks/breakdown
 * --------------------------------------------------------------
 * "ให้เอ็ดดี้แตกงานกลุ่มนี้เป็นขั้นตอนย่อย" - ใช้ตอนกำลังจะเพิ่มงานกลุ่ม (ก่อนกดบันทึกด้วยซ้ำ)
 *
 * ต่างจาก /api/tasks/[id]/breakdown (personal) ตรงที่:
 *   - ยังไม่มี GroupTask อยู่จริงตอนเรียก endpoint นี้ (รับแค่ title/dueDate จากฟอร์ม)
 *   - ไม่วางวัน/เวลาให้ (planSubtasks) เพราะแต่ละขั้นตอนอาจถูกมอบหมายคนละคน คนละเวลาว่าง
 *     - หน้าเว็บจะสร้าง GroupTask แยกทีละแถวเอง แล้วค่อยเรียก .../tasks/[taskId]/assign
 *       ทีหลังถ้าเลือกมอบหมายเองไว้ (ซึ่ง endpoint นั้นจะหาช่วงว่างให้ทีละคนอยู่แล้ว)
 *   - ไม่มีการเขียนอะไรลง DB เลย (pure passthrough ไปหา Gemini) - งานย่อยแต่ละอันจะกลาย
 *     เป็น GroupTask จริงก็ต่อเมื่อผู้ใช้ยืนยันจากรายการที่ได้กลับมา
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';
import { breakdownTask } from '@/lib/gemini';
import { todayISOBangkok } from '@/lib/schedule';
import { datesBetween } from '@/lib/subtaskPlan';

const MAX_PLAN_DAYS = 60;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await getMembership(params.id, session.user.id);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  const body = await req.json();
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'ต้องระบุชื่องาน' }, { status: 400 });

  const dueDate: string | null = typeof body?.dueDate === 'string' && body.dueDate ? body.dueDate : null;
  const totalMinutes: number | null = Number.isFinite(body?.totalMinutes) ? Number(body.totalMinutes) : null;

  const today = todayISOBangkok();
  // ช่วงวันจาก "วันนี้" ถึงกำหนดส่ง - ใช้แค่เป็นคำใบ้บอก Gemini ว่ามีเวลากี่วัน ไม่ได้ใช้วางวันจริง
  // (ต่างจาก personal breakdown ที่ใช้ planDates ไปคำนวณ startTime/endTime ต่อด้วย)
  const spanDays = dueDate && dueDate >= today ? datesBetween(today, dueDate, MAX_PLAN_DAYS).length : null;

  // ระยะเวลาโฟกัสสูงสุดของ "คนที่กำลังแตกงานอยู่" (ยังไม่รู้ว่าใครจะรับงานย่อยไหนตอนนี้)
  const callerProfile = await prisma.user.findUnique({ where: { id: session.user.id }, select: { maxFocusMinutes: true } });

  let steps: Awaited<ReturnType<typeof breakdownTask>> = null;
  try {
    steps = await breakdownTask({ title, spanDays, totalMinutes, maxSessionMinutes: callerProfile?.maxFocusMinutes ?? null });
  } catch {
    steps = null;
  }

  // ไม่มี local fallback (ต้องอาศัยความเข้าใจภาษาจริง) - เหมือน personal breakdown
  if (!steps) {
    return NextResponse.json(
      { error: 'ตอนนี้เอ็ดดี้แตกงานให้ไม่ได้ (อาจยังไม่ได้ตั้งค่า Gemini API หรือเชื่อมต่อไม่สำเร็จ) ลองใหม่อีกครั้งนะ' },
      { status: 502 },
    );
  }

  return NextResponse.json({ steps });
}
