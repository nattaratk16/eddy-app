import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';
import type { GroupTaskInfo } from '@/lib/types';

// GET /api/groups/[id]/tasks - รายการงานกลุ่ม + ผลการมอบหมาย
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 404 });
  }

  const tasks = await prisma.groupTask.findMany({
    where: { groupId: params.id },
    include: { assignment: true },
    orderBy: { createdAt: 'asc' },
  });

  // ชื่อผู้รับมอบหมาย
  const assigneeIds = [...new Set(tasks.map((t) => t.assignment?.assignedToUserId).filter(Boolean) as string[])];
  const users = assigneeIds.length
    ? await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true, email: true } })
    : [];
  const nameOf = new Map(users.map((u) => [u.id, u.name || u.email.split('@')[0]]));

  const out: GroupTaskInfo[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    estimatedMinutes: t.estimatedMinutes,
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
    createdById: t.createdById,
    assignment: t.assignment
      ? {
          id: t.assignment.id,
          assignedToUserId: t.assignment.assignedToUserId,
          assignedToName: nameOf.get(t.assignment.assignedToUserId) ?? 'สมาชิก',
          date: t.assignment.date,
          startTime: t.assignment.startTime,
          endTime: t.assignment.endTime,
          status: t.assignment.status as 'suggested' | 'approved' | 'rejected',
          isMine: t.assignment.assignedToUserId === userId,
        }
      : null,
  }));

  return NextResponse.json({ tasks: out });
}

// POST /api/groups/[id]/tasks - เพิ่มงานกลุ่ม
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'กรุณากรอกชื่องาน' }, { status: 400 });

  let estimatedMinutes = Number(body?.estimatedMinutes);
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) estimatedMinutes = 60;
  estimatedMinutes = Math.min(Math.round(estimatedMinutes), 24 * 60);

  let dueDate: Date | null = null;
  if (typeof body?.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) {
    dueDate = new Date(`${body.dueDate}T00:00:00.000Z`);
    if (Number.isNaN(dueDate.getTime())) dueDate = null;
  }

  const task = await prisma.groupTask.create({
    data: {
      groupId: params.id,
      title,
      description: typeof body?.description === 'string' ? body.description.trim() || null : null,
      estimatedMinutes,
      dueDate,
      createdById: userId,
    },
  });

  const out: GroupTaskInfo = {
    id: task.id,
    title: task.title,
    description: task.description,
    estimatedMinutes: task.estimatedMinutes,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    createdById: task.createdById,
    assignment: null,
  };
  return NextResponse.json({ task: out }, { status: 201 });
}
