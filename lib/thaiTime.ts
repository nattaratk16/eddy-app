/**
 * ตัวช่วยเรื่องเวลาไทย (Asia/Bangkok) - ฟังก์ชันล้วน ไม่แตะ DB
 *
 * แยกออกมาจาก lib/schedule.ts เพราะฝั่งที่ต้องการแค่ "วันนี้วันไหน / ตอนนี้กี่โมง"
 * ไม่ควรต้องลาก Prisma client ติดมาด้วย (เช่น lib/slotAdvice.ts ที่เทสต์แยกได้)
 */
const TZ = 'Asia/Bangkok';

/** วันที่วันนี้ตามเวลาไทย รูปแบบ "YYYY-MM-DD" (ไม่พึ่ง timezone ของเครื่องที่รันโค้ด) */
export function todayISOBangkok(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
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
