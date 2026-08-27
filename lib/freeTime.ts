// คำนวณช่วงเวลาว่างของสมาชิก + วางงานลงในช่วงว่าง (ใช้ในเฟส 3c กระจายงานกลุ่ม)
// เป็นการคำนวณ local ล้วน (ไม่พึ่ง AI) เพื่อการันตีว่าเวลาที่วางจะไม่ชนกันและอยู่ในกรอบที่สะดวก
import { timeToMinutes } from './calendarLayout';

const DEFAULT_START = 8 * 60; // 08:00
const DEFAULT_END = 22 * 60; // 22:00
const DEFAULT_DURATION = 60;

export interface FreeSlot {
  date: string; // "YYYY-MM-DD"
  startMin: number;
  endMin: number;
}

interface MemberEvent {
  date: string; // "YYYY-MM-DD"
  startTime?: string | null;
  endTime?: string | null;
}

/**
 * กรอบเวลาที่สะดวกของคนคนหนึ่งในหนึ่งวัน (นาทีจากเที่ยงคืน)
 * ไม่ได้ตั้งค่าไว้ = 08:00-22:00 ตามค่าเริ่มต้น
 * แยกออกมาเพราะทั้งการหาช่วงว่างและการคิด Workload Score ต้องใช้กรอบเดียวกัน
 */
export function availabilityWindow(
  availStart?: string | null,
  availEnd?: string | null,
): { startMin: number; endMin: number } {
  return {
    startMin: timeToMinutes(availStart) ?? DEFAULT_START,
    endMin: timeToMinutes(availEnd) ?? DEFAULT_END,
  };
}

/** ช่วงว่างของสมาชิกคนหนึ่งในแต่ละวัน (ภายในกรอบเวลาที่สะดวก availStart..availEnd) */
export function computeFreeSlots(
  events: MemberEvent[],
  dates: string[],
  availStart?: string | null,
  availEnd?: string | null,
): FreeSlot[] {
  const { startMin: winStart, endMin: winEnd } = availabilityWindow(availStart, availEnd);
  if (winEnd <= winStart) return [];

  // จัดกลุ่มช่วง "ไม่ว่าง" ตามวัน
  const busyByDate = new Map<string, Array<[number, number]>>();
  for (const ev of events) {
    const s = timeToMinutes(ev.startTime);
    if (s === null) {
      // กิจกรรมทั้งวัน = ไม่ว่างทั้งกรอบ
      busyByDate.set(ev.date, [[winStart, winEnd]]);
      continue;
    }
    let e = timeToMinutes(ev.endTime) ?? s + DEFAULT_DURATION;
    if (e <= s) e = s + DEFAULT_DURATION;
    const clamped: [number, number] = [Math.max(s, winStart), Math.min(e, winEnd)];
    const arr = busyByDate.get(ev.date) ?? [];
    arr.push(clamped);
    busyByDate.set(ev.date, arr);
  }

  const free: FreeSlot[] = [];
  for (const date of dates) {
    const busy = (busyByDate.get(date) ?? []).filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
    // รวมช่วงที่ทับกัน
    const merged: Array<[number, number]> = [];
    for (const b of busy) {
      const last = merged[merged.length - 1];
      if (last && b[0] <= last[1]) last[1] = Math.max(last[1], b[1]);
      else merged.push([b[0], b[1]]);
    }
    // เอากรอบเวลาลบด้วยช่วงไม่ว่าง = ช่วงว่าง
    let cursor = winStart;
    for (const [s, e] of merged) {
      if (s > cursor) free.push({ date, startMin: cursor, endMin: s });
      cursor = Math.max(cursor, e);
    }
    if (cursor < winEnd) free.push({ date, startMin: cursor, endMin: winEnd });
  }
  return free;
}

export function totalFreeMinutes(slots: FreeSlot[]): number {
  return slots.reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
}

/**
 * วางงานความยาว durationMin นาที ลงในช่วงว่างแรกที่พอ (ไม่เกิน dueDate ถ้ามี)
 * แล้ว "ตัด" เวลาที่ใช้ออกจากช่วงว่าง (mutate) เพื่อไม่ให้งานถัดไปทับ
 * คืน null ถ้าไม่มีช่วงว่างที่พอ
 */
export function placeTask(
  slots: FreeSlot[],
  durationMin: number,
  dueDate?: string | null,
): { date: string; startMin: number; endMin: number } | null {
  for (const slot of slots) {
    if (dueDate && slot.date > dueDate) continue; // ข้ามวันที่เลย deadline (string YYYY-MM-DD เทียบตรงๆ ได้)
    if (slot.endMin - slot.startMin >= durationMin) {
      const placed = { date: slot.date, startMin: slot.startMin, endMin: slot.startMin + durationMin };
      slot.startMin += durationMin;
      return placed;
    }
  }
  return null;
}
