/**
 * lib/categoryWorkload.ts
 * --------------------------------------------------------------
 * แยกเวลาที่ถูกจองในปฏิทินแล้ว (bookedMinutes) ของสมาชิกแต่ละคน ออกเป็น
 * "วิชาการ" (academic) กับ "ไม่ใช่วิชาการ" (non_academic) ตามหมวดหมู่ (Category.kind)
 * ของ Event/Loop ชีวิตที่ครองเวลานั้น - ใช้แสดงกราฟภาระงานแบบแยกสีในหน้ากลุ่ม (WorkloadPanel)
 *
 * นับเฉพาะเวลาที่ "ลงปฏิทินแล้วจริง" (Event ปกติ + Loop ชีวิตที่กางเป็นวันจริง)
 * ไม่รวมงาน To-do ที่ยังไม่ได้จัดลงปฏิทิน (pendingMinutes) - เพราะ Task.category เป็นแค่
 * ข้อความอิสระ ไม่ได้ผูกกับ Category จริง จึงไม่มีหมวดที่เชื่อถือได้ให้แยกสี
 *
 * วิธีคำนวณ: รวมนาทีแบบ "ดิบ" ต่อหมวด (นับซ้ำได้ถ้ากิจกรรมซ้อนกัน) แล้วแปลงเป็น "สัดส่วน"
 * ระหว่างวิชาการ/ไม่ใช่วิชาการ จากนั้นคูณสัดส่วนนั้นกับ bookedMinutes ที่คำนวณแม่นยำแล้ว
 * จาก computeMemberWorkload (ซึ่ง merge ช่วงเวลาที่ซ้อนทับกันไปแล้วตอนหาเวลาว่าง)
 * ผลรวม academic + nonAcademic จึงตรงกับ bookedMinutes เป๊ะเสมอ ไม่ต้องกังวลเรื่องนับซ้ำ
 * --------------------------------------------------------------
 */
import { prisma } from './prisma';
import { NOT_DEADLINE_EVENT } from './eventFilters';
import { availabilityWindow } from './freeTime';
import { expandRecurring, parseDays } from './recurring';
import { timeToMinutes } from './calendarLayout';
import type { RecurringEventInfo } from './types';
import { type CategoryKind, isCategoryKind } from './categoryKind';

export interface KindMinutes {
  academicMinutes: number;
  nonAcademicMinutes: number;
}

function addRaw(map: Map<string, KindMinutes>, userId: string, kind: CategoryKind, minutes: number) {
  const cur = map.get(userId) ?? { academicMinutes: 0, nonAcademicMinutes: 0 };
  if (kind === 'academic') cur.academicMinutes += minutes;
  else cur.nonAcademicMinutes += minutes;
  map.set(userId, cur);
}

/** ความยาวของกิจกรรมหนึ่งชิ้น (นาที) ตัดให้อยู่ในกรอบเวลาที่สะดวกของวันนั้น (เหมือน computeFreeSlots) */
function clippedDuration(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  startMin: number,
  endMin: number,
): number {
  if (endMin <= startMin) return 0;
  const s = timeToMinutes(startTime);
  if (s === null) return endMin - startMin; // กิจกรรมทั้งวัน = เต็มกรอบ
  let e = timeToMinutes(endTime) ?? s + 60;
  if (e <= s) e = s + 60;
  return Math.max(0, Math.min(e, endMin) - Math.max(s, startMin));
}

/**
 * นาทีดิบต่อหมวด (วิชาการ/ไม่ใช่วิชาการ) ของสมาชิกแต่ละคนในช่วงวันที่กำหนด
 * "ดิบ" เพราะไม่ merge ช่วงเวลาที่ซ้อนทับกัน (ใช้แค่หาสัดส่วน ไม่ใช่ตัวเลขสุดท้าย)
 */
export async function rawBookedMinutesByKind(
  userIds: string[],
  dates: string[],
  members: { userId: string; dayStart?: string | null; dayEnd?: string | null }[],
): Promise<Map<string, KindMinutes>> {
  const result = new Map<string, KindMinutes>();
  if (userIds.length === 0 || dates.length === 0) return result;

  const windowStart = new Date(`${dates[0]}T00:00:00.000Z`);
  const windowEnd = new Date(new Date(`${dates[dates.length - 1]}T00:00:00.000Z`).getTime() + 86400000);

  const [events, recurringRows] = await Promise.all([
    prisma.event.findMany({
      where: { userId: { in: userIds }, date: { gte: windowStart, lt: windowEnd }, ...NOT_DEADLINE_EVENT },
      select: { userId: true, startTime: true, endTime: true, category: { select: { kind: true } } },
    }),
    prisma.recurringEvent.findMany({ where: { userId: { in: userIds } } }),
  ]);

  // Loop ชีวิตอ้าง categoryId แบบ string อิสระ (ไม่ใช่ FK ใน schema) - ดึง kind ของหมวดที่ถูกอ้างถึงแยกอีกที
  const recurringCategoryIds = [...new Set(recurringRows.map((r) => r.categoryId).filter((id): id is string => !!id))];
  const referencedCategories = recurringCategoryIds.length
    ? await prisma.category.findMany({ where: { id: { in: recurringCategoryIds } }, select: { id: true, kind: true } })
    : [];
  const kindByCategoryId = new Map(referencedCategories.map((c) => [c.id, c.kind]));

  const prefsById = new Map(members.map((m) => [m.userId, m]));
  const windowFor = (userId: string) => {
    const prefs = prefsById.get(userId);
    return availabilityWindow(prefs?.dayStart, prefs?.dayEnd);
  };

  for (const ev of events) {
    const { startMin, endMin } = windowFor(ev.userId);
    const minutes = clippedDuration(ev.startTime, ev.endTime, startMin, endMin);
    if (minutes <= 0) continue;
    const kind = ev.category?.kind;
    addRaw(result, ev.userId, isCategoryKind(kind) ? kind : 'non_academic', minutes);
  }

  const recurringByUser = new Map<string, RecurringEventInfo[]>();
  for (const r of recurringRows) {
    const arr = recurringByUser.get(r.userId) ?? [];
    arr.push({
      id: r.id,
      title: r.title,
      days: parseDays(r.days),
      startTime: r.startTime,
      endTime: r.endTime,
      categoryId: r.categoryId,
      endDate: r.endDate ? r.endDate.toISOString().slice(0, 10) : null,
    });
    recurringByUser.set(r.userId, arr);
  }
  for (const [uid, list] of recurringByUser) {
    const { startMin, endMin } = windowFor(uid);
    for (const e of expandRecurring(list, dates)) {
      const minutes = clippedDuration(e.startTime, e.endTime, startMin, endMin);
      if (minutes <= 0) continue;
      const kind = e.categoryId ? kindByCategoryId.get(e.categoryId) : null;
      addRaw(result, uid, isCategoryKind(kind) ? kind : 'non_academic', minutes);
    }
  }

  return result;
}

/**
 * แปลงนาทีดิบต่อหมวดให้เป็นสัดส่วนของ bookedMinutes ที่คำนวณแม่นยำแล้ว
 * (ไม่ใช้ตัวเลขดิบตรงๆ เพราะอาจนับซ้ำถ้ากิจกรรมซ้อนกัน) ผลรวมตรงกับ bookedMinutes เป๊ะเสมอ
 *
 * ถ้าไม่มีข้อมูลดิบเลย (เช่น กิจกรรมไม่มีหมวดหมู่) ถือเป็นไม่ใช่วิชาการทั้งหมด -
 * สอดคล้องกับค่าเริ่มต้นของ Category.kind
 */
export function scaleToBookedMinutes(raw: KindMinutes | undefined, bookedMinutes: number): KindMinutes {
  const total = (raw?.academicMinutes ?? 0) + (raw?.nonAcademicMinutes ?? 0);
  if (bookedMinutes <= 0 || total <= 0) return { academicMinutes: 0, nonAcademicMinutes: Math.max(0, bookedMinutes) };
  const academicMinutes = Math.round(bookedMinutes * ((raw?.academicMinutes ?? 0) / total));
  return { academicMinutes, nonAcademicMinutes: bookedMinutes - academicMinutes };
}
