/**
 * lib/slotAdvice.ts
 * --------------------------------------------------------------
 * "วันนั้นแน่นไปแล้วนะ ลองเวลานี้ไหม" — ใช้ตอนผู้ใช้สั่งเพิ่มกิจกรรมผ่านแชท
 * โดยระบุวัน-เวลาเจาะจงมา แต่วันนั้นชนของเดิมหรือแน่นเกินไป
 *
 * เป็นการคำนวณ local ล้วน ไม่เรียก Gemini ตามหลักไฮบริดของโปรเจกต์:
 * เรื่อง "ว่างจริงไหม / ชนไหม" ต้องแม่นยำ ปล่อยให้ AI เดาไม่ได้
 * และใช้ computeFreeSlots ตัวเดียวกับที่จัดงาน To-do กับคิด Workload Score
 * เพื่อให้เวลาที่เสนอในแชทตรงกับที่ระบบคำนวณไว้ที่อื่น
 * --------------------------------------------------------------
 */
import { computeFreeSlots, availabilityWindow, type FreeSlot } from './freeTime';
import { minutesToTime, timeToMinutes } from './calendarLayout';
import { nowMinutesBangkok, todayISOBangkok } from './thaiTime';

/** ถ้าไม่ได้ระบุเวลาจบ ให้ถือว่ากิจกรรมยาว 1 ชม. */
export const DEFAULT_EVENT_MINUTES = 60;
/** เสนอทางเลือกอย่างมากกี่ช่อง */
const MAX_SUGGESTIONS = 3;
/** มองหาที่ว่างล่วงหน้ากี่วัน ถ้าวันที่ขอมาไม่เหลือช่องเลย */
const LOOKAHEAD_DAYS = 3;

export type DensityLevel = 'ว่าง' | 'ปกติ' | 'ค่อนข้างแน่น' | 'แน่นมาก';

export interface BusyItem {
  date: string; // YYYY-MM-DD
  title: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface SlotSuggestion {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  /** ข้อความพร้อมแสดง เช่น "วันนี้ 15:00-16:00" */
  label: string;
  /** เป็นเวลาในวันเดียวกับที่ผู้ใช้ขอหรือไม่ */
  sameDay: boolean;
}

export interface SlotAdvice {
  level: DensityLevel;
  /** ชื่อกิจกรรมที่ชนกับเวลาที่ผู้ใช้ขอ (ถ้ามี) */
  conflictWith?: string;
  message: string;
  suggestions: SlotSuggestion[];
}

/** ระดับความแน่นของวัน จากเวลาที่ถูกจองเทียบกับกรอบเวลาที่สะดวก */
export function densityOf(busyMinutes: number, windowMinutes: number): DensityLevel {
  if (windowMinutes <= 0) return 'แน่นมาก';
  const ratio = busyMinutes / windowMinutes;
  if (ratio >= 0.75) return 'แน่นมาก';
  if (ratio >= 0.5) return 'ค่อนข้างแน่น';
  if (ratio >= 0.25) return 'ปกติ';
  return 'ว่าง';
}

function busyMinutesOf(items: BusyItem[], date: string, winStart: number, winEnd: number): number {
  const ranges: Array<[number, number]> = [];
  for (const it of items) {
    if (it.date !== date) continue;
    const s = timeToMinutes(it.startTime);
    if (s === null) return winEnd - winStart; // กิจกรรมทั้งวัน = เต็มกรอบ
    const e = timeToMinutes(it.endTime) ?? s + DEFAULT_EVENT_MINUTES;
    ranges.push([Math.max(s, winStart), Math.min(Math.max(e, s + 15), winEnd)]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cursor = -1;
  for (const [s, e] of ranges) {
    if (e <= s) continue;
    const from = Math.max(s, cursor);
    if (e > from) {
      total += e - from;
      cursor = e;
    }
  }
  return total;
}

/** วันที่แบบอ่านง่าย: วันนี้ / พรุ่งนี้ / "ศ. 30 ส.ค." */
function dayLabel(date: string, todayISO: string): string {
  if (date === todayISO) return 'วันนี้';
  const tomorrow = new Date(new Date(`${todayISO}T00:00:00.000Z`).getTime() + 86400000).toISOString().slice(0, 10);
  if (date === tomorrow) return 'พรุ่งนี้';
  return new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * ดูว่าเวลาที่ผู้ใช้ขอมาโอเคไหม ถ้าไม่โอเคก็เสนอช่องเวลาอื่นให้เลือก
 *
 * @returns null = เวลาที่ขอมาใช้ได้เลย ไม่ต้องเสนออะไร
 */
export function buildSlotAdvice(input: {
  date: string; // วันที่ผู้ใช้ขอ (YYYY-MM-DD)
  startTime?: string | null; // เวลาที่ผู้ใช้ขอ (ไม่ระบุ = แค่ดูว่าวันนั้นแน่นไหม)
  durationMin?: number;
  /** กิจกรรม + Loop ประจำ ในช่วงวันที่มองหา (กางเป็นวันจริงแล้ว) */
  busy: BusyItem[];
  dayStart?: string | null;
  dayEnd?: string | null;
}): SlotAdvice | null {
  const duration = input.durationMin ?? DEFAULT_EVENT_MINUTES;
  const { startMin: winStart, endMin: winEnd } = availabilityWindow(input.dayStart, input.dayEnd);
  const todayISO = todayISOBangkok();

  const requestedStart = timeToMinutes(input.startTime);
  const requestedEnd = requestedStart === null ? null : requestedStart + duration;

  // ---- ชนกับอะไรหรือเปล่า ----
  let conflictWith: string | undefined;
  if (requestedStart !== null && requestedEnd !== null) {
    for (const it of input.busy) {
      if (it.date !== input.date) continue;
      const s = timeToMinutes(it.startTime);
      if (s === null) {
        conflictWith = it.title; // กิจกรรมทั้งวัน
        break;
      }
      const e = timeToMinutes(it.endTime) ?? s + DEFAULT_EVENT_MINUTES;
      if (requestedStart < e && requestedEnd > s) {
        conflictWith = it.title;
        break;
      }
    }
  }

  const busyMin = busyMinutesOf(input.busy, input.date, winStart, winEnd);
  const level = densityOf(busyMin, winEnd - winStart);

  // วันโล่งและไม่ชนใคร = ไม่ต้องเสนออะไร ปล่อยให้ผู้ใช้ลงตามที่ขอ
  const crowded = level === 'ค่อนข้างแน่น' || level === 'แน่นมาก';
  if (!conflictWith && !crowded) return null;

  // ---- หาช่องว่างมาเสนอ ----
  const dates = [input.date];
  const base = new Date(`${input.date}T00:00:00.000Z`).getTime();
  for (let i = 1; i <= LOOKAHEAD_DAYS; i++) dates.push(new Date(base + i * 86400000).toISOString().slice(0, 10));

  const nowMin = nowMinutesBangkok();
  const slots: FreeSlot[] = computeFreeSlots(
    input.busy.filter((b) => dates.includes(b.date)),
    dates,
    input.dayStart,
    input.dayEnd,
  )
    // ไม่เสนอเวลาที่ผ่านมาแล้วของวันนี้
    .map((s) => (s.date === todayISO && s.startMin < nowMin ? { ...s, startMin: nowMin } : s))
    .filter((s) => s.endMin - s.startMin >= duration);

  // เรียง: วันที่ขอมาก่อน แล้วช่องที่เริ่มใกล้เวลาที่ขอที่สุด
  const target = requestedStart ?? winStart;
  const ranked = slots
    .map((s) => ({
      slot: s,
      sameDay: s.date === input.date,
      // ถ้าช่องเริ่มก่อนเวลาที่ขอ แต่ยาวพอ ให้ขยับไปเริ่มใกล้เวลาที่ขอที่สุด
      startMin: Math.min(Math.max(target, s.startMin), s.endMin - duration),
    }))
    .sort((a, b) => {
      if (a.sameDay !== b.sameDay) return a.sameDay ? -1 : 1;
      if (a.slot.date !== b.slot.date) return a.slot.date < b.slot.date ? -1 : 1;
      return Math.abs(a.startMin - target) - Math.abs(b.startMin - target);
    });

  const suggestions: SlotSuggestion[] = [];
  for (const r of ranked) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    // ไม่เสนอเวลาเดิมซ้ำกับที่ผู้ใช้ขอมา
    if (r.sameDay && requestedStart !== null && r.startMin === requestedStart) continue;
    // เลี่ยงเสนอเวลาซ้ำๆ ในวันเดียวกันติดกันเกินไป
    if (suggestions.some((s) => s.date === r.slot.date && Math.abs(timeToMinutes(s.startTime)! - r.startMin) < 60)) continue;
    suggestions.push({
      date: r.slot.date,
      startTime: minutesToTime(r.startMin),
      endTime: minutesToTime(r.startMin + duration),
      label: `${dayLabel(r.slot.date, todayISO)} ${minutesToTime(r.startMin)}-${minutesToTime(r.startMin + duration)}`,
      sameDay: r.sameDay,
    });
  }

  if (suggestions.length === 0 && !conflictWith) return null;

  const hours = Math.round((busyMin / 60) * 10) / 10;
  const message = conflictWith
    ? `เวลานั้นชนกับ "${conflictWith}" อยู่นะ`
    : `${dayLabel(input.date, todayISO)}${level === 'แน่นมาก' ? 'แน่นมาก' : 'ค่อนข้างแน่น'}แล้ว (มีงานอยู่ ~${hours} ชม.)`;

  return { level, conflictWith, message, suggestions };
}
