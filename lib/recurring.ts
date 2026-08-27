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
        title: re.title,
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
