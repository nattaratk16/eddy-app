/**
 * POST /api/tasks/schedule
 * --------------------------------------------------------------
 * "ให้เอ็ดดี้จัดงานลงปฏิทินให้" - หาช่วงว่างจริงในปฏิทินของผู้ใช้
 * แล้ววางงานใน To-do ที่ยังไม่ได้ลงปฏิทินลงไปโดยไม่ชนของเดิม
 *
 * เป็นการคำนวณ local ล้วน (ไม่เรียก Gemini) ตามหลักของโปรเจกต์:
 * เรื่อง "เมื่อไหร่/ว่างไหม" ต้องแม่นยำ -> ใช้อัลกอริทึม ไม่ปล่อยให้ AI เดา
 * ส่วนการจัดลำดับว่างานไหนควรได้ช่องเวลาก่อน ใช้ Priority Score เดิม
 * (ความสำคัญ + ความเร่งด่วนจากกำหนดส่ง + ความยาวงาน) ให้ตรงกับปุ่ม
 * "เรียงตาม AI แนะนำ" ในหน้า To-do
 *
 * กติกาการเลือกวัน:
 *   - งานที่ "มีกำหนดส่ง"    -> ลงวันกำหนดส่งเสมอ (เพราะนั่นคือวันที่ต้องส่งจริง)
 *                              ถ้าวันนั้นไม่มีช่องว่างพอ ก็ยังลงวันนั้นโดยยอมให้ชนกับงานอื่น
 *   - งานที่ "ไม่มีกำหนดส่ง" -> หาช่องว่างแรกที่พอในหน้าต่างที่มองอยู่
 *
 * body: {
 *   dryRun?: boolean      // true = แค่ "เสนอ" ไม่บันทึกลง DB (ใช้แสดงตัวอย่างให้ผู้ใช้กดยืนยัน)
 *   taskIds?: string[]    // ระบุเฉพาะบางงาน (ไม่ระบุ = งานที่ยังไม่เสร็จและยังไม่ได้ลงปฏิทินทั้งหมด)
 *   days?: number         // มองไปข้างหน้ากี่วัน (ค่าเริ่มต้น 14, สูงสุด 30)
 *   onlyUndated?: boolean // เอาเฉพาะงานที่ยังไม่มีกำหนดส่ง (ใช้กับการ์ด "เอ็ดดี้เห็นว่าคุณมีเวลาว่าง")
 *   at?: { date, startTime, endTime }  // ผู้ใช้เลือกเวลาเอง -> ใช้ค่านี้ตรงๆ ไม่ต้องหาช่องว่างให้
 * }
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { availabilityWindow, placeTask, type FreeSlot } from '@/lib/freeTime';
import { buildDateWindow, freeSlotsForUsers, todayISOBangkok } from '@/lib/schedule';
import { minutesToTime, timeToMinutes } from '@/lib/calendarLayout';
import { compareTasks } from '@/lib/priorityScore';
import { colorForTask } from '@/lib/colors';
import { syncDeadlineEvent } from '@/lib/taskCalendar';
import type { Task } from '@/lib/types';

const DEFAULT_WINDOW_DAYS = 14;
const MAX_WINDOW_DAYS = 30;
const DEFAULT_TASK_MINUTES = 60; // งานที่ไม่ได้ระบุเวลาโดยประมาณ ให้ถือว่า 1 ชม.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * ตรวจว่าเป็นวันที่จริง ไม่ใช่แค่รูปแบบถูก
 * regex อย่างเดียวไม่พอ - "2026-13-99" ผ่านรูปแบบ YYYY-MM-DD แต่ไม่มีอยู่จริง
 * จึงต้องแปลงกลับมาเทียบว่าได้สตริงเดิมไหม (กัน Date auto-rollover เช่น 02-30 -> 03-02)
 */
function isRealDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
const TASK_CATEGORY_NAME = 'สิ่งที่ต้องทำ';
const TASK_CATEGORY_COLOR = 'lilac';

interface Proposal {
  taskId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMin: number;
  dueDate: string | null;
}

interface Skipped {
  taskId: string;
  title: string;
  reason: string;
}

/**
 * วางงานลงช่องว่างของ "วันที่ระบุ" เท่านั้น (ตัดเวลาที่ใช้ออกจาก slot เพื่อกันงานถัดไปทับ)
 * bufferMin เว้นช่วงพักก่อน/หลัง - เหตุผลเดียวกับ lib/freeTime.ts::placeTask (ค่าเริ่มต้น 0 = พฤติกรรมเดิม)
 */
function placeTaskOnDate(
  slots: FreeSlot[],
  date: string,
  durationMin: number,
  bufferMin = 0,
): { date: string; startMin: number; endMin: number } | null {
  for (const slot of slots) {
    if (slot.date !== date) continue;
    const start = slot.startMin + bufferMin;
    const end = start + durationMin;
    if (end + bufferMin <= slot.endMin) {
      const placed = { date, startMin: start, endMin: end };
      slot.startMin = end + bufferMin;
      return placed;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;
  const taskIds: string[] | undefined = Array.isArray(body?.taskIds)
    ? body.taskIds.filter((id: unknown) => typeof id === 'string')
    : undefined;
  const days =
    typeof body?.days === 'number' && Number.isFinite(body.days)
      ? Math.min(Math.max(Math.trunc(body.days), 1), MAX_WINDOW_DAYS)
      : DEFAULT_WINDOW_DAYS;
  const onlyUndated = body?.onlyUndated === true;

  // ผู้ใช้เลือกวัน/เวลาเองจากกล่อง "ลงปฏิทิน" -> ข้ามการหาช่องว่าง ใช้ค่าที่เลือกเลย
  const at =
    body?.at && typeof body.at.date === 'string' && isRealDate(body.at.date) &&
    typeof body.at.startTime === 'string' && TIME_RE.test(body.at.startTime) &&
    typeof body.at.endTime === 'string' && TIME_RE.test(body.at.endTime)
      ? { date: body.at.date as string, startTime: body.at.startTime as string, endTime: body.at.endTime as string }
      : null;
  if (body?.at && !at) {
    return NextResponse.json({ error: 'รูปแบบวัน/เวลาไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD และ HH:mm)' }, { status: 400 });
  }
  if (at && (!taskIds || taskIds.length !== 1)) {
    return NextResponse.json({ error: 'การเลือกเวลาเองใช้ได้ทีละงานเดียว' }, { status: 400 });
  }
  if (at && at.endTime <= at.startTime) {
    return NextResponse.json({ error: 'เวลาจบต้องอยู่หลังเวลาเริ่ม' }, { status: 400 });
  }
  // เช็คว่าช่วงเวลาที่เลือกเองไม่ชนกิจกรรมอื่นในปฏิทิน - เหมือนกับ override ของ
  // app/api/groups/[id]/assignments/[assignmentId]/respond/route.ts ที่เขียนลง Event ตารางเดียวกัน
  if (at) {
    const atStartMin = timeToMinutes(at.startTime)!;
    const atEndMin = timeToMinutes(at.endTime)!;
    const slotsByUser = await freeSlotsForUsers([userId], [at.date]);
    const fits = (slotsByUser.get(userId) ?? []).some(
      (s) => s.date === at.date && s.startMin <= atStartMin && s.endMin >= atEndMin,
    );
    if (!fits) {
      return NextResponse.json({ error: 'ช่วงเวลานี้ชนกับกิจกรรมอื่นในปฏิทินของคุณ' }, { status: 409 });
    }
  }

  // งานที่จัดได้ = ยังไม่เสร็จ + ยังไม่เคยลงปฏิทิน
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      done: false,
      scheduledEventId: null,
      ...(onlyUndated ? { dueDate: null } : {}),
      ...(taskIds && taskIds.length > 0 ? { id: { in: taskIds } } : {}),
    },
  });

  if (tasks.length === 0) {
    return NextResponse.json({
      scheduled: [],
      skipped: [],
      message: onlyUndated
        ? 'ตอนนี้ไม่มีงานค้างที่ยังไม่ได้กำหนดวัน'
        : 'ไม่มีงานที่ต้องจัด (งานที่ยังไม่เสร็จถูกลงปฏิทินไว้หมดแล้ว)',
    });
  }

  const today = todayISOBangkok();
  // ขยายหน้าต่างให้ครอบคลุมกำหนดส่งที่ไกลที่สุดด้วย
  // ไม่งั้นงานที่ส่งเกิน 14 วันจะไม่มีข้อมูลช่องว่างของวันนั้น แล้วต้องเดาเวลาเริ่มเอา
  const furthestDue = tasks.reduce<string | null>((max, t) => {
    if (!t.dueDate) return max;
    const d = t.dueDate.toISOString().slice(0, 10);
    return d > today && (max === null || d > max) ? d : max;
  }, null);
  const neededDays = furthestDue
    ? Math.ceil((Date.parse(`${furthestDue}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000) + 1
    : 0;
  const dates = buildDateWindow(Math.min(Math.max(days, neededDays), MAX_WINDOW_DAYS));
  const slotsByUser = await freeSlotsForUsers([userId], dates);
  const slots = slotsByUser.get(userId) ?? [];

  // เรียงด้วยกฎเดียวกับที่ผู้ใช้เห็นในหน้า To-do (กำหนดส่งก่อน แล้วค่อยความสำคัญ)
  // งานที่อยู่บนสุดของลิสต์จึงได้เลือกช่องเวลาก่อน — ผลลัพธ์ตรงกับที่ผู้ใช้คาด
  const toTask = (t: (typeof tasks)[number]): Task => ({
    id: t.id,
    title: t.title,
    done: t.done,
    priority: t.priority as Task['priority'],
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
    estimatedMinutes: t.estimatedMinutes ?? undefined,
  });
  const sorted = [...tasks].sort((a, b) => compareTasks(toTask(a), toTask(b)));

  const proposals: Proposal[] = [];
  const skipped: Skipped[] = [];

  // กรอบเวลาสะดวกของผู้ใช้ ใช้ตอนต้องยัดงานลงวันกำหนดส่งที่เต็มแล้ว
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { dayStart: true, dayEnd: true, bufferMinutes: true },
  });
  const window = availabilityWindow(me?.dayStart, me?.dayEnd);
  const bufferMin = me?.bufferMinutes ?? 0;

  // จุดที่งาน "ถูกบังคับวาง" ล่าสุดของแต่ละวันจบลง
  // ต้องจำไว้เพราะช่องว่างของวันนั้นหมดแล้ว การคำนวณรอบถัดไปจึงไม่มีอะไรให้หัก
  // ถ้าไม่จำ งานทุกชิ้นที่ถูกบังคับลงวันเดียวกันจะได้เวลาเริ่มเดียวกันหมด (ทับกันสนิท)
  const forcedCursor = new Map<string, number>();

  /**
   * บังคับวางงานลงวันที่กำหนด แม้วันนั้นจะไม่มีช่องว่างเหลือแล้ว
   * ใช้กับงานที่มีกำหนดส่ง เพราะผู้ใช้ต้องการเห็นงานอยู่บนวันที่ต้องส่งจริงๆ
   *
   * ยอมให้ทับกับ "กิจกรรมอื่น" ที่มีอยู่ก่อน (ผู้ใช้เลือกกติกานี้เอง)
   * แต่ต้องไม่ทับ "กันเอง" — งานที่ถูกบังคับลงวันเดียวกันจะเรียงต่อกันไป
   *
   * ไม่ใส่ bufferMin ตรงนี้ตั้งใจ - ฟังก์ชันนี้ถูกเรียกเพราะ "ไม่มีที่ว่างพอ" อยู่แล้ว
   * (ถึงขั้นต้องยอมให้ทับกิจกรรมอื่น) การพยายามเว้นช่วงพักในสถานการณ์ที่ที่ว่างไม่พออยู่แล้ว
   * มีแต่จะทำให้งานเบียดกันแน่นกว่าเดิมโดยไม่ได้ประโยชน์อะไรเพิ่ม
   */
  function forcePlaceOn(date: string, durationMin: number): { date: string; startMin: number; endMin: number } {
    const daySlots = slots.filter((s) => s.date === date && s.endMin > s.startMin);
    let startMin = window.startMin;
    if (daySlots.length > 0) {
      const widest = daySlots.reduce((a, b) => (b.endMin - b.startMin > a.endMin - a.startMin ? b : a));
      startMin = widest.startMin;
      widest.startMin = Math.min(widest.endMin, widest.startMin + durationMin);
    }
    // ต่อท้ายงานที่ถูกบังคับลงวันเดียวกันก่อนหน้านี้
    startMin = Math.max(startMin, forcedCursor.get(date) ?? 0);
    // ไม่ให้ล้นออกนอกกรอบเวลาที่สะดวก (เช่น เริ่ม 21:30 งานยาว 2 ชม.)
    if (startMin + durationMin > window.endMin) startMin = Math.max(0, window.endMin - durationMin);
    forcedCursor.set(date, startMin + durationMin);
    return { date, startMin, endMin: startMin + durationMin };
  }

  for (const task of sorted) {
    const duration = task.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : DEFAULT_TASK_MINUTES;
    const due = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null;

    let placed: { date: string; startMin: number; endMin: number } | null;
    if (at) {
      // ผู้ใช้กำหนดมาเอง - เช็คว่าชนอะไรไหมไปแล้วด้านบนก่อนเข้าลูปนี้ (at ใช้ได้กับงานเดียวเท่านั้น)
      placed = { date: at.date, startMin: timeToMinutes(at.startTime)!, endMin: timeToMinutes(at.endTime)! };
    } else if (due) {
      // มีกำหนดส่ง -> ลงวันกำหนดส่งเสมอ
      // งานที่เลยกำหนดไปแล้ว ย้อนอดีตไม่ได้ จึงลงวันนี้แทน (เร็วที่สุดที่ยังทำได้จริง)
      const targetDate = due < today ? today : due;
      const dayHasRoom = slots.some((s) => s.date === targetDate && s.endMin - s.startMin >= duration);
      placed = dayHasRoom
        ? placeTaskOnDate(slots, targetDate, duration, bufferMin)
        : forcePlaceOn(targetDate, duration);
    } else {
      // ไม่มีกำหนดส่ง -> หาช่องว่างแรกที่พอ
      placed = placeTask(slots, duration, null, bufferMin);
    }

    if (!placed) {
      skipped.push({
        taskId: task.id,
        title: task.title,
        reason: `ไม่มีช่วงว่างยาว ${duration} นาทีใน ${days} วันข้างหน้า`,
      });
      continue;
    }

    proposals.push({
      taskId: task.id,
      title: task.title,
      date: placed.date,
      startTime: minutesToTime(placed.startMin),
      endTime: minutesToTime(placed.endMin),
      durationMin: duration,
      dueDate: due,
    });
  }

  // โหมดเสนอ: ยังไม่เขียนอะไรลง DB ให้ผู้ใช้ดูก่อนแล้วค่อยกดยืนยัน
  if (dryRun) {
    return NextResponse.json({ scheduled: proposals, skipped, committed: false });
  }

  if (proposals.length === 0) {
    return NextResponse.json({ scheduled: [], skipped, committed: true });
  }

  // หมวดหมู่ปฏิทินสำหรับงานจาก To-do (สร้างครั้งแรกครั้งเดียว)
  let category = await prisma.category.findFirst({ where: { userId, name: TASK_CATEGORY_NAME } });
  if (!category) {
    category = await prisma.category.create({
      data: { userId, name: TASK_CATEGORY_NAME, color: TASK_CATEGORY_COLOR },
    });
  }

  // สร้าง event ทีละงานแล้วผูกกลับเข้า task (ต้องรู้ id ของ event จึง createMany ไม่ได้)
  const committed: Proposal[] = [];
  for (const p of proposals) {
    const event = await prisma.event.create({
      data: {
        title: p.title,
        date: new Date(`${p.date}T00:00:00.000Z`),
        startTime: p.startTime,
        endTime: p.endTime,
        description: 'จากสิ่งที่ต้องทำ',
        // แต่ละงานได้สีของตัวเอง (คำนวณจาก id คงที่) ไม่งั้นงานจาก To-do จะเป็นสีเดียวกันหมด
        color: colorForTask(p.taskId),
        sourceTaskId: p.taskId,
        categoryId: category.id,
        userId,
      },
    });
    // updateMany + เช็ค userId อีกชั้น กันกรณี task ถูกลบไประหว่างทาง
    const updated = await prisma.task.updateMany({
      where: { id: p.taskId, userId, scheduledEventId: null },
      data: { scheduledEventId: event.id },
    });
    if (updated.count === 0) {
      await prisma.event.delete({ where: { id: event.id } });
      skipped.push({ taskId: p.taskId, title: p.title, reason: 'งานนี้ถูกแก้ไข/ลบไปแล้ว' });
      continue;
    }
    committed.push(p);
    // งานหลักเพิ่งถูกวางลงวันกำหนดส่ง -> วันนั้นไม่ว่างแล้ว หมุดต้องหายไป
    await syncDeadlineEvent(p.taskId, userId);
  }

  return NextResponse.json({ scheduled: committed, skipped, committed: true });
}
