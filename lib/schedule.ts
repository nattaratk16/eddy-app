/**
 * lib/schedule.ts
 * --------------------------------------------------------------
 * ตัวช่วย "หาเวลาว่างจริงของผู้ใช้" ที่ใช้ร่วมกันระหว่าง
 *   - การกระจายงานกลุ่ม  (POST /api/groups/[id]/distribute)
 *   - การจัดงาน To-do ลงปฏิทินอัตโนมัติ (POST /api/tasks/schedule)
 *
 * เดิมตรรกะนี้เขียนไว้ในไฟล์ distribute อย่างเดียว พอต้องใช้ฝั่งงานส่วนตัวด้วย
 * จึงย้ายออกมาไว้ที่เดียว จะได้ไม่มีสองสูตรที่คำนวณ "เวลาว่าง" ไม่ตรงกัน
 *
 * เป็นการคำนวณ local ล้วน (ไม่เรียก AI) เพื่อการันตีว่าเวลาที่เสนอจะไม่ชนของเดิม
 * --------------------------------------------------------------
 */
import { prisma } from './prisma';
import { computeFreeSlots, type FreeSlot } from './freeTime';
import { expandRecurring, parseDays } from './recurring';
import type { RecurringEventInfo } from './types';

const TZ = 'Asia/Bangkok';

/** วันที่วันนี้ตามเวลาไทย รูปแบบ "YYYY-MM-DD" (ไม่พึ่ง timezone ของเครื่องที่รันโค้ด) */
export function todayISOBangkok(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

/** รายการวัน n วันนับจากวันนี้ (เวลาไทย) เช่น ["2026-08-27", "2026-08-28", ...] */
export function buildDateWindow(days: number): string[] {
  const t0 = new Date(`${todayISOBangkok()}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, i) => new Date(t0.getTime() + i * 86400000).toISOString().slice(0, 10));
}

/**
 * เวลาปัจจุบัน (เวลาไทย) เป็นนาทีจากเที่ยงคืน ปัดขึ้นเป็นช่วง 15 นาที
 * ใช้ตัดช่วงว่างของ "วันนี้" ที่ผ่านมาแล้วทิ้ง จะได้ไม่เสนอเวลาย้อนหลัง
 */
export function nowMinutesBangkok(): number {
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit' }).format(
    new Date(),
  );
  const [hh, mm] = hm.split(':').map(Number);
  return Math.min(Math.ceil((hh * 60 + mm) / 15) * 15, 24 * 60);
}

/**
 * ช่วงเวลาว่างของผู้ใช้หลายคนในช่วงวันที่กำหนด
 *
 * "ไม่ว่าง" = Event ในปฏิทิน + Loop ชีวิต (recurring) ที่กางออกเป็นวันจริงแล้ว
 * "กรอบเวลา" = dayStart–dayEnd ของแต่ละคน (ไม่ตั้ง = 08:00–22:00 ตาม default ใน freeTime.ts)
 *
 * คืน Map<userId, FreeSlot[]> โดย slot ของวันแรกจะถูกตัดไม่ให้ย้อนหลังกว่าเวลาปัจจุบัน
 * (อาร์เรย์ที่คืนมาแก้ไขได้ - placeTask จะ mutate เพื่อกันงานถัดไปวางทับ)
 */
export async function freeSlotsForUsers(userIds: string[], dates: string[]): Promise<Map<string, FreeSlot[]>> {
  const result = new Map<string, FreeSlot[]>();
  if (userIds.length === 0 || dates.length === 0) return result;

  const windowStart = new Date(`${dates[0]}T00:00:00.000Z`);
  const windowEnd = new Date(new Date(`${dates[dates.length - 1]}T00:00:00.000Z`).getTime() + 86400000);

  const [users, events, recurringRows] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, dayStart: true, dayEnd: true } }),
    prisma.event.findMany({
      where: { userId: { in: userIds }, date: { gte: windowStart, lt: windowEnd } },
      select: { userId: true, date: true, startTime: true, endTime: true },
    }),
    prisma.recurringEvent.findMany({ where: { userId: { in: userIds } } }),
  ]);

  // ช่วงไม่ว่างจาก Event ปกติ
  const busyByUser = new Map<string, { date: string; startTime: string | null; endTime: string | null }[]>();
  for (const ev of events) {
    const arr = busyByUser.get(ev.userId) ?? [];
    arr.push({ date: ev.date.toISOString().slice(0, 10), startTime: ev.startTime, endTime: ev.endTime });
    busyByUser.set(ev.userId, arr);
  }

  // บวกช่วงไม่ว่างจาก Loop ชีวิต (กางเป็นวันจริงก่อน)
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
    const arr = busyByUser.get(uid) ?? [];
    for (const e of expandRecurring(list, dates)) {
      arr.push({ date: e.date, startTime: e.startTime ?? null, endTime: e.endTime ?? null });
    }
    busyByUser.set(uid, arr);
  }

  const nowMin = nowMinutesBangkok();
  const isToday = dates[0] === todayISOBangkok();
  const prefsById = new Map(users.map((u) => [u.id, u]));

  for (const uid of userIds) {
    const prefs = prefsById.get(uid);
    const slots = computeFreeSlots(busyByUser.get(uid) ?? [], dates, prefs?.dayStart, prefs?.dayEnd)
      // วันนี้: เลื่อนจุดเริ่มไม่ให้ก่อนเวลาปัจจุบัน
      .map((s) => (isToday && s.date === dates[0] && s.startMin < nowMin ? { ...s, startMin: nowMin } : s))
      .filter((s) => s.endMin - s.startMin > 0);
    result.set(uid, slots);
  }

  return result;
}
