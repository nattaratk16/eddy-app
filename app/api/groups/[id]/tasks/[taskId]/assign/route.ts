/**
 * POST /api/groups/[id]/tasks/[taskId]/assign
 * --------------------------------------------------------------
 * มอบหมายงานกลุ่ม "เอง" ให้สมาชิกคนใดคนหนึ่ง (คนละทางกับปุ่ม "ให้เอ็ดดี้จัดตาราง"
 * ที่ /api/groups/[id]/distribute ซึ่งจัดทีเดียวทั้งกลุ่มโดยเรียงตามภาระงาน)
 *
 * ยังคงหาช่วงเวลาว่างให้อัตโนมัติเหมือนเดิม (เพียงแต่ "คนรับ" ถูกเลือกไว้แล้ว ไม่ต้องจัดอันดับ)
 * เพื่อให้ผลลัพธ์ไหลเข้า flow ยืนยัน/ปฏิเสธ/เลือกเวลาอื่นเดียวกับที่ /distribute ใช้อยู่แล้ว
 * ทุกประการ - ไม่ต้องสร้าง UI ใหม่สำหรับเคสนี้เลย
 *
 * ตั้ง source: 'manual' ไว้ กัน /distribute แย่งไปจัดใหม่ตอนกดปุ่ม "ให้เอ็ดดี้จัดตาราง" ทีหลัง
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';
import { buildDateWindow, freeSlotsForUsers } from '@/lib/schedule';
import { placeTask } from '@/lib/freeTime';
import { minutesToTime } from '@/lib/calendarLayout';
import type { GroupAssignmentInfo } from '@/lib/types';

const WINDOW_DAYS = 7;

export async function POST(req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await getMembership(params.id, session.user.id);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const targetUserId = typeof body?.userId === 'string' ? body.userId : '';
  if (!targetUserId) return NextResponse.json({ error: 'ต้องระบุคนที่จะมอบหมายให้' }, { status: 400 });

  const target = await getMembership(params.id, targetUserId);
  if (!target || target.status !== 'accepted') {
    return NextResponse.json({ error: 'คนที่เลือกไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 400 });
  }

  const task = await prisma.groupTask.findUnique({ where: { id: params.taskId }, include: { assignment: true } });
  if (!task || task.groupId !== params.id) {
    return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
  }
  if (task.assignment?.status === 'approved') {
    return NextResponse.json({ error: 'งานนี้ถูกยืนยันลงปฏิทินแล้ว เอาออกจากปฏิทินก่อนถึงจะมอบหมายใหม่ได้' }, { status: 409 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, email: true, bufferMinutes: true },
  });

  const due = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null;
  const dates = buildDateWindow(WINDOW_DAYS);
  const slotsByUser = await freeSlotsForUsers([targetUserId], dates);
  // buffer เป็นของเจ้าของปฏิทิน (คนที่รับงาน) ไม่ใช่ของคนที่กำลังมอบหมาย
  const placed = placeTask(slotsByUser.get(targetUserId) ?? [], task.estimatedMinutes, due, targetUser?.bufferMinutes ?? 0);
  if (!placed) {
    return NextResponse.json(
      { error: 'หาช่วงว่างให้ไม่ทันก่อนกำหนดส่ง ลองเลือกคนอื่นหรือขยายกำหนดส่งดูนะ' },
      { status: 409 },
    );
  }

  // แทนที่การมอบหมายเดิม (ถ้ามีและยังไม่ approve - เช็คไปแล้วด้านบน) ด้วยอันใหม่
  if (task.assignment) {
    await prisma.groupTaskAssignment.delete({ where: { id: task.assignment.id } });
  }
  const assignment = await prisma.groupTaskAssignment.create({
    data: {
      groupTaskId: task.id,
      assignedToUserId: targetUserId,
      date: placed.date,
      startTime: minutesToTime(placed.startMin),
      endTime: minutesToTime(placed.endMin),
      status: 'suggested',
      source: 'manual',
    },
  });

  const out: GroupAssignmentInfo = {
    id: assignment.id,
    assignedToUserId: assignment.assignedToUserId,
    assignedToName: targetUser?.name || targetUser?.email.split('@')[0] || 'สมาชิก',
    date: assignment.date,
    startTime: assignment.startTime,
    endTime: assignment.endTime,
    status: assignment.status as 'suggested' | 'approved' | 'rejected',
    isMine: assignment.assignedToUserId === session.user.id,
  };
  return NextResponse.json({ assignment: out }, { status: 201 });
}
