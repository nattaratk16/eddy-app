/**
 * lib/groupWorkload.ts
 * --------------------------------------------------------------
 * ดึงข้อมูลจริงจาก DB มาคำนวณ Workload Score ของสมาชิกทั้งกลุ่ม
 *
 * แยกออกมาจาก route กระจายงาน เพราะต้องใช้ 2 ที่:
 *   - POST /api/groups/[id]/distribute  ใช้ตัดสินว่าใครควรได้งานไหน
 *   - GET  /api/groups/[id]/workload    ให้หน้าเว็บโชว์ภาระงานได้โดยไม่ต้องกดจัดตาราง
 *
 * สูตรและเหตุผลอยู่ใน lib/workload.ts (ไฟล์นี้ทำหน้าที่แค่ "หาข้อมูลมาป้อน")
 * --------------------------------------------------------------
 */
import { prisma } from './prisma';
import { totalFreeMinutes, type FreeSlot } from './freeTime';
import { freeSlotsForUsers, nowMinutesBangkok, todayISOBangkok } from './schedule';
import { computeMemberWorkload, type MemberWorkload } from './workload';
import { rawBookedMinutesByKind, scaleToBookedMinutes, type KindMinutes } from './categoryWorkload';

/** งาน To-do ที่ไม่ได้ระบุเวลา ให้ถือว่า 1 ชม. ตอนคิดภาระงาน - export ไว้ให้วิดเจ็ตอื่นใช้ค่าเดียวกัน */
export const DEFAULT_TASK_MINUTES = 60;

export type MemberWorkloadWithKind = MemberWorkload & KindMinutes;

export interface GroupWorkloadResult {
  /** ช่วงว่างของแต่ละคน (mutate ได้ - placeTask จะตัดเวลาที่ใช้ออก) */
  slotsByUser: Map<string, FreeSlot[]>;
  workloadByUser: Map<string, MemberWorkloadWithKind>;
}

/**
 * คำนวณเวลาว่าง + ภาระงานของสมาชิกทุกคนในกลุ่ม
 *
 * @param excludeGroupId กลุ่มที่กำลังจัดอยู่ - งานที่รอยืนยันของกลุ่มนี้จะไม่ถูกนับซ้ำ
 *                       (เพราะกำลังจะถูกแทนที่ด้วยการมอบหมายชุดใหม่)
 */
export async function computeGroupWorkload(
  memberIds: string[],
  dates: string[],
  members: { userId: string; dayStart?: string | null; dayEnd?: string | null }[],
  excludeGroupId?: string,
): Promise<GroupWorkloadResult> {
  const slotsByUser = await freeSlotsForUsers(memberIds, dates);

  const windowEnd = new Date(new Date(`${dates[dates.length - 1]}T00:00:00.000Z`).getTime() + 86400000);
  const [pendingTodos, pendingAssignments] = await Promise.all([
    // งาน To-do ที่ยังไม่เสร็จและยังไม่ได้จัดลงปฏิทิน (ยังไม่กินช่องเวลา แต่เป็นภาระจริง)
    // นับเฉพาะที่มีกำหนดส่งภายในช่วงที่ดูอยู่ (รวมงานที่เลยกำหนดแล้ว) ไม่งั้นงานไกลๆ จะทำให้ตัวเลขเฟ้อ
    prisma.task.findMany({
      where: { userId: { in: memberIds }, done: false, scheduledEventId: null, dueDate: { not: null, lt: windowEnd } },
      select: { userId: true, estimatedMinutes: true },
    }),
    // งานกลุ่มที่ถูกมอบหมายไว้แล้วแต่ยังไม่ยืนยัน (ยังไม่กลายเป็น event เลยไม่ถูกนับเป็นเวลาไม่ว่าง)
    // excludeGroupId = กำลังจะ (re)distribute กลุ่มนี้ - งานที่ถูกจัดอัตโนมัติของกลุ่มนี้กำลังจะถูก
    // แทนที่ด้วยชุดใหม่เลยไม่นับซ้ำ แต่งานที่ "มอบหมายเอง" (source: manual) ยังยืนตัวอยู่ ไม่ได้ถูกแทนที่
    // จึงต้องนับเป็นภาระอยู่เหมือนเดิม (ดู /api/groups/[id]/distribute ที่ไม่แตะ source: manual)
    prisma.groupTaskAssignment.findMany({
      where: {
        assignedToUserId: { in: memberIds },
        status: 'suggested',
        ...(excludeGroupId
          ? { OR: [{ groupTask: { groupId: { not: excludeGroupId } } }, { source: 'manual' }] }
          : {}),
      },
      select: { assignedToUserId: true, groupTask: { select: { estimatedMinutes: true } } },
    }),
  ]);

  const pendingByUser = new Map<string, number>();
  const addPending = (uid: string, minutes: number) => pendingByUser.set(uid, (pendingByUser.get(uid) ?? 0) + minutes);
  for (const t of pendingTodos) addPending(t.userId, t.estimatedMinutes ?? DEFAULT_TASK_MINUTES);
  for (const a of pendingAssignments) addPending(a.assignedToUserId, a.groupTask.estimatedMinutes);

  // นาทีดิบต่อหมวด (วิชาการ/ไม่ใช่วิชาการ) - ใช้แค่หาสัดส่วน ไม่ใช่ตัวเลขสุดท้าย (ดู lib/categoryWorkload.ts)
  const rawKindByUser = await rawBookedMinutesByKind(memberIds, dates, members);

  const today = { date: todayISOBangkok(), nowMin: nowMinutesBangkok() };
  const workloadByUser = new Map<string, MemberWorkloadWithKind>();
  for (const m of members) {
    const base = computeMemberWorkload(
      {
        userId: m.userId,
        dayStart: m.dayStart,
        dayEnd: m.dayEnd,
        freeMinutes: totalFreeMinutes(slotsByUser.get(m.userId) ?? []),
        pendingMinutes: pendingByUser.get(m.userId) ?? 0,
      },
      dates,
      today,
    );
    workloadByUser.set(m.userId, { ...base, ...scaleToBookedMinutes(rawKindByUser.get(m.userId), base.bookedMinutes) });
  }

  return { slotsByUser, workloadByUser };
}
