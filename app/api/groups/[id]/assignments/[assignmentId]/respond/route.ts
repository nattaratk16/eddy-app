import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';

// POST /api/groups/[id]/assignments/[assignmentId]/respond { approve: boolean }
// approve = ยืนยันงานที่ได้รับมอบหมาย → สร้าง event ในปฏิทินส่วนตัว
// reject  = ปฏิเสธ → ลบ event ที่เคยสร้าง (ถ้ามี) แล้วตั้งสถานะ rejected
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; assignmentId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  // ต้องยังเป็นสมาชิกกลุ่ม (กันสมาชิกที่ถูกเอาออกไปแล้วกดยืนยัน assignment ที่ค้างอยู่)
  const membership = await getMembership(params.id, userId);
  if (!membership || membership.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  const assignment = await prisma.groupTaskAssignment.findUnique({
    where: { id: params.assignmentId },
    include: { groupTask: { include: { group: { select: { id: true, name: true, color: true } } } } },
  });
  if (!assignment || assignment.groupTask.groupId !== params.id) {
    return NextResponse.json({ error: 'ไม่พบงานที่มอบหมาย' }, { status: 404 });
  }
  // เฉพาะเจ้าของงานที่ถูกมอบหมายเท่านั้น
  if (assignment.assignedToUserId !== userId) {
    return NextResponse.json({ error: 'งานนี้ไม่ได้มอบหมายให้คุณ' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const approve = body?.approve === true;

  // ---------- ปฏิเสธ ----------
  if (!approve) {
    if (assignment.approvedEventId) {
      await prisma.event.deleteMany({ where: { id: assignment.approvedEventId, userId } });
    }
    await prisma.groupTaskAssignment.update({
      where: { id: assignment.id },
      data: { status: 'rejected', approvedEventId: null },
    });
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // ---------- ยืนยัน ----------
  // ถ้ายืนยันไปแล้วและ event ยังอยู่ = ไม่ต้องทำซ้ำ
  if (assignment.status === 'approved' && assignment.approvedEventId) {
    const existing = await prisma.event.findUnique({ where: { id: assignment.approvedEventId } });
    if (existing) return NextResponse.json({ ok: true, status: 'approved', eventId: existing.id });
  }

  const group = assignment.groupTask.group;
  // หมวดหมู่ปฏิทินของผู้ใช้สำหรับงานกลุ่มนี้ (ใช้ชื่อ+สีของกลุ่ม สร้างถ้ายังไม่มี)
  let category = await prisma.category.findFirst({ where: { userId, name: group.name } });
  if (!category) {
    category = await prisma.category.create({ data: { userId, name: group.name, color: group.color } });
  }

  const event = await prisma.event.create({
    data: {
      title: assignment.groupTask.title,
      date: new Date(`${assignment.date}T00:00:00.000Z`),
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      description: `จากกลุ่ม "${group.name}"`,
      categoryId: category.id,
      userId,
    },
  });

  await prisma.groupTaskAssignment.update({
    where: { id: assignment.id },
    data: { status: 'approved', approvedEventId: event.id },
  });

  return NextResponse.json({ ok: true, status: 'approved', eventId: event.id });
}
