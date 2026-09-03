/**
 * ตัวช่วยเรื่องเวลาไทย (Asia/Bangkok) - ฟังก์ชันล้วน ไม่แตะ DB
 *
 * แยกออกมาจาก lib/schedule.ts เพราะฝั่งที่ต้องการแค่ "วันนี้วันไหน / ตอนนี้กี่โมง"
 * ไม่ควรต้องลาก Prisma client ติดมาด้วย (เช่น lib/slotAdvice.ts ที่เทสต์แยกได้)
 */
const TZ = 'Asia/Bangkok';

/** วันที่วันนี้ตามเวลาไทย รูปแบบ "YYYY-MM-DD" (ไม่พึ่ง timezone ของเครื่องที่รันโค้ด) */
export function todayISOBangkok(): string {
  return dateKeyBangkok(new Date());
}

/**
 * แปลง Date (instant) ใดๆ เป็นวันที่ตามเวลาไทย "YYYY-MM-DD" - เหมือน todayISOBangkok
 * แต่รับวันที่กำหนดเองได้ (เช่น completedAt) ไม่ใช่แค่ "ตอนนี้"
 *
 * สำคัญ: completedAt เก็บเป็นเวลาจริง (instant/UTC) ต้องแปลงผ่าน timezone ให้ถูก
 * ไม่งั้นงานที่เสร็จตอนดึกๆ (หลังเที่ยงคืน UTC แต่ยังเป็นเมื่อวานตามเวลาไทย) จะตกวันผิด
 */
export function dateKeyBangkok(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
}

/**
 * เวลาของ Date ใดๆ ตามเวลาไทย เป็น "ชั่วโมงทศนิยม" (เช่น 14:30 -> 14.5) ไม่ปัดเศษ
 * ต่างจาก nowMinutesBangkok ที่ปัดขึ้นเป็นช่วง 15 นาทีและตอบเป็นนาที (ออกแบบมาให้ "ตัดเวลาที่ผ่านมาแล้ว"
 * ของวันนี้ทิ้ง) - อันนี้ใช้กับสถิติที่ต้องการค่าจริงไม่ปัดเศษ เช่นวิเคราะห์ช่วงเวลาที่ทำงานเสร็จบ่อยที่สุด
 */
export function hourOfDayBangkok(date: Date): number {
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit' }).format(
    date,
  );
  const [hh, mm] = hm.split(':').map(Number);
  return hh + mm / 60;
}

/** รายการวัน n วันนับจากวันนี้ (เวลาไทย) */
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

/** เดือนปัจจุบันตามเวลาไทย รูปแบบ "YYYY-MM" */
export function currentMonthBangkok(): string {
  return todayISOBangkok().slice(0, 7);
}

/**
 * ขอบเขตของเดือน (ตามเวลาไทย) แปลงเป็น Date object สำหรับ query แบบ [start, end)
 * เดือนคือ "YYYY-MM" - คืน null ถ้ารูปแบบผิด
 *
 * สำคัญ: timestamp อย่าง completedAt เก็บเป็นเวลาจริง (instant) ไม่ใช่ date-only เที่ยงคืน UTC
 * แบบ Event.date จึงต้องแปลง "เที่ยงคืนตามเวลาไทย" กลับเป็น UTC instant ให้ถูก (ใส่ offset +07:00 ตรงๆ)
 * ไม่งั้นงานที่เสร็จตอนดึกๆ (หลังเที่ยงคืน UTC แต่ยังเป็นเมื่อวานตามเวลาไทย) จะตกไปอยู่ผิดเดือน
 */
export function monthRangeBangkok(month: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  if (m < 1 || m > 12) return null;
  const start = new Date(`${month}-01T00:00:00.000+07:00`);
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const end = new Date(`${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00.000+07:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}
