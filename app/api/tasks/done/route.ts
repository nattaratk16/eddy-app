/**
 * GET /api/tasks/done?month=YYYY-MM
 * --------------------------------------------------------------
 * งานที่เสร็จแล้วของเดือนหนึ่งเดือน — โหลดทีละเดือนแทนที่จะส่งประวัติทั้งหมดมาทีเดียว
 * (ใช้กับกล่อง "งานที่เสร็จแล้ว" ในหน้า To-do ที่มีปุ่มเลื่อนดูทีละเดือน)
 *
 * ตัดตามเดือนด้วย Task.completedAt (เวลาที่ติ๊กเสร็จจริง ไม่ใช่ updatedAt ที่เปลี่ยนได้จากการแก้อื่นๆ)
 * ไม่ระบุ month = ใช้เดือนปัจจุบันตามเวลาไทย
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { currentMonthBangkok, monthRangeBangkok } from '@/lib/thaiTime';
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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const monthParam = req.nextUrl.searchParams.get('month');
  const month = monthParam ?? currentMonthBangkok();
  const range = monthRangeBangkok(month);
  if (!range) {
    return NextResponse.json({ error: 'รูปแบบเดือนไม่ถูกต้อง (ต้องเป็น YYYY-MM)' }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id, done: true, completedAt: { gte: range.start, lt: range.end } },
    orderBy: { completedAt: 'desc' },
    include: { subtasks: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }, scheduledEvent: true },
  });

  return NextResponse.json({
    tasks: tasks.map(serialize),
    month,
    isCurrentMonth: month === currentMonthBangkok(),
  });
}
