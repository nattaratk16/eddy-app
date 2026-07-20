import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership, serializeMember } from '@/lib/groups';

// POST /api/groups/[id]/invite { email } - เชิญผู้ใช้เข้ากลุ่มด้วยอีเมล (สร้างคำเชิญสถานะ pending)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  // ผู้เชิญต้องเป็นสมาชิกที่รับคำเชิญแล้ว
  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) return NextResponse.json({ error: 'กรุณากรอกอีเมล' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, image: true } });
  if (!target) {
    return NextResponse.json({ error: 'ไม่พบผู้ใช้อีเมลนี้ (เพื่อนต้องสมัครสมาชิก EDDY ก่อน)' }, { status: 404 });
  }
  if (target.id === userId) {
    return NextResponse.json({ error: 'คุณอยู่ในกลุ่มนี้อยู่แล้ว' }, { status: 400 });
  }

  const existing = await getMembership(params.id, target.id);
  if (existing) {
    const msg = existing.status === 'pending' ? 'เชิญคนนี้ไปแล้ว รอเขาตอบรับอยู่' : 'คนนี้เป็นสมาชิกกลุ่มอยู่แล้ว';
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const member = await prisma.groupMember.create({
    data: { groupId: params.id, userId: target.id, role: 'member', status: 'pending', invitedById: userId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json({ member: serializeMember(member, userId) }, { status: 201 });
}
