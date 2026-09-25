import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';
import { totalFreeMinutes, placeTask } from '@/lib/freeTime';
import { buildDateWindow } from '@/lib/schedule';
import { computeGroupWorkload } from '@/lib/groupWorkload';
import { rankCandidates, workloadScore } from '@/lib/workload';
import { minutesToTime } from '@/lib/calendarLayout';
import { distributeGroupTasks } from '@/lib/gemini';

const WINDOW_DAYS = 7;

// POST /api/groups/[id]/distribute - ให้ AI หาเวลาว่างร่วม + กระจายงานกลุ่มให้สมาชิก
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    include: {
      user: {
        select: { id: true, name: true, email: true, bio: true, skills: true, dayStart: true, dayEnd: true, bufferMinutes: true },
      },
    },
  });
  if (members.length === 0) return NextResponse.json({ error: 'กลุ่มยังไม่มีสมาชิก' }, { status: 400 });
  // buffer เป็นเรื่องส่วนตัวของเจ้าของปฏิทินแต่ละคน - ใช้ตอนวางงานลงปฏิทินของคนนั้นๆ
  const bufferByUser = new Map(members.map((m) => [m.userId, m.user.bufferMinutes ?? 0]));

  // งานที่ยังไม่ถูก approve (ยังกระจายได้) - ไม่แตะงานที่ถูก "มอบหมายเอง" (source: manual)
  // เพราะเป็นการตัดสินใจของคนแล้ว ปุ่มนี้ไม่ควรแย่งคืนไปจัดใหม่โดยไม่ได้ตั้งใจ
  const allTasks = await prisma.groupTask.findMany({
    where: { groupId: params.id },
    include: { assignment: true },
  });
  const tasks = allTasks.filter(
    (t) => !t.assignment || (t.assignment.status !== 'approved' && t.assignment.source !== 'manual'),
  );
  if (tasks.length === 0) {
    return NextResponse.json({ assigned: 0, unassigned: 0, message: 'ไม่มีงานที่ต้องจัด (งานทั้งหมดถูกยืนยันแล้ว)' });
  }

  // ช่วงว่างต่อคน (คำนวณด้วย lib/schedule.ts ตัวเดียวกับที่หน้า To-do ใช้จัดงานลงปฏิทิน)
  // รวมทั้ง Event ปกติ + Loop ชีวิต และตัดเวลาที่ผ่านมาแล้วของวันนี้ทิ้งให้เรียบร้อย
  // (อาร์เรย์ที่ได้ mutate ได้ - placeTask จะตัดเวลาที่ใช้ออกเพื่อกันงานถัดไปวางทับ)
  const memberIds = members.map((m) => m.userId);
  // เวลาว่าง + ภาระงาน (Workload Score) ของสมาชิกทุกคน - ใช้ตัวคำนวณเดียวกับ GET /workload
  // ไม่นับงานที่รอยืนยันของกลุ่มนี้เป็นภาระ เพราะกำลังจะถูกแทนที่ด้วยการมอบหมายชุดใหม่
  const { slotsByUser, workloadByUser } = await computeGroupWorkload(
    memberIds,
    dates,
    members.map((m) => ({ userId: m.userId, dayStart: m.user.dayStart, dayEnd: m.user.dayEnd })),
    params.id,
  );

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
          skills: m.user.skills,
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
    source: string;
  }[] = [];

  for (const task of sortedTasks) {
    const due = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null;
    // ผู้สมัคร: เรียงตาม Workload Score (ภาระงานน้อยสุดก่อน)
    // คนที่ Gemini เลือกจะถูกดันขึ้นมาก่อน เว้นแต่ภาระงานสูงกว่าคนที่ว่างสุดเกินเพดานความเป็นธรรม
    const candidates = rankCandidates([...workloadByUser.values()], geminiPref.get(task.id));

    for (const uid of candidates) {
      const placed = placeTask(slotsByUser.get(uid)!, task.estimatedMinutes, due, bufferByUser.get(uid) ?? 0);
      if (placed) {
        toCreate.push({
          groupTaskId: task.id,
          assignedToUserId: uid,
          date: placed.date,
          startTime: minutesToTime(placed.startMin),
          endTime: minutesToTime(placed.endMin),
          status: 'suggested',
          source: 'auto',
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

  // แทนที่การมอบหมายเดิม (ที่ยังไม่ approve) ด้วยชุดใหม่ - กันเผื่อไม่แตะ source: manual ซ้ำอีกชั้น
  // (แม้ taskIds จะกรอง task ที่ถูกมอบหมายเองออกไปแล้วตอนสร้าง `tasks` ด้านบน)
  // ลบของเก่า+สร้างของใหม่ในทรานแซกชันเดียว กันเหลือกลุ่มไม่มีการมอบหมายเลยถ้า crash ระหว่างสองขั้นตอนนี้
  const taskIds = tasks.map((t) => t.id);
  await prisma.$transaction(async (tx) => {
    await tx.groupTaskAssignment.deleteMany({
      where: { groupTaskId: { in: taskIds }, status: { not: 'approved' }, source: { not: 'manual' } },
    });
    if (toCreate.length > 0) await tx.groupTaskAssignment.createMany({ data: toCreate });
  });

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
        bookedMinutes: w.bookedMinutes,
        pendingMinutes: w.pendingMinutes,
        freeMinutes: w.freeMinutes,
        assignedMinutes: assignedMinutesByUser.get(m.userId) ?? 0,
        score: Number.isFinite(w.score) ? Number(w.score.toFixed(2)) : null,
      };
    }),
  });
}
