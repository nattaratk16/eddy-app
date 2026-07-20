import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { GroupInvitation, PastelColor } from '@/lib/types';

// GET /api/groups/invitations - คำเชิญเข้ากลุ่มที่รอฉันตอบรับ
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const pending = await prisma.groupMember.findMany({
    where: { userId, status: 'pending' },
    include: {
      group: { include: { members: { where: { status: 'accepted' }, select: { id: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // ชื่อผู้เชิญ (invitedById เก็บเป็น string ไม่ใช่ relation จึงดึงชื่อแยก)
  const inviterIds = [...new Set(pending.map((p) => p.invitedById).filter(Boolean) as string[])];
  const inviters = inviterIds.length
    ? await prisma.user.findMany({ where: { id: { in: inviterIds } }, select: { id: true, name: true, email: true } })
    : [];
  const inviterName = new Map(inviters.map((u) => [u.id, u.name || u.email.split('@')[0]]));

  const invitations: GroupInvitation[] = pending.map((p) => ({
    id: p.id,
    groupId: p.groupId,
    groupName: p.group.name,
    groupColor: p.group.color as PastelColor,
    memberCount: p.group.members.length,
    invitedByName: p.invitedById ? inviterName.get(p.invitedById) ?? null : null,
  }));

  return NextResponse.json({ invitations });
}
