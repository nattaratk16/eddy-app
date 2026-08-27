// ตัวช่วยสำหรับ Loop ชีวิต (recurring events)
import type { CalendarEvent, RecurringEventInfo } from './types';

export const WEEKDAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const WEEKDAY_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

/** แปลง "1,2,3" -> [1,2,3] (เฉพาะ 0-6) */
export function parseDays(str: string): number[] {
  return [...new Set(str.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort(
    (a, b) => a - b,
  );
}

/** แปลง [1,2,3] -> "1,2,3" */
export function serializeDays(days: number[]): string {
  return [...new Set(days.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort((a, b) => a - b).join(',');
}

/**
 * ขยาย Loop เป็นกิจกรรมจริงในแต่ละวันที่ระบุ (dates = ["YYYY-MM-DD", ...])
 * ใส่ id แบบ "recur:<id>:<date>" และ source='recurring' เพื่อให้ปฏิทินรู้ว่าเป็น loop (อ่านอย่างเดียว)
 */
export function expandRecurring(recurring: RecurringEventInfo[], dates: string[]): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const date of dates) {
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=อาทิตย์ .. 6=เสาร์
    for (const re of recurring) {
      if (!re.days.includes(dow)) continue;
      if (re.endDate && date > re.endDate) continue; // เลยวันสิ้นสุดแล้ว (เทียบ string YYYY-MM-DD ได้)
      out.push({
        id: `recur:${re.id}:${date}`,
        // มีรหัสวิชาก็เอามาไว้หน้าชื่อ จะได้รู้ว่าคาบไหนคือวิชาอะไรตั้งแต่มองปฏิทิน
        title: re.courseCode ? `${re.courseCode} ${re.title}` : re.title,
        date,
        startTime: re.startTime,
        endTime: re.endTime,
        categoryId: re.categoryId || '__loop__',
        source: 'recurring',
      });
    }
  }
  return out;
}

/** Loop หมดอายุแล้วหรือยัง (เลยวันที่ใช้ถึง) */
function isExpired(endDate: string | null | undefined, todayISO: string): boolean {
  return !!endDate && endDate < todayISO;
}

export interface LoopTimeSlot {
  days: number[];
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  endDate?: string | null; // YYYY-MM-DD
}

/**
 * Loop สองอันชนกันไหม = มีวันในสัปดาห์ซ้ำกัน + ช่วงเวลาคาบเกี่ยวกัน + ยังไม่หมดอายุทั้งคู่
 *
 * ต้องเช็คตอนสร้าง/แก้ไข เพราะ Loop คือ "เวลาไม่ว่างประจำ" ที่ระบบเอาไปคิดเวลาว่าง
 * ถ้าปล่อยให้ลงทับกันได้ เวลาว่างที่คำนวณออกมาจะน้อยกว่าความจริงและ Workload Score จะเพี้ยนตาม
 */
export function loopsOverlap(a: LoopTimeSlot, b: LoopTimeSlot, todayISO: string): boolean {
  if (isExpired(a.endDate, todayISO) || isExpired(b.endDate, todayISO)) return false;
  if (!a.days.some((d) => b.days.includes(d))) return false;
  // เทียบ "HH:mm" เป็น string ได้ตรงๆ เพราะรูปแบบตายตัว
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/** หา Loop ตัวแรกในรายการที่ชนกับ candidate (null = ไม่ชนใคร) */
export function findLoopConflict<T extends LoopTimeSlot & { id: string; title: string }>(
  candidate: LoopTimeSlot,
  existing: T[],
  todayISO: string,
  ignoreId?: string,
): T | null {
  return existing.find((it) => it.id !== ignoreId && loopsOverlap(candidate, it, todayISO)) ?? null;
}

/** ข้อความบอกว่าไปชนกับ Loop ไหน วันไหน เวลาเท่าไร */
export function describeLoopConflict(c: { title: string; days: number[]; startTime: string; endTime: string }): string {
  const dayText = c.days.map((d) => WEEKDAY_SHORT[d]).join(',');
  return `เวลานี้ชนกับ "${c.title}" (${dayText} ${c.startTime}-${c.endTime}) ลองเลี่ยงเวลา หรือแก้อันเดิมก่อน`;
}

/** วันที่วันนี้ตามเวลาไทย - ใช้ตัดสินว่า Loop ไหนหมดอายุแล้ว */
export function todayISOForLoops(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}
