import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';
import { totalFreeMinutes, placeTask, type FreeSlot } from '@/lib/freeTime';
import { buildDateWindow, freeSlotsForUsers } from '@/lib/schedule';
import { minutesToTime } from '@/lib/calendarLayout';
import { distributeGroupTasks } from '@/lib/gemini';

const WINDOW_DAYS = 7;

// POST /api/groups/[id]/distribute - ให้ AI หาเวลาว่างร่วม + กระจายงานกลุ่มให้สมาชิก
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  // ช่วงเวลา 7 วันข้างหน้า (เริ่มวันนี้ตามเวลาไทย)
  const dates = buildDateWindow(WINDOW_DAYS);

  // สมาชิก + โปรไฟล์ (เวลาว่าง/นิสัย)
  const members = await prisma.groupMember.findMany({
    where: { groupId: params.id, status: 'accepted' },
    include: { user: { select: { id: true, name: true, email: true, bio: true, dayStart: true, dayEnd: true } } },
  });
  if (members.length === 0) return NextResponse.json({ error: 'กลุ่มยังไม่มีสมาชิก' }, { status: 400 });

  // งานที่ยังไม่ถูก approve (ยังกระจายได้)
  const allTasks = await prisma.groupTask.findMany({
    where: { groupId: params.id },
    include: { assignment: true },
  });
  const tasks = allTasks.filter((t) => !t.assignment || t.assignment.status !== 'approved');
  if (tasks.length === 0) {
    return NextResponse.json({ assigned: 0, unassigned: 0, message: 'ไม่มีงานที่ต้องจัด (งานทั้งหมดถูกยืนยันแล้ว)' });
  }

  // ช่วงว่างต่อคน (คำนวณด้วย lib/schedule.ts ตัวเดียวกับที่หน้า To-do ใช้จัดงานลงปฏิทิน)
  // รวมทั้ง Event ปกติ + Loop ชีวิต และตัดเวลาที่ผ่านมาแล้วของวันนี้ทิ้งให้เรียบร้อย
  // (อาร์เรย์ที่ได้ mutate ได้ - placeTask จะตัดเวลาที่ใช้ออกเพื่อกันงานถัดไปวางทับ)
  const memberIds = members.map((m) => m.userId);
  const slotsByUser: Map<string, FreeSlot[]> = await freeSlotsForUsers(memberIds, dates);

  // ให้ Gemini เลือก "ใครทำงานไหน" (ล้มเหลว/ไม่มี key ก็ปล่อยว่าง แล้วใช้ local ล้วน)
  const geminiPref = new Map<string, string>();
  try {
    const g = await distributeGroupTasks({
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, durationMin: t.estimatedMinutes, dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null })),
      members: members.map((m) => ({ id: m.userId, name: m.user.name || m.user.email.split('@')[0], freeMinutes: totalFreeMinutes(slotsByUser.get(m.userId) ?? []), bio: m.user.bio })),
    });
    if (g) for (const a of g) if (slotsByUser.has(a.userId)) geminiPref.set(a.taskId, a.userId);
  } catch {
    // เงียบไว้ - ใช้ local
  }

  // จัดลำดับงาน: ใกล้ deadline ก่อน แล้วงานยาวก่อน
  const sortedTasks = [...tasks].sort((a, b) => {
    const ad = a.dueDate ? a.dueDate.toISOString().slice(0, 10) : '9999-99-99';
    const bd = b.dueDate ? b.dueDate.toISOString().slice(0, 10) : '9999-99-99';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return b.estimatedMinutes - a.estimatedMinutes;
  });

  const toCreate: {
    groupTaskId: string;
    assignedToUserId: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  }[] = [];

  for (const task of sortedTasks) {
    const due = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null;
    const pref = geminiPref.get(task.id);
    // ผู้สมัคร: คนที่ Gemini เลือกก่อน แล้วตามด้วยคนที่ว่างมากสุด (โหลดบาลานซ์)
    const others = [...slotsByUser.keys()].sort(
      (x, y) => totalFreeMinutes(slotsByUser.get(y)!) - totalFreeMinutes(slotsByUser.get(x)!),
    );
    const candidates = pref ? [pref, ...others.filter((u) => u !== pref)] : others;

    for (const uid of candidates) {
      const placed = placeTask(slotsByUser.get(uid)!, task.estimatedMinutes, due);
      if (placed) {
        toCreate.push({
          groupTaskId: task.id,
          assignedToUserId: uid,
          date: placed.date,
          startTime: minutesToTime(placed.startMin),
          endTime: minutesToTime(placed.endMin),
          status: 'suggested',
        });
        break;
      }
    }
  }

  // แทนที่การมอบหมายเดิม (ที่ยังไม่ approve) ด้วยชุดใหม่
  const taskIds = tasks.map((t) => t.id);
  await prisma.groupTaskAssignment.deleteMany({ where: { groupTaskId: { in: taskIds }, status: { not: 'approved' } } });
  if (toCreate.length > 0) await prisma.groupTaskAssignment.createMany({ data: toCreate });

  return NextResponse.json({
    assigned: toCreate.length,
    unassigned: tasks.length - toCreate.length,
    usedAI: geminiPref.size > 0,
  });
}
