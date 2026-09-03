import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership, serializeGroup } from '@/lib/groups';

// GET /api/groups/[id] - รายละเอียดกลุ่ม (ต้องเป็นสมาชิกที่รับคำเชิญแล้ว)
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'ไม่พบกลุ่ม หรือคุณยังไม่ได้เป็นสมาชิก' }, { status: 404 });
  }

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  if (!group) return NextResponse.json({ error: 'ไม่พบกลุ่ม' }, { status: 404 });

  return NextResponse.json({ group: serializeGroup(group, userId, { members: group.members }) });
}

// PATCH /api/groups/[id] - เจ้าของแก้ไขชื่อ/รายละเอียด/สี
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const group = await prisma.group.findUnique({ where: { id: params.id } });
  if (!group) return NextResponse.json({ error: 'ไม่พบกลุ่ม' }, { status: 404 });
  if (group.ownerId !== userId) return NextResponse.json({ error: 'เฉพาะเจ้าของกลุ่มเท่านั้น' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const data: { name?: string; description?: string | null; color?: string } = {};
  if (typeof body?.name === 'string') {
    const n = body.name.trim();
    if (!n) return NextResponse.json({ error: 'ชื่อกลุ่มห้ามว่าง' }, { status: 400 });
    data.name = n;
  }
  if (typeof body?.description === 'string') data.description = body.description.trim() || null;
  if (typeof body?.color === 'string') data.color = body.color;

  const updated = await prisma.group.update({ where: { id: params.id }, data });
  return NextResponse.json({ group: serializeGroup(updated, userId) });
}

// DELETE /api/groups/[id] - เจ้าของลบกลุ่ม (ลบสมาชิกทั้งหมดตาม cascade)
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const group = await prisma.group.findUnique({ where: { id: params.id } });
  if (!group) return NextResponse.json({ error: 'ไม่พบกลุ่ม' }, { status: 404 });
  if (group.ownerId !== userId) return NextResponse.json({ error: 'เฉพาะเจ้าของกลุ่มเท่านั้น' }, { status: 403 });

  // ลบ event ในปฏิทินส่วนตัวของสมาชิกที่ถูกยืนยันจากงานของกลุ่มนี้ (กัน event ค้าง)
  const approved = await prisma.groupTaskAssignment.findMany({
    where: { groupTask: { groupId: params.id }, approvedEventId: { not: null } },
    select: { approvedEventId: true },
  });
  const eventIds = approved.map((a) => a.approvedEventId).filter((x): x is string => !!x);
  if (eventIds.length > 0) await prisma.event.deleteMany({ where: { id: { in: eventIds } } });

  await prisma.group.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
