/**
 * lib/categoryTimeDistribution.ts
 * --------------------------------------------------------------
 * "เวลาของฉันหมดไปกับหมวดหมู่ไหนบ้าง" - รวมเวลาที่ลงปฏิทินแล้วใน 7 วัน "ที่ผ่านมา" (ย้อนหลัง)
 * แยกตามหมวดหมู่จริง ตั้งใจมองย้อนหลัง ต่างจากกราฟภาระงาน (lib/burnoutRisk.ts) ที่มองไปข้างหน้า
 * 7 วัน - คนละคำถามกัน: อันนี้ตอบว่า "เวลาที่ผ่านมาไปไหนบ้าง" อันนั้นตอบว่า "จะโอเวอร์โหลดไหม"
 *
 * นับเฉพาะ Event ตรงๆ (ไม่รวม Loop ชีวิต/RecurringEvent) ตามขอบเขตที่ขอมา
 *
 * เก็บ `color` เป็นค่า PastelColor ดิบ (ไม่ resolve เป็น class string ตรงนี้) เพราะฝั่งแสดงผล
 * ต้องใช้ทั้งสี background (จุดใน legend) และสี stroke (เสี้ยวโดนัท) จากค่าเดียวกัน - ให้
 * คอมโพเนนต์เรียก getColorOption() เอาตอนต้องใช้จริงแทน
 * --------------------------------------------------------------
 */
import { prisma } from './prisma';
import { todayISOBangkok } from './thaiTime';
import { timeToMinutes } from './calendarLayout';
import { DEFAULT_DURATION } from './freeTime';
import type { PastelColor } from './types';

export interface CategorySlice {
  id: string; // categoryId จริง หรือ 'other'
  label: string;
  color: PastelColor | 'other';
  minutes: number;
}

const MAX_SLICES = 6;
const OTHER_LABEL = 'อื่นๆ';
const LOOKBACK_DAYS = 7;

/** เก็บแค่หมวดที่ใช้เวลามากสุด N อันดับแรก ที่เหลือรวมเป็น "อื่นๆ" กันเสี้ยวโดนัทเล็กจนอ่านไม่ออก */
export function bucketTopN(entries: CategorySlice[], topN = MAX_SLICES): CategorySlice[] {
  const sorted = [...entries].sort((a, b) => b.minutes - a.minutes);
  const top = sorted.slice(0, topN);
  const restMinutes = sorted.slice(topN).reduce((sum, e) => sum + e.minutes, 0);
  const slices: CategorySlice[] = [...top];
  if (restMinutes > 0) slices.push({ id: 'other', label: OTHER_LABEL, color: 'other', minutes: restMinutes });
  return slices;
}

/** ดึง Event ของผู้ใช้ใน 7 วันที่ผ่านมา (รวมวันนี้) มารวมเวลาต่อหมวดหมู่จริง */
export async function getCategoryTimeDistribution(userId: string): Promise<CategorySlice[]> {
  const todayEnd = new Date(`${todayISOBangkok()}T00:00:00.000Z`);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1); // สิ้นสุดที่เที่ยงคืนถัดไป = รวม "วันนี้" เต็มวัน
  const start = new Date(todayEnd.getTime() - LOOKBACK_DAYS * 86400000);

  const events = await prisma.event.findMany({
    where: { userId, date: { gte: start, lt: todayEnd }, isDeadline: false },
    select: { startTime: true, endTime: true, category: { select: { id: true, name: true, color: true } } },
  });

  const byCategory = new Map<string, CategorySlice>();
  for (const ev of events) {
    const s = timeToMinutes(ev.startTime);
    if (s === null) continue; // ไม่มีเวลาเริ่ม ไม่ใช่ช่วงเวลาทำงานจริง
    let e = timeToMinutes(ev.endTime) ?? s + DEFAULT_DURATION;
    if (e <= s) e = s + DEFAULT_DURATION;

    const cur = byCategory.get(ev.category.id) ?? {
      id: ev.category.id,
      label: ev.category.name,
      color: ev.category.color as PastelColor,
      minutes: 0,
    };
    cur.minutes += e - s;
    byCategory.set(ev.category.id, cur);
  }

  return bucketTopN([...byCategory.values()]);
}
