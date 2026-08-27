/**
 * POST /api/groups/[id]/join-code  { regenerate?: boolean }
 * --------------------------------------------------------------
 * ขอรหัสเข้าร่วมกลุ่ม
 *   - กลุ่มที่สร้างก่อนมีฟีเจอร์นี้จะยังไม่มีรหัส -> สร้างให้ตอนเรียกครั้งแรก
 *   - regenerate = true (เจ้าของกลุ่มเท่านั้น) -> เปลี่ยนรหัสใหม่ ทำให้รหัสเก่าใช้ไม่ได้อีก
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureJoinCode, getMembership } from '@/lib/groups';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  const group = await prisma.group.findUnique({ where: { id: params.id }, select: { joinCode: true, ownerId: true } });
  if (!group) return NextResponse.json({ error: 'ไม่พบกลุ่ม' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const regenerate = body?.regenerate === true;
  if (regenerate && group.ownerId !== userId) {
    return NextResponse.json({ error: 'เฉพาะเจ้าของกลุ่มเท่านั้นที่เปลี่ยนรหัสได้' }, { status: 403 });
  }

  const joinCode = await ensureJoinCode(params.id, regenerate ? null : group.joinCode);
  return NextResponse.json({ joinCode });
}
