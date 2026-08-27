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
 * body: {
 *   dryRun?: boolean   // true = แค่ "เสนอ" ไม่บันทึกลง DB (ใช้แสดงตัวอย่างให้ผู้ใช้กดยืนยัน)
 *   taskIds?: string[] // ระบุเฉพาะบางงาน (ไม่ระบุ = งานที่ยังไม่เสร็จและยังไม่ได้ลงปฏิทินทั้งหมด)
 *   days?: number      // มองไปข้างหน้ากี่วัน (ค่าเริ่มต้น 14, สูงสุด 30)
 * }
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { placeTask } from '@/lib/freeTime';
import { buildDateWindow, freeSlotsForUsers, todayISOBangkok } from '@/lib/schedule';
import { minutesToTime } from '@/lib/calendarLayout';
import { computePriorityScore } from '@/lib/priorityScore';
import type { Task } from '@/lib/types';

const DEFAULT_WINDOW_DAYS = 14;
const MAX_WINDOW_DAYS = 30;
const DEFAULT_TASK_MINUTES = 60; // งานที่ไม่ได้ระบุเวลาโดยประมาณ ให้ถือว่า 1 ชม.
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

  // งานที่จัดได้ = ยังไม่เสร็จ + ยังไม่เคยลงปฏิทิน
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      done: false,
      scheduledEventId: null,
      ...(taskIds && taskIds.length > 0 ? { id: { in: taskIds } } : {}),
    },
  });

  if (tasks.length === 0) {
    return NextResponse.json({
      scheduled: [],
      skipped: [],
      message: 'ไม่มีงานที่ต้องจัด (งานที่ยังไม่เสร็จถูกลงปฏิทินไว้หมดแล้ว)',
    });
  }

  const dates = buildDateWindow(days);
  const today = todayISOBangkok();
  const slotsByUser = await freeSlotsForUsers([userId], dates);
  const slots = slotsByUser.get(userId) ?? [];

  // เรียงตาม Priority Score: งานที่ "ควรทำก่อน" ได้เลือกช่องเวลาก่อน
  const sorted = [...tasks].sort((a, b) => {
    const toScore = (t: (typeof tasks)[number]) =>
      computePriorityScore({
        id: t.id,
        title: t.title,
        done: t.done,
        priority: t.priority as Task['priority'],
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
        estimatedMinutes: t.estimatedMinutes ?? undefined,
      });
    return toScore(b) - toScore(a);
  });

  const proposals: Proposal[] = [];
  const skipped: Skipped[] = [];

  for (const task of sorted) {
    const duration = task.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : DEFAULT_TASK_MINUTES;
    const due = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null;
    // งานที่เลยกำหนดส่งไปแล้ว ไม่ล็อกด้วย deadline (ไม่งั้นจะหาช่องไม่ได้เลย) - จัดให้เร็วที่สุดแทน
    const overdue = due !== null && due < today;
    const placed = placeTask(slots, duration, overdue ? null : due);

    if (!placed) {
      skipped.push({
        taskId: task.id,
        title: task.title,
        reason:
          due && !overdue
            ? `ไม่มีช่วงว่างยาว ${duration} นาทีก่อนกำหนดส่ง (${due})`
            : `ไม่มีช่วงว่างยาว ${duration} นาทีใน ${days} วันข้างหน้า`,
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
  }

  return NextResponse.json({ scheduled: committed, skipped, committed: true });
}
