/**
 * POST   /api/tasks/[id]/subtasks/schedule  - ลงขั้นตอนย่อยทั้งหมดของงานนี้ในปฏิทิน
 * DELETE /api/tasks/[id]/subtasks/schedule  - เอาขั้นตอนย่อยทั้งหมดออกจากปฏิทิน
 *
 * ใช้ "วัน/เวลาที่วางแผนไว้แล้ว" ตรงๆ ไม่ต้องเสนอใหม่ (ต่างจาก /api/tasks/schedule
 * ที่ต้องไปหาช่องว่างก่อน) เพราะขั้นตอนย่อยมีเวลาของตัวเองอยู่แล้วตั้งแต่ตอนแตกงาน
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { removeSubtaskEvents, syncAllSubtaskEvents, syncDeadlineEvent } from '@/lib/taskCalendar';

async function ownedTask(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { userId: true } });
  return task && task.userId === userId ? task : null;
}

export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await ownedTask(params.id, session.user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const withoutDate = await prisma.subtask.count({ where: { taskId: params.id, plannedDate: null } });
  const count = await syncAllSubtaskEvents(params.id, session.user.id);

  return NextResponse.json({
    count,
    skipped: withoutDate,
    message:
      count === 0
        ? 'ยังไม่มีขั้นตอนย่อยที่กำหนดวันไว้ — กำหนดวันให้ขั้นตอนก่อนถึงจะลงปฏิทินได้'
        : withoutDate > 0
          ? `ลงปฏิทินให้ ${count} ขั้นตอน (อีก ${withoutDate} ขั้นตอนยังไม่ได้กำหนดวัน)`
          : `ลงปฏิทินให้ครบ ${count} ขั้นตอนแล้ว`,
  });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await ownedTask(params.id, session.user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const count = await removeSubtaskEvents(params.id, session.user.id);
  await syncDeadlineEvent(params.id, session.user.id);
  return NextResponse.json({ count, message: `เอาออกจากปฏิทินแล้ว ${count} ขั้นตอน` });
}
