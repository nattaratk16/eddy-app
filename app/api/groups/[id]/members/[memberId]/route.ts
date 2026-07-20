import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/groups/[id]/members/[memberId] - ออกจากกลุ่ม (ตัวเอง) หรือเจ้าของเอาสมาชิกออก
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; memberId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const target = await prisma.groupMember.findUnique({ where: { id: params.memberId } });
  if (!target || target.groupId !== params.id) {
    return NextResponse.json({ error: 'ไม่พบสมาชิกนี้ในกลุ่ม' }, { status: 404 });
  }

  const group = await prisma.group.findUnique({ where: { id: params.id }, select: { ownerId: true } });
  if (!group) return NextResponse.json({ error: 'ไม่พบกลุ่ม' }, { status: 404 });

  const removingSelf = target.userId === userId;

  if (removingSelf) {
    if (group.ownerId === userId) {
      return NextResponse.json({ error: 'เจ้าของออกจากกลุ่มเองไม่ได้ ถ้าต้องการให้ลบกลุ่มแทน' }, { status: 400 });
    }
  } else {
    // เอาคนอื่นออก = เฉพาะเจ้าของ และห้ามเอาเจ้าของออก
    if (group.ownerId !== userId) {
      return NextResponse.json({ error: 'เฉพาะเจ้าของกลุ่มเท่านั้นที่เอาสมาชิกออกได้' }, { status: 403 });
    }
    if (target.userId === group.ownerId) {
      return NextResponse.json({ error: 'เอาเจ้าของกลุ่มออกไม่ได้' }, { status: 400 });
    }
  }

  await prisma.groupMember.delete({ where: { id: target.id } });
  return NextResponse.json({ ok: true });
}
