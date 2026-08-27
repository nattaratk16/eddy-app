import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { serializeGroup } from '@/lib/groups';

// GET /api/groups - กลุ่มที่ฉันเป็นสมาชิก (รับคำเชิญแล้ว)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const memberships = await prisma.groupMember.findMany({
    where: { userId, status: 'accepted' },
    include: {
      group: { include: { members: { where: { status: 'accepted' }, select: { id: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // จำนวนงานของแต่ละกลุ่ม + งานที่รอฉันกดยืนยัน (ใช้ทำป้ายบนการ์ดในหน้ารายการกลุ่ม)
  const groupIds = memberships.map((m) => m.groupId);
  const [taskCounts, waitingForMe] = await Promise.all([
    prisma.groupTask.groupBy({ by: ['groupId'], where: { groupId: { in: groupIds } }, _count: { _all: true } }),
    prisma.groupTaskAssignment.findMany({
      where: { assignedToUserId: userId, status: 'suggested', groupTask: { groupId: { in: groupIds } } },
      select: { groupTask: { select: { groupId: true } } },
    }),
  ]);
  const taskCountByGroup = new Map(taskCounts.map((t) => [t.groupId, t._count._all]));
  const waitingByGroup = new Map<string, number>();
  for (const a of waitingForMe) {
    const gid = a.groupTask.groupId;
    waitingByGroup.set(gid, (waitingByGroup.get(gid) ?? 0) + 1);
  }

  const groups = memberships.map((m) => ({
    ...serializeGroup(m.group, userId, { memberCount: m.group.members.length }),
    taskCount: taskCountByGroup.get(m.groupId) ?? 0,
    waitingForMeCount: waitingByGroup.get(m.groupId) ?? 0,
  }));
  return NextResponse.json({ groups });
}

// POST /api/groups - สร้างกลุ่มใหม่ (ผู้สร้างเป็นเจ้าของ + สมาชิกอัตโนมัติ)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'กรุณาตั้งชื่อกลุ่ม' }, { status: 400 });
  if (name.length > 60) return NextResponse.json({ error: 'ชื่อกลุ่มยาวเกินไป' }, { status: 400 });

  const group = await prisma.group.create({
    data: {
      name,
      description: typeof body?.description === 'string' ? body.description.trim() || null : null,
      color: typeof body?.color === 'string' ? body.color : 'blue',
      ownerId: userId,
      members: { create: { userId, role: 'owner', status: 'accepted', showEventTitles: true } },
    },
  });

  return NextResponse.json({ group: serializeGroup(group, userId, { memberCount: 1 }) }, { status: 201 });
}
