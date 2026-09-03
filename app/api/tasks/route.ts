import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { currentMonthBangkok, monthRangeBangkok, todayISOBangkok } from '@/lib/thaiTime';
import { syncDeadlineEvent } from '@/lib/taskCalendar';
import type { Task } from '@/lib/types';
import type { Task as PrismaTask, Subtask as PrismaSubtask, Event as PrismaEvent } from '@prisma/client';

function serialize(t: PrismaTask & { subtasks?: PrismaSubtask[]; scheduledEvent?: PrismaEvent | null }): Task {
  return {
    id: t.id,
    title: t.title,
    done: t.done,
    priority: t.priority as Task['priority'],
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
    dueTime: t.dueTime ?? undefined,
    deadlineOnCalendar: !!t.deadlineEventId,
    startDate: t.startDate ? t.startDate.toISOString().slice(0, 10) : undefined,
    category: t.category ?? undefined,
    subtasks: t.subtasks?.map((s) => ({
      id: s.id,
      title: s.title,
      done: s.done,
      plannedDate: s.plannedDate ? s.plannedDate.toISOString().slice(0, 10) : undefined,
      startTime: s.startTime ?? undefined,
      endTime: s.endTime ?? undefined,
      estimatedMinutes: s.estimatedMinutes ?? undefined,
      onCalendar: !!s.scheduledEventId,
    })),
    estimatedMinutes: t.estimatedMinutes ?? undefined,
    // งานที่เอ็ดดี้จัดลงปฏิทินให้แล้ว (ถ้า event ถูกลบในหน้าปฏิทิน ความสัมพันธ์จะถูกล้างเป็น null เอง)
    scheduled: t.scheduledEvent
      ? {
          eventId: t.scheduledEvent.id,
          date: t.scheduledEvent.date.toISOString().slice(0, 10),
          startTime: t.scheduledEvent.startTime ?? undefined,
          endTime: t.scheduledEvent.endTime ?? undefined,
        }
      : undefined,
  };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  // งานที่เสร็จแล้วไม่ต้องส่งมาในนี้ - อาจสะสมเป็นร้อยเป็นพันชิ้นตลอดอายุการใช้งาน
  // ถ้าส่งมาด้วยทุกครั้งจะโหลดหน้าช้าขึ้นเรื่อยๆ ตามประวัติที่สะสม
  // หน้า To-do ดึงงานที่เสร็จแล้วแยกทีละเดือนจาก GET /api/tasks/done แทน (ดูไฟล์นั้น)
  // ตัวเลขเดือนปัจจุบัน ให้การ์ดสรุปความคืบหน้าในหน้า To-do ตัดตามเดือนเหมือนกล่อง "เสร็จแล้ว"
  // (currentMonthBangkok() คำนวณเองเสมอ ไม่มีทางได้ null กลับมาจาก monthRangeBangkok)
  const thisMonth = monthRangeBangkok(currentMonthBangkok())!;
  const [tasks, doneCount, doneCountThisMonth] = await Promise.all([
    prisma.task.findMany({
      where: { userId, done: false },
      orderBy: { createdAt: 'desc' },
      include: { subtasks: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }, scheduledEvent: true },
    }),
    prisma.task.count({ where: { userId, done: true } }),
    prisma.task.count({ where: { userId, done: true, completedAt: { gte: thisMonth.start, lt: thisMonth.end } } }),
  ]);
  return NextResponse.json({ tasks: tasks.map(serialize), doneCount, doneCountThisMonth });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body?.title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  let dueDate: Date | null = null;
  if (body.dueDate) {
    dueDate = new Date(body.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 });
    }
  }

  // วันที่เริ่ม: ถ้าผู้ใช้ไม่ระบุ ให้ default เป็น "วันที่เพิ่มงาน" ตามเวลาไทย
  // (ไม่ใช้ new Date() ตรงๆ เพราะเซิร์ฟเวอร์อาจอยู่คนละโซนเวลากับผู้ใช้)
  let startDate: Date;
  if (body.startDate) {
    startDate = new Date(body.startDate);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }
  } else {
    startDate = new Date(`${todayISOBangkok()}T00:00:00.000Z`);
  }

  const estimatedMinutes =
    typeof body.estimatedMinutes === 'number' && Number.isFinite(body.estimatedMinutes) ? body.estimatedMinutes : null;

  // เวลาส่ง (ไม่บังคับ) - ใส่ได้เฉพาะเมื่อมีวันกำหนดส่ง
  if (body.dueTime && !TIME_RE.test(String(body.dueTime))) {
    return NextResponse.json({ error: 'รูปแบบเวลาส่งไม่ถูกต้อง (ต้องเป็น HH:mm)' }, { status: 400 });
  }
  const dueTime = dueDate && body.dueTime ? String(body.dueTime) : null;

  const task = await prisma.task.create({
    data: {
      title: body.title,
      priority: body.priority ?? 'medium',
      category: body.category || null,
      dueDate,
      dueTime,
      startDate,
      estimatedMinutes,
      userId: session.user.id,
    },
  });

  // งานที่มีกำหนดส่ง -> ขึ้นหมุดวันต้องส่งในปฏิทินทันที (ยังไม่มีอะไรในวันนั้นแน่นอน)
  if (task.dueDate) await syncDeadlineEvent(task.id, session.user.id);
  const withDeadline = await prisma.task.findUnique({ where: { id: task.id } });

  return NextResponse.json({ task: serialize(withDeadline ?? task) }, { status: 201 });
}
