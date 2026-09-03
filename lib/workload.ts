/**
 * lib/workload.ts
 * --------------------------------------------------------------
 * Workload Score - ตัวเลขบอกว่า "ตอนนี้ใครแน่นแค่ไหน" ใช้ตอนกระจายงานกลุ่ม
 *
 * สูตรตามที่กำหนดไว้ในสเปกของโปรเจกต์:
 *     Workload Score = ชั่วโมงงานที่มีอยู่แล้ว / ชั่วโมงว่างทั้งหมดในช่วงเวลานั้น
 *     คะแนนยิ่งต่ำ = ยิ่งมีพื้นที่ว่างเหลือ -> ควรได้รับงานใหม่ก่อน
 *
 * ทำไมต้องใช้ "สัดส่วน" ไม่ใช่ "เวลาว่างรวม" เฉยๆ:
 *   คนที่ว่าง 10 ชม. แต่มีงานค้างอยู่แล้ว 20 ชม. ไม่ได้ว่างจริงเท่าคนที่ว่าง 8 ชม.
 *   แล้วมีงานค้าง 2 ชม. - การดูแค่เวลาว่างรวมจะยัดงานให้คนแรกทั้งที่แน่นกว่า
 *
 * "ชั่วโมงงานที่มีอยู่แล้ว" นับจาก 3 แหล่ง (ตามสเปก "ปฏิทิน/to-do ของแต่ละคน"):
 *   1. เวลาที่ถูกจองในปฏิทินภายในกรอบเวลาที่สะดวก (Event + Loop ชีวิต)
 *      = กรอบเวลาทั้งหมด - เวลาว่างที่เหลือ
 *   2. งานใน To-do ที่ยังไม่เสร็จและยังไม่ได้ลงปฏิทิน (ยังไม่กินช่องเวลา แต่เป็นภาระจริง)
 *   3. งานกลุ่มอื่นที่ถูกมอบหมายไว้แล้วแต่ยังไม่ยืนยัน (ยังไม่กลายเป็น event)
 *
 * เป็นการคำนวณ local ล้วน ไม่เรียก AI - ตัวเลขนี้ถูกส่งให้ Gemini ใช้ประกอบการเลือกคน
 * และใช้จัดลำดับผู้สมัครฝั่งโค้ดด้วย
 * --------------------------------------------------------------
 */
import { availabilityWindow, type FreeSlot } from './freeTime';

/** ถือว่าคนที่ไม่เหลือเวลาว่างเลย = แน่นสุด (กันหารด้วยศูนย์) */
const NO_FREE_TIME_SCORE = Number.POSITIVE_INFINITY;

/**
 * ยอมทำตามที่ AI เลือกได้ ถ้าคนนั้นภาระงานไม่ได้สูงกว่าคนที่ว่างสุดเกินค่านี้
 * (0.5 = มีงานค้างมากกว่าอีกครึ่งหนึ่งของเวลาว่างที่ตัวเองเหลือ)
 * เกินกว่านี้ถือว่ากองงานที่คนเดียวเกินไป -> กลับไปใช้ลำดับตามภาระงานแทน
 */
export const FAIRNESS_TOLERANCE = 0.5;

export interface MemberLoadInput {
  userId: string;
  /** กรอบเวลาที่สะดวกของคนนี้ (จากโปรไฟล์) */
  dayStart?: string | null;
  dayEnd?: string | null;
  /** เวลาว่างที่เหลือจริง (นาที) จาก computeFreeSlots */
  freeMinutes: number;
  /** งานค้างที่ยังไม่กินช่องเวลาในปฏิทิน เช่น To-do ที่ยังไม่ได้จัดลง + งานกลุ่มที่รอยืนยัน */
  pendingMinutes: number;
}

export interface MemberWorkload {
  userId: string;
  /** เวลาที่ถูกจองในปฏิทินแล้ว (นาที) ภายในกรอบเวลาที่สะดวก */
  bookedMinutes: number;
  /** งานค้างที่ยังไม่ได้ลงปฏิทิน (นาที) */
  pendingMinutes: number;
  /** งานที่มีอยู่แล้วทั้งหมด = booked + pending */
  committedMinutes: number;
  freeMinutes: number;
  /** committed / free — ยิ่งต่ำยิ่งว่าง (Infinity = ไม่เหลือเวลาว่างเลย) */
  score: number;
}

/** กรอบเวลาที่ใช้ได้ทั้งหมดของคนหนึ่งในช่วงวันที่กำหนด (นาที) */
export function windowMinutes(
  dates: string[],
  dayStart?: string | null,
  dayEnd?: string | null,
  /** ตัดเวลาที่ผ่านมาแล้วของวันนี้ออก (นาทีจากเที่ยงคืน) - ให้ตรงกับที่ computeFreeSlots ทำ */
  today?: { date: string; nowMin: number },
): number {
  const { startMin, endMin } = availabilityWindow(dayStart, dayEnd);
  if (endMin <= startMin) return 0;

  let total = 0;
  for (const date of dates) {
    const from = today && date === today.date ? Math.max(startMin, today.nowMin) : startMin;
    total += Math.max(0, endMin - from);
  }
  return total;
}

export function workloadScore(committedMinutes: number, freeMinutes: number): number {
  if (freeMinutes <= 0) return committedMinutes > 0 ? NO_FREE_TIME_SCORE : 0;
  return committedMinutes / freeMinutes;
}

/** คำนวณภาระงานของสมาชิกหนึ่งคนในช่วงวันที่กำหนด */
export function computeMemberWorkload(
  member: MemberLoadInput,
  dates: string[],
  today?: { date: string; nowMin: number },
): MemberWorkload {
  const total = windowMinutes(dates, member.dayStart, member.dayEnd, today);
  // เวลาที่ถูกจองในปฏิทิน = กรอบเวลาทั้งหมด - ที่ยังว่างอยู่
  const bookedMinutes = Math.max(0, total - member.freeMinutes);
  const committedMinutes = bookedMinutes + member.pendingMinutes;
  return {
    userId: member.userId,
    bookedMinutes,
    pendingMinutes: member.pendingMinutes,
    committedMinutes,
    freeMinutes: member.freeMinutes,
    score: workloadScore(committedMinutes, member.freeMinutes),
  };
}

export interface DailyLoadPoint {
  date: string; // "YYYY-MM-DD"
  /** ภาระงานเฉลี่ยของสมาชิกในวันนี้ (0-100) */
  avgPct: number;
}

export interface DailyLoadMember {
  userId: string;
  dayStart?: string | null;
  dayEnd?: string | null;
}

/**
 * แนวโน้มภาระงานเฉลี่ยของกลุ่มรายวัน - ใช้วาดกราฟเส้น (แยกจากกราฟแท่งรายคนใน WorkloadPanel)
 * ดูว่าวันไหนในสัปดาห์ที่กลุ่มนี้มักจะแน่นที่สุดโดยเฉลี่ย
 *
 * นับเฉพาะเวลาที่ถูกจองในปฏิทินแล้ว (ไม่รวมงานค้างที่ยังไม่ได้ลงปฏิทิน) เพราะงานค้างไม่มี
 * "วันที่" ที่แน่นอนให้จัดเข้าวันไหนวันหนึ่งได้อย่างสมเหตุสมผล ต่างจาก committedMinutes ใน
 * MemberWorkload ที่รวมงานค้างเข้าไปด้วย (ใช้ตอนจัดลำดับว่าใครควรได้งานใหม่ก่อน ไม่ใช่ตอนดูรายวัน)
 */
export function computeDailyAverageLoad(
  slotsByUser: Map<string, FreeSlot[]>,
  members: DailyLoadMember[],
  dates: string[],
  today?: { date: string; nowMin: number },
): DailyLoadPoint[] {
  if (members.length === 0) return dates.map((date) => ({ date, avgPct: 0 }));

  return dates.map((date) => {
    const pcts = members.map((m) => {
      const capacity = windowMinutes([date], m.dayStart, m.dayEnd, today);
      if (capacity <= 0) return 100;
      const free = (slotsByUser.get(m.userId) ?? [])
        .filter((s) => s.date === date)
        .reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
      const committed = Math.max(0, capacity - free);
      return (committed / capacity) * 100;
    });
    const avgPct = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    return { date, avgPct: Math.round(avgPct) };
  });
}

export interface DailyRequiredPoint {
  date: string; // "YYYY-MM-DD"
  /** เวลาที่ถูกจองแล้วในวันนี้ (นาที) */
  requiredMin: number;
  /** กรอบเวลาที่ใช้ได้ทั้งหมดของวันนี้ (นาที) - วันนี้จะถูกตัดให้เหลือ "เวลาที่เหลือจากตอนนี้" เหมือนที่อื่นในแอป */
  capacityMin: number;
  /** requiredMin/capacityMin เป็น % (capacityMin<=0 ถือว่าเต็ม 100%) */
  pct: number;
}

/**
 * ภาระงานรายวันของคนคนเดียว (required vs capacity) - ใช้วาดกราฟ Workload Distribution
 * ในแดชบอร์ดส่วนตัว (คนละอันกับ computeDailyAverageLoad ที่เฉลี่ยข้ามสมาชิกทั้งกลุ่ม)
 *
 * นับเฉพาะเวลาที่ถูกจองในปฏิทินแล้ว (เหมือน computeDailyAverageLoad) - งานค้างที่ยังไม่ได้
 * ลงปฏิทินไม่มี "วันที่" ที่แน่นอนให้จัดเข้าวันไหนวันหนึ่งของกราฟนี้ได้อย่างสมเหตุสมผล
 */
export function computeDailyRequiredLoad(
  slots: FreeSlot[],
  dates: string[],
  dayStart?: string | null,
  dayEnd?: string | null,
  today?: { date: string; nowMin: number },
): DailyRequiredPoint[] {
  return dates.map((date) => {
    const capacityMin = windowMinutes([date], dayStart, dayEnd, today);
    if (capacityMin <= 0) return { date, requiredMin: 0, capacityMin: 0, pct: 100 };
    const freeMin = slots.filter((s) => s.date === date).reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
    const requiredMin = Math.max(0, capacityMin - freeMin);
    return { date, requiredMin, capacityMin, pct: Math.round((requiredMin / capacityMin) * 100) };
  });
}

/**
 * จัดลำดับผู้สมัครสำหรับงานหนึ่งชิ้น: ภาระงานน้อยสุดก่อน
 *
 * ถ้า Gemini เลือกคนไว้ (จับคู่จากนิสัย/ความถนัด) จะดันคนนั้นขึ้นมาก่อน
 * แต่เฉพาะเมื่อภาระงานยังไม่เกินคนที่ว่างสุดเกิน FAIRNESS_TOLERANCE
 * เพื่อไม่ให้คำแนะนำของ AI ทำให้งานกองอยู่ที่คนเดียว
 */
export function rankCandidates(workloads: MemberWorkload[], preferredUserId?: string): string[] {
  const byScore = [...workloads].sort((a, b) => a.score - b.score);
  if (!preferredUserId) return byScore.map((w) => w.userId);

  const preferred = byScore.find((w) => w.userId === preferredUserId);
  if (!preferred) return byScore.map((w) => w.userId);

  const lightest = byScore[0];
  const withinFairness = preferred.score <= lightest.score + FAIRNESS_TOLERANCE;
  if (!withinFairness) return byScore.map((w) => w.userId);

  return [preferredUserId, ...byScore.filter((w) => w.userId !== preferredUserId).map((w) => w.userId)];
}
