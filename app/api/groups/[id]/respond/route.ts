import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';

// POST /api/groups/[id]/respond { accept: boolean } - ตอบรับ/ปฏิเสธคำเชิญเข้ากลุ่ม
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'pending') {
    return NextResponse.json({ error: 'ไม่พบคำเชิญที่รอตอบรับ' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const accept = body?.accept === true;

  if (accept) {
    await prisma.groupMember.update({ where: { id: me.id }, data: { status: 'accepted' } });
    return NextResponse.json({ ok: true, status: 'accepted' });
  }
  // ปฏิเสธ = ลบแถวคำเชิญ (เชิญใหม่ได้ภายหลัง)
  await prisma.groupMember.delete({ where: { id: me.id } });
  return NextResponse.json({ ok: true, status: 'declined' });
}
