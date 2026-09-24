/**
 * lib/eisenhowerToday.ts
 * --------------------------------------------------------------
 * "วันนี้หมดเวลาไปกับงานด่วน+สำคัญ หรือด่วนแต่ไม่สำคัญ มากกว่ากัน" (เมทริกซ์ไอเซนฮาวร์)
 * ใช้กับกราฟวงกลมในแดชบอร์ดส่วนตัว - แสดงแค่ 2 เสี้ยว (เฉพาะงาน "ด่วน" เท่านั้น แบ่งตามสำคัญ/ไม่สำคัญ)
 *
 * นิยาม (ยืมเกณฑ์เดียวกับที่ lib/burnoutRisk.ts ใช้อยู่แล้ว ไม่ได้คิดใหม่):
 *   ด่วน   = มีกำหนดส่งและถึงกำหนดแล้ว (เหมือน overdueCount)
 *   สำคัญ  = priority เป็น "high" (เหมือน urgentPileupCount)
 *
 * ขอบเขต: นับเฉพาะ Event ของ "วันนี้" ที่มาจากงาน To-do จริง (มี sourceTaskId) เท่านั้น -
 * กิจกรรมทั่วไปในปฏิทินที่ไม่ได้มาจากงานไม่มีสัญญาณสำคัญ/ด่วนให้จัดหมวดได้ เลยไม่นับ
 * --------------------------------------------------------------
 */
import { prisma } from './prisma';
import { NOT_DEADLINE_EVENT } from './eventFilters';
import { todayISOBangkok } from './thaiTime';
import { timeToMinutes } from './calendarLayout';
import { DEFAULT_DURATION } from './freeTime';

export function isUrgentDue(dueDateISO: string | null, todayISO: string): boolean {
  return dueDateISO !== null && dueDateISO <= todayISO;
}

export function isImportant(priority: string): boolean {
  return priority === 'high';
}

/** ความยาวของ event (นาที) - ไม่มี startTime เลยถือว่าไม่ใช่ช่วงเวลาทำงานจริง คืน null (ข้าม) */
export function eventDurationMinutes(startTime: string | null, endTime: string | null): number | null {
  const s = timeToMinutes(startTime);
  if (s === null) return null;
  let e = timeToMinutes(endTime) ?? s + DEFAULT_DURATION;
  if (e <= s) e = s + DEFAULT_DURATION;
  return e - s;
}

export interface EisenhowerEntry {
  minutes: number;
  important: boolean;
  urgent: boolean;
}

export interface EisenhowerSplit {
  importantMinutes: number; // ด่วน + สำคัญ
  routineMinutes: number; // ด่วน + ไม่สำคัญ
  totalUrgentMinutes: number;
  /** เวลารวมทั้งหมดที่มาจากงาน To-do วันนี้ (ด่วน+ไม่ด่วน) - ใช้บอกบริบทว่าด่วนคิดเป็นกี่ % ของงานวันนี้ */
  totalTaskMinutes: number;
}

export function computeEisenhowerSplit(entries: EisenhowerEntry[]): EisenhowerSplit {
  let importantMinutes = 0;
  let routineMinutes = 0;
  let totalTaskMinutes = 0;
  for (const e of entries) {
    totalTaskMinutes += e.minutes;
    if (!e.urgent) continue;
    if (e.important) importantMinutes += e.minutes;
    else routineMinutes += e.minutes;
  }
  return { importantMinutes, routineMinutes, totalUrgentMinutes: importantMinutes + routineMinutes, totalTaskMinutes };
}

const EMPTY_SPLIT: EisenhowerSplit = { importantMinutes: 0, routineMinutes: 0, totalUrgentMinutes: 0, totalTaskMinutes: 0 };

/** ดึงข้อมูลจริงจาก DB มาคำนวณสัดส่วนเวลาวันนี้ตามเมทริกซ์ไอเซนฮาวร์ */
export async function getEisenhowerToday(userId: string): Promise<EisenhowerSplit> {
  const today = todayISOBangkok();
  const todayStart = new Date(`${today}T00:00:00.000Z`);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const events = await prisma.event.findMany({
    where: { userId, date: { gte: todayStart, lt: todayEnd }, ...NOT_DEADLINE_EVENT, sourceTaskId: { not: null } },
    select: { startTime: true, endTime: true, sourceTaskId: true },
  });
  if (events.length === 0) return EMPTY_SPLIT;

  const taskIds = [...new Set(events.map((e) => e.sourceTaskId).filter((id): id is string => !!id))];
  const tasks = await prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, priority: true, dueDate: true } });
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const entries: EisenhowerEntry[] = [];
  for (const ev of events) {
    const minutes = eventDurationMinutes(ev.startTime, ev.endTime);
    // ไม่มี sourceTaskId ผ่านการ query กรองมาแล้ว แต่ TS ไม่รู้ - เช็คซ้ำเผื่องานต้นทางถูกลบไปแล้ว (event กำพร้า)
    const task = ev.sourceTaskId ? taskById.get(ev.sourceTaskId) : null;
    if (minutes === null || !task) continue;
    const dueISO = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null;
    entries.push({ minutes, important: isImportant(task.priority), urgent: isUrgentDue(dueISO, today) });
  }

  return computeEisenhowerSplit(entries);
}
