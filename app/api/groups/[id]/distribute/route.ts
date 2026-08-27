import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';
import { totalFreeMinutes, placeTask, type FreeSlot } from '@/lib/freeTime';
import { buildDateWindow, freeSlotsForUsers, nowMinutesBangkok, todayISOBangkok } from '@/lib/schedule';
import { computeMemberWorkload, rankCandidates, workloadScore, type MemberWorkload } from '@/lib/workload';
import { minutesToTime } from '@/lib/calendarLayout';
import { distributeGroupTasks } from '@/lib/gemini';

const WINDOW_DAYS = 7;
const DEFAULT_TASK_MINUTES = 60; // งาน To-do ที่ไม่ได้ระบุเวลา ให้ถือว่า 1 ชม. ตอนคิดภาระงาน

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

  // ---- Workload Score: งานที่ค้างอยู่ของแต่ละคนเทียบกับเวลาว่างที่เหลือ ----
  const windowEnd = new Date(new Date(`${dates[dates.length - 1]}T00:00:00.000Z`).getTime() + 86400000);
  const [pendingTodos, otherGroupAssignments] = await Promise.all([
    // งาน To-do ที่ยังไม่เสร็จและยังไม่ได้จัดลงปฏิทิน (ยังไม่กินช่องเวลา แต่เป็นภาระจริง)
    // นับเฉพาะที่มีกำหนดส่งภายในช่วงที่กำลังจัด (รวมงานที่เลยกำหนดแล้ว) ไม่งั้นงานไกลๆ จะทำให้ตัวเลขเฟ้อ
    prisma.task.findMany({
      where: { userId: { in: memberIds }, done: false, scheduledEventId: null, dueDate: { not: null, lt: windowEnd } },
      select: { userId: true, estimatedMinutes: true },
    }),
    // งานกลุ่มอื่นที่ถูกมอบหมายไว้แล้วแต่ยังไม่ยืนยัน (ยังไม่กลายเป็น event เลยไม่ถูกนับเป็นเวลาไม่ว่าง)
    prisma.groupTaskAssignment.findMany({
      where: {
        assignedToUserId: { in: memberIds },
        status: 'suggested',
        groupTask: { groupId: { not: params.id } },
      },
      select: { assignedToUserId: true, groupTask: { select: { estimatedMinutes: true } } },
    }),
  ]);

  const pendingByUser = new Map<string, number>();
  const addPending = (uid: string, minutes: number) => pendingByUser.set(uid, (pendingByUser.get(uid) ?? 0) + minutes);
  for (const t of pendingTodos) addPending(t.userId, t.estimatedMinutes ?? DEFAULT_TASK_MINUTES);
  for (const a of otherGroupAssignments) addPending(a.assignedToUserId, a.groupTask.estimatedMinutes);

  const today = { date: todayISOBangkok(), nowMin: nowMinutesBangkok() };
  const workloadByUser = new Map<string, MemberWorkload>();
  for (const m of members) {
    workloadByUser.set(
      m.userId,
      computeMemberWorkload(
        {
          userId: m.userId,
          dayStart: m.user.dayStart,
          dayEnd: m.user.dayEnd,
          freeMinutes: totalFreeMinutes(slotsByUser.get(m.userId) ?? []),
          pendingMinutes: pendingByUser.get(m.userId) ?? 0,
        },
        dates,
        today,
      ),
    );
  }

  // ให้ Gemini เลือก "ใครทำงานไหน" (ล้มเหลว/ไม่มี key ก็ปล่อยว่าง แล้วใช้ local ล้วน)
  const geminiPref = new Map<string, string>();
  try {
    const g = await distributeGroupTasks({
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, durationMin: t.estimatedMinutes, dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null })),
      members: members.map((m) => {
        const w = workloadByUser.get(m.userId)!;
        return {
          id: m.userId,
          name: m.user.name || m.user.email.split('@')[0],
          freeMinutes: w.freeMinutes,
          committedMinutes: w.committedMinutes,
          workloadScore: w.score,
          bio: m.user.bio,
        };
      }),
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
    // ผู้สมัคร: เรียงตาม Workload Score (ภาระงานน้อยสุดก่อน)
    // คนที่ Gemini เลือกจะถูกดันขึ้นมาก่อน เว้นแต่ภาระงานสูงกว่าคนที่ว่างสุดเกินเพดานความเป็นธรรม
    const candidates = rankCandidates([...workloadByUser.values()], geminiPref.get(task.id));

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
        // อัปเดตภาระงานของคนนี้ทันที งานชิ้นถัดไปจะได้ตัดสินใจจากภาพที่เป็นจริง
        // (เวลาว่างถูก placeTask ตัดไปแล้ว ส่วนงานที่เพิ่งรับไปนับเข้า committed)
        const w = workloadByUser.get(uid)!;
        const freeLeft = totalFreeMinutes(slotsByUser.get(uid)!);
        workloadByUser.set(uid, {
          ...w,
          bookedMinutes: w.bookedMinutes + task.estimatedMinutes,
          committedMinutes: w.committedMinutes + task.estimatedMinutes,
          freeMinutes: freeLeft,
          score: workloadScore(w.committedMinutes + task.estimatedMinutes, freeLeft),
        });
        break;
      }
    }
  }

  // แทนที่การมอบหมายเดิม (ที่ยังไม่ approve) ด้วยชุดใหม่
  const taskIds = tasks.map((t) => t.id);
  await prisma.groupTaskAssignment.deleteMany({ where: { groupTaskId: { in: taskIds }, status: { not: 'approved' } } });
  if (toCreate.length > 0) await prisma.groupTaskAssignment.createMany({ data: toCreate });

  const assignedMinutesByUser = new Map<string, number>();
  for (const c of toCreate) {
    const minutes = tasks.find((t) => t.id === c.groupTaskId)?.estimatedMinutes ?? 0;
    assignedMinutesByUser.set(c.assignedToUserId, (assignedMinutesByUser.get(c.assignedToUserId) ?? 0) + minutes);
  }

  return NextResponse.json({
    assigned: toCreate.length,
    unassigned: tasks.length - toCreate.length,
    usedAI: geminiPref.size > 0,
    // ภาระงานหลังจัดเสร็จ - ให้หน้าเว็บโชว์ได้ว่ากระจายแล้วแต่ละคนหนักแค่ไหน
    workload: members.map((m) => {
      const w = workloadByUser.get(m.userId)!;
      return {
        userId: m.userId,
        name: m.user.name || m.user.email.split('@')[0],
        committedMinutes: w.committedMinutes,
        freeMinutes: w.freeMinutes,
        assignedMinutes: assignedMinutesByUser.get(m.userId) ?? 0,
        score: Number.isFinite(w.score) ? Number(w.score.toFixed(2)) : null,
      };
    }),
  });
}
