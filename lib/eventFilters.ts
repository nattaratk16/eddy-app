/**
 * lib/eventFilters.ts
 * --------------------------------------------------------------
 * เงื่อนไข Prisma ที่ใช้ซ้ำทุกครั้งที่ query ตาราง Event เพื่อคำนวณ "เวลาไม่ว่าง"/ความชนกัน
 *
 * หมุดกำหนดส่ง (isDeadline: true) มีระยะเวลา 0 นาที ไม่ถือเป็นเวลาที่ถูกจอง - ผู้ใช้ยังลงมือทำ
 * อย่างอื่นทับช่วงนั้นได้ตามปกติ ทุก query ที่ตีความ Event ว่าเป็น "เวลายุ่ง" ต้องกรอง isDeadline
 * ออกเสมอ ไม่งั้นหมุดจะถูกนับเป็นเวลาชนกันผิดๆ รวมไว้ที่เดียวแทนที่จะเขียน isDeadline: false
 * แยกกันทุกจุด - จุดไหนลืมใส่จะกลายเป็นบั๊กเงียบๆ ที่มองจากโค้ดตรงนั้นไม่รู้เลยว่าลืมอะไร
 * --------------------------------------------------------------
 */
export const NOT_DEADLINE_EVENT = { isDeadline: false } as const;

/**
 * เงื่อนไข Prisma: Event นี้ "ปรากฏอยู่" ในช่วง [windowStart, windowEnd) หรือไม่ (windowEnd ไม่รวม)
 * ต้องใช้แทนการเทียบ date ตรงๆ เพราะกิจกรรมหลายวัน (มี endDate) อาจเริ่มก่อนหน้าต่างนี้
 * แต่ยังสิ้นสุดอยู่ในช่วง - เทียบแบบ interval overlap มาตรฐาน:
 *   event เริ่มก่อน windowEnd  และ  event จบ (endDate ?? date) ไม่ก่อน windowStart
 * windowStart/windowEnd เป็น Date เที่ยงคืน UTC แบบเดียวกับที่ query Event.date ใช้กันอยู่แล้วทุกจุด
 */
export function eventOverlapsWindow(windowStart: Date, windowEnd: Date) {
  return {
    date: { lt: windowEnd },
    OR: [{ endDate: { gte: windowStart } }, { endDate: null, date: { gte: windowStart } }],
  };
}
