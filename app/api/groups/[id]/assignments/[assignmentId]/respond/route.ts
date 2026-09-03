import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';
import { freeSlotsForUsers, todayISOBangkok } from '@/lib/schedule';
import { timeToMinutes } from '@/lib/calendarLayout';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// POST /api/groups/[id]/assignments/[assignmentId]/respond { approve: boolean, override?: {date, startTime, endTime} }
// approve = ยืนยันงานที่ได้รับมอบหมาย → สร้าง/อัปเดต event ในปฏิทินส่วนตัว
//   override = ไม่เอาเวลาที่เสนอมา ขอเลือกวัน-เวลาที่สะดวกเอง (ต้องอยู่ก่อนกำหนดส่งและไม่ชนปฏิทินตัวเอง)
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
    // งานที่เคยติ๊กว่าเสร็จ ไม่ควรค้างเป็น "เสร็จแล้ว" ทั้งที่เพิ่งถูกถอดออกจากปฏิทิน
    await prisma.groupTask.update({ where: { id: assignment.groupTaskId }, data: { done: false, completedAt: null } });
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // ---------- ตรวจ override เวลา (ถ้าเลือกวัน-เวลาเองแทนที่จะรับตามที่เสนอ) ----------
  let finalDate = assignment.date;
  let finalStart = assignment.startTime;
  let finalEnd = assignment.endTime;

  const override = body?.override;
  if (override) {
    const date = typeof override.date === 'string' ? override.date : '';
    const startTime = typeof override.startTime === 'string' ? override.startTime : '';
    const endTime = typeof override.endTime === 'string' ? override.endTime : '';
    if (!DATE_RE.test(date) || !TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      return NextResponse.json({ error: 'รูปแบบวัน-เวลาไม่ถูกต้อง' }, { status: 400 });
    }
    const startMin = timeToMinutes(startTime)!;
    const endMin = timeToMinutes(endTime)!;
    if (endMin <= startMin) {
      return NextResponse.json({ error: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม' }, { status: 400 });
    }
    if (date < todayISOBangkok()) {
      return NextResponse.json({ error: 'เลือกวันที่ผ่านมาแล้วไม่ได้' }, { status: 400 });
    }
    const dueISO = assignment.groupTask.dueDate ? assignment.groupTask.dueDate.toISOString().slice(0, 10) : null;
    if (dueISO && date > dueISO) {
      return NextResponse.json({ error: 'เลือกวันเกินกำหนดส่งไม่ได้' }, { status: 400 });
    }
    // เช็คว่าช่วงเวลาที่เลือกไม่ชนกับกิจกรรมอื่นในปฏิทินของตัวเอง (ยกเว้น event เดิมของ assignment นี้เอง)
    const slotsByUser = await freeSlotsForUsers([userId], [date], {
      excludeEventIds: assignment.approvedEventId ? [assignment.approvedEventId] : undefined,
    });
    const fits = (slotsByUser.get(userId) ?? []).some(
      (s) => s.date === date && s.startMin <= startMin && s.endMin >= endMin,
    );
    if (!fits) {
      return NextResponse.json({ error: 'ช่วงเวลานี้ชนกับกิจกรรมอื่นในปฏิทินของคุณ' }, { status: 409 });
    }
    finalDate = date;
    finalStart = startTime;
    finalEnd = endTime;
  }

  // ---------- ยืนยัน ----------
  // ถ้ายืนยันไปแล้วและ event ยังอยู่ และไม่ได้ขอเปลี่ยนเวลา = ไม่ต้องทำซ้ำ
  if (!override && assignment.status === 'approved' && assignment.approvedEventId) {
    const existing = await prisma.event.findUnique({ where: { id: assignment.approvedEventId } });
    if (existing) return NextResponse.json({ ok: true, status: 'approved', eventId: existing.id });
  }

  const group = assignment.groupTask.group;
  // หมวดหมู่ปฏิทินของผู้ใช้สำหรับงานกลุ่มนี้ (ใช้ชื่อ+สีของกลุ่ม สร้างถ้ายังไม่มี)
  let category = await prisma.category.findFirst({ where: { userId, name: group.name } });
  if (!category) {
    category = await prisma.category.create({ data: { userId, name: group.name, color: group.color } });
  }

  // มี event เดิมอยู่แล้ว (เช่นกำลังแก้เวลาของงานที่เคย approve ไปแล้ว) ก็อัปเดตแทนสร้างซ้ำ
  const eventData = {
    title: assignment.groupTask.title,
    date: new Date(`${finalDate}T00:00:00.000Z`),
    startTime: finalStart,
    endTime: finalEnd,
  };
  const event = assignment.approvedEventId
    ? await prisma.event.update({ where: { id: assignment.approvedEventId }, data: eventData }).catch(() => null)
    : null;
  const finalEvent =
    event ??
    (await prisma.event.create({
      data: { ...eventData, description: `จากกลุ่ม "${group.name}"`, categoryId: category.id, userId },
    }));

  await prisma.groupTaskAssignment.update({
    where: { id: assignment.id },
    data: { status: 'approved', approvedEventId: finalEvent.id, date: finalDate, startTime: finalStart, endTime: finalEnd },
  });

  return NextResponse.json({ ok: true, status: 'approved', eventId: finalEvent.id });
}
