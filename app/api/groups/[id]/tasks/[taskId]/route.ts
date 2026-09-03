import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';

// PATCH /api/groups/[id]/tasks/[taskId] - ติ๊กว่าเสร็จงานแล้วหรือยัง
// เฉพาะ "เจ้าของงาน" (คนที่ถูกมอบหมายและ approve แล้ว) เท่านั้นที่ติ๊กได้ - สมาชิกคนอื่นดูได้อย่างเดียว
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string; taskId: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  const task = await prisma.groupTask.findUnique({ where: { id: params.taskId }, include: { assignment: true } });
  if (!task || task.groupId !== params.id) {
    return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.done !== 'boolean') {
    return NextResponse.json({ error: 'ต้องระบุ done เป็น true/false' }, { status: 400 });
  }

  // เฉพาะคนที่ถูกมอบหมายงานนี้เท่านั้นที่ติ๊กเสร็จได้ - ให้สมาชิกคนอื่นติดตามได้ แต่ปิดงานแทนกันไม่ได้
  if (task.assignment?.assignedToUserId !== userId) {
    return NextResponse.json({ error: 'เฉพาะเจ้าของงานเท่านั้นที่ติ๊กว่าเสร็จได้' }, { status: 403 });
  }
  if (body.done && task.assignment?.status !== 'approved') {
    return NextResponse.json({ error: 'งานนี้ยังไม่ได้ลงปฏิทิน ต้องยืนยันวัน-เวลาก่อนถึงจะปิดงานได้' }, { status: 409 });
  }

  const updated = await prisma.groupTask.update({
    where: { id: params.taskId },
    data: {
      done: body.done,
      // บันทึกเฉพาะตอนค่าเปลี่ยนจริง (transition) เหมือน Task ส่วนตัว - กันติ๊กซ้ำแล้วเวลาเสร็จเลื่อนไปเรื่อยๆ
      ...(body.done !== task.done && { completedAt: body.done ? new Date() : null }),
    },
  });

  return NextResponse.json({
    task: { id: updated.id, done: updated.done, completedAt: updated.completedAt?.toISOString() ?? null },
  });
}

// DELETE /api/groups/[id]/tasks/[taskId] - ลบงานกลุ่ม (ผู้สร้างงาน หรือเจ้าของกลุ่ม ที่ยังเป็นสมาชิก)
export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string; taskId: string }> }
) {
  const params = await props.params;
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
