import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';

// DELETE /api/groups/[id]/tasks/[taskId] - ลบงานกลุ่ม (ผู้สร้างงาน หรือเจ้าของกลุ่ม ที่ยังเป็นสมาชิก)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  const task = await prisma.groupTask.findUnique({ where: { id: params.taskId } });
  if (!task || task.groupId !== params.id) {
    return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
  }

  const group = await prisma.group.findUnique({ where: { id: params.id }, select: { ownerId: true } });
  if (task.createdById !== userId && group?.ownerId !== userId) {
    return NextResponse.json({ error: 'เฉพาะผู้สร้างงานหรือเจ้าของกลุ่มเท่านั้น' }, { status: 403 });
  }

  // ลบ event ในปฏิทินส่วนตัวที่ถูกยืนยันจากงานนี้ (กัน event ค้างอ้างอิงงานที่ถูกลบ)
  const asg = await prisma.groupTaskAssignment.findUnique({ where: { groupTaskId: params.taskId } });
  if (asg?.approvedEventId) {
    await prisma.event.deleteMany({ where: { id: asg.approvedEventId } });
  }

  await prisma.groupTask.delete({ where: { id: params.taskId } });
  return NextResponse.json({ ok: true });
}
