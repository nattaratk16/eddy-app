import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/groups/[id]/members/[memberId] - ออกจากกลุ่ม (ตัวเอง) หรือเจ้าของเอาสมาชิกออก
export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string; memberId: string }> }
) {
  const params = await props.params;
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

  // เก็บกวาดงานกลุ่มที่เคยมอบหมายให้คนนี้ - ไม่งั้นจะค้างเป็น "รอยืนยัน"/"ลงปฏิทินแล้ว" ตลอดไป
  // โดยไม่มีใครกดยืนยัน/ติ๊กเสร็จให้ได้อีกเลย (งานตัวเองไม่ถูกลบ แค่กลับไปเป็น "ยังไม่ได้มอบหมาย")
  const assignments = await prisma.groupTaskAssignment.findMany({
    where: { assignedToUserId: target.userId, groupTask: { groupId: params.id } },
    select: { id: true, groupTaskId: true, approvedEventId: true },
  });
  const eventIds = assignments.map((a) => a.approvedEventId).filter((x): x is string => !!x);
  if (eventIds.length > 0) await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  if (assignments.length > 0) {
    await prisma.groupTaskAssignment.deleteMany({ where: { id: { in: assignments.map((a) => a.id) } } });
    // งานที่เคยติ๊กว่าเสร็จแล้วแต่เจ้าของถูกเอาออกจากกลุ่มไปแล้ว ต้องรีเซ็ตกลับด้วย - ไม่งั้นจะค้าง
    // เป็น "เสร็จแล้ว" ถาวร เพราะ PATCH .../tasks/[taskId] ต้องเช็ค assignment.assignedToUserId
    // ที่ตอนนี้ไม่มีอยู่แล้ว (assignment ถูกลบไปข้างบน) เลยไม่มีใครติ๊กกลับให้ได้อีกเลย
    await prisma.groupTask.updateMany({
      where: { id: { in: assignments.map((a) => a.groupTaskId) } },
      data: { done: false, completedAt: null },
    });
  }

  await prisma.groupMember.delete({ where: { id: target.id } });
  return NextResponse.json({ ok: true });
}
