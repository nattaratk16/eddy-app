import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';

// PATCH /api/groups/[id]/me { showEventTitles } - ตั้งค่าความเป็นส่วนตัวของฉันในกลุ่มนี้
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.showEventTitles !== 'boolean') {
    return NextResponse.json({ error: 'ค่าไม่ถูกต้อง' }, { status: 400 });
  }

  await prisma.groupMember.update({ where: { id: me.id }, data: { showEventTitles: body.showEventTitles } });
  return NextResponse.json({ ok: true, showEventTitles: body.showEventTitles });
}
