/**
 * lib/burnoutRisk.ts
 * --------------------------------------------------------------
 * "ภาระงาน & ความเสี่ยงหมดไฟ" ของผู้ใช้คนเดียว - ใช้ในวิดเจ็ตแดชบอร์ดส่วนตัว
 *
 * แนวคิดยืมมาจากทฤษฎีการวางแผนกำลังการผลิต (Capacity Planning): เทียบ "ภาระงานที่ต้องทำ"
 * (required) กับ "กำลังการผลิตที่มี" (capacity) ในแต่ละช่วงเวลา ถ้า required > capacity ต่อเนื่อง
 * หลายวัน = สัญญาณโอเวอร์โหลด
 *
 * แยกไฟล์จาก lib/workload.ts เหมือนที่ lib/groupWorkload.ts แยกจาก lib/workload.ts:
 *   - lib/workload.ts       = คำนวณนาทีล้วนๆ (pure, ไม่แตะ DB, ไม่รู้จัก Task)
 *   - ไฟล์นี้                = ดึงข้อมูลจริงจาก DB (งานค้าง/กำหนดส่ง) + ให้คะแนนความเสี่ยง
 * --------------------------------------------------------------
 */
import { prisma } from './prisma';
import { freeSlotsForUsers, buildDateWindow, nowMinutesBangkok, todayISOBangkok } from './schedule';
import { computeDailyRequiredLoad, type DailyRequiredPoint } from './workload';

const WINDOW_DAYS = 7;
/** นับว่า "ใกล้ครบกำหนด" ถ้าเหลือไม่เกินกี่วัน (รวมวันที่เลยกำหนดไปแล้วด้วย) */
const URGENT_WINDOW_DAYS = 3;

export interface BurnoutSignals {
  /** ค่าเฉลี่ย % เวลาที่ถูกจองแล้วต่อวัน ใน 7 วันข้างหน้า */
  avgUtilizationPct: number;
  /** จำนวนวันที่เวลาที่จองไว้เกินกำลังที่มีจริง (required > capacity) */
  overloadDays: number;
  /** งานที่ยังไม่เสร็จและเลยกำหนดส่งไปแล้ว */
  overdueCount: number;
  /** งานสำคัญ (priority: high) ที่ยังไม่เสร็จและใกล้ครบกำหนด (รวมที่เลยกำหนดแล้ว) */
  urgentPileupCount: number;
}

export type BurnoutBandKey = 'low' | 'medium' | 'high';

export interface BurnoutRisk extends BurnoutSignals {
  score: number; // 0-100
  band: BurnoutBandKey;
}

/**
 * ระดับความเสี่ยงหมดไฟ - ใช้สีเดียวกับ WorkloadPanel ของหน้ากลุ่ม (เขียว/ส้ม/แดง) เพื่อความสอดคล้องกันทั้งแอป
 * bar = สีเติมของมิเตอร์, track = รางพื้นหลัง (สีเดียวกับ bar แต่จางลง - ตาม mark spec ของมิเตอร์)
 */
export const BURNOUT_BANDS: { key: BurnoutBandKey; max: number; label: string; bar: string; track: string }[] = [
  { key: 'low', max: 40, label: 'เบา', bar: 'bg-load-free', track: 'bg-load-free/20' },
  { key: 'medium', max: 70, label: 'ปานกลาง', bar: 'bg-load-tight', track: 'bg-load-tight/20' },
  { key: 'high', max: Infinity, label: 'หนัก', bar: 'bg-load-full', track: 'bg-load-full/20' },
];

function bandOf(score: number): BurnoutBandKey {
  return (BURNOUT_BANDS.find((b) => score < b.max) ?? BURNOUT_BANDS[BURNOUT_BANDS.length - 1]).key;
}

/**
 * รวมสัญญาณทั้ง 4 เป็นคะแนนเดียว (0-100) แต่ละแกนถูก cap ไว้ที่ค่าหนึ่งก่อนคูณน้ำหนัก
 * กันไม่ให้ค่าสุดโต่งแกนเดียวลากคะแนนรวมเพี้ยนไปทั้งหมด
 *
 * น้ำหนัก: utilization 45% (สัญญาณตรงที่สุดตามทฤษฎี capacity planning) +
 *          overloadDays 20% (โหลดหนักต่อเนื่องกี่วัน ไม่ใช่แค่วันเดียว) +
 *          overdueCount 20% (สัญญาณที่ตามหลัง - ตกค้างไปแล้วจริง) +
 *          urgentPileupCount 15% (สัญญาณล่วงหน้า - กำลังจะกองพะเนิน)
 */
export function computeBurnoutRisk(signals: BurnoutSignals): BurnoutRisk {
  const utilTerm = (Math.min(signals.avgUtilizationPct, 150) / 150) * 100;
  const overloadTerm = (Math.min(signals.overloadDays, WINDOW_DAYS) / WINDOW_DAYS) * 100;
  const overdueTerm = (Math.min(signals.overdueCount, 5) / 5) * 100;
  const urgentTerm = (Math.min(signals.urgentPileupCount, 5) / 5) * 100;

  const score = Math.round(0.45 * utilTerm + 0.2 * overloadTerm + 0.2 * overdueTerm + 0.15 * urgentTerm);
  return { ...signals, score, band: bandOf(score) };
}

/** ดึงข้อมูลจริงจาก DB มาคำนวณภาระงาน + ความเสี่ยงหมดไฟของผู้ใช้คนหนึ่ง ใน 7 วันข้างหน้า */
export async function getWorkloadSignals(userId: string): Promise<{ daily: DailyRequiredPoint[]; risk: BurnoutRisk }> {
  const dates = buildDateWindow(WINDOW_DAYS);
  const today = { date: todayISOBangkok(), nowMin: nowMinutesBangkok() };
  const urgentCutoff = dates[Math.min(URGENT_WINDOW_DAYS, dates.length - 1)];

  const [user, undoneTasks, slotsByUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { dayStart: true, dayEnd: true } }),
    // เฉพาะงานที่มีกำหนดส่ง - งานไม่มีกำหนดส่งไม่มีทาง "เลยกำหนด"/"ใกล้ครบกำหนด" ได้อยู่แล้ว
    prisma.task.findMany({
      where: { userId, done: false, dueDate: { not: null } },
      select: { priority: true, dueDate: true },
    }),
    freeSlotsForUsers([userId], dates),
  ]);

  const daily = computeDailyRequiredLoad(slotsByUser.get(userId) ?? [], dates, user?.dayStart, user?.dayEnd, today);

  let overdueCount = 0;
  let urgentPileupCount = 0;
  for (const t of undoneTasks) {
    const due = t.dueDate!.toISOString().slice(0, 10);
    if (due < today.date) overdueCount++;
    if (due <= urgentCutoff && t.priority === 'high') urgentPileupCount++;
  }

  const avgUtilizationPct = daily.length > 0 ? daily.reduce((sum, d) => sum + d.pct, 0) / daily.length : 0;
  const overloadDays = daily.filter((d) => d.requiredMin > d.capacityMin).length;

  const risk = computeBurnoutRisk({ avgUtilizationPct, overloadDays, overdueCount, urgentPileupCount });
  return { daily, risk };
}
