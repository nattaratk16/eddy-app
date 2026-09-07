import type { PastelColor } from './types';

interface PastelColorOption {
  value: PastelColor;
  label: string;
  swatchClass: string; // ใช้ตอนเลือกสีในฟอร์ม (พื้นหลังเข้มขึ้นนิดให้เห็นสีชัด)
  chipClass: string; // ชิปสีทึบ (ตัวเลือกสี, อวาตาร์, ป้ายหมวดหมู่ในฟอร์ม)
  /**
   * บล็อกกิจกรรมบนปฏิทิน - พื้นเป็นสีเดียวกันแต่จาง + ตัวอักษรใช้ text-ink ปกติ
   * ต่างจาก chipClass ที่ทึบ เพราะบนตารางเวลามีบล็อกวางติดกันหลายใบ ถ้าทึบหมดจะแน่นจนอ่านยาก
   * (แบบเดียวกับ Apple Calendar - สีทึบเก็บไว้ที่แถบข้างซ้ายซึ่งใช้ dotClass)
   *
   * ใช้ text-ink ที่พลิกตามโหมดได้เลย เพราะพื้นจางจะผสมกับพื้นข้างหลังเสมอ
   * โหมดสว่าง = สีอ่อน + ตัวอักษรเข้ม, โหมดมืด = สีเข้ม + ตัวอักษรอ่อน ถูกทั้งคู่โดยไม่ต้องมีสีเพิ่ม
   */
  eventClass: string;
  dotClass: string; // จุดกลมเล็กแสดงสีหมวดหมู่
  strokeClass: string; // เส้น SVG (เช่น เสี้ยวโดนัทกราฟสัดส่วนเวลา) - สีเดียวกับ dotClass
}

// ห้ามต่อ string เอง เช่น `bg-pastel-${color}` เพราะ Tailwind ต้องเห็น class แบบเต็มตอน build
// 6 สีแรกเป็นค่าดั้งเดิม (ห้ามแก้ไข ไม่งั้นหมวดหมู่เก่าที่ผู้ใช้สร้างไว้จะเปลี่ยนสีไปเอง)
// 10 สีถัดมาสร้าง+ตรวจสอบผ่าน dataviz skill (categorical color validator) เพื่อให้แยกแยะง่าย
//
// 8 สีท้าย (mustard..wine) เพิ่มทีหลังตอนที่ 16 สีแรกใช้วงล้อสีจนเต็มแล้ว - วัดใน OKLCH ทั้ง 16 สี
// เกาะอยู่บนวงบางๆ วงเดียว (L 0.91-0.96) จนหลายคู่แทบแยกไม่ออก (blue↔indigo ห่างกันแค่ ΔE 1.4)
// เติมเฉดใหม่ที่ความสว่างเดิมจะยิ่งไปทับของเดิม จึงเปิดแกนใหม่คือ "ความสว่าง" แทน:
//   - ชั้นอ่อน (mustard, azure, jade, orchid) L 0.80 -> ยังใช้ text-eddy-700 ได้ (คอนทราสต์ 4.8-5.3)
//   - ชั้นเข้ม (bronze, grape, pine, wine)   L 0.53 -> ต้องใช้ text-white แทน (คอนทราสต์ 5.0-5.8)
// ทั้ง 8 สีห่างจาก 16 สีเดิมและห่างกันเองอย่างน้อย ΔE 10 และคู่ที่แยกยากที่สุดของพาเลตรวม 24 สี
// ยังเป็นคู่ blue↔indigo เดิม แปลว่าการเติมสีไม่ได้ทำให้มีคู่ไหนแยกยากขึ้นเลย
//
// ห้ามแทรก/สลับสีกลางอาร์เรย์ - ต่อท้ายเท่านั้น เพราะการแจกสีอัตโนมัติอ้าง index
// (getColorOption() ใช้ index 3 เป็นค่าสำรอง, การแจกสีสมาชิกกลุ่มใน /api/groups/[id]/calendar ใช้ i % length)
//
// การ "ต่อท้าย" อย่างเดียวยังไม่พอสำหรับ colorForTask() นะ - ตัวนั้นหารด้วย TASK_COLOR_COUNT
// ที่ตรึงไว้ 16 ต่างหาก เพราะสีของงานถูกเขียนลงฐานข้อมูลไปแล้ว (ดูเหตุผลเต็มที่ TASK_COLOR_COUNT)
export const PASTEL_COLORS: PastelColorOption[] = [
  { value: 'pink', label: 'ชมพู', swatchClass: 'bg-cal-pink', eventClass: 'bg-cal-pink/25 text-ink', chipClass: 'bg-cal-pink text-chip-ink', dotClass: 'bg-cal-pink', strokeClass: 'stroke-cal-pink' },
  { value: 'yellow', label: 'เหลือง', swatchClass: 'bg-cal-yellow', eventClass: 'bg-cal-yellow/25 text-ink', chipClass: 'bg-cal-yellow text-chip-ink', dotClass: 'bg-cal-yellow', strokeClass: 'stroke-cal-yellow' },
  { value: 'mint', label: 'มิ้นท์', swatchClass: 'bg-cal-mint', eventClass: 'bg-cal-mint/25 text-ink', chipClass: 'bg-cal-mint text-chip-ink', dotClass: 'bg-cal-mint', strokeClass: 'stroke-cal-mint' },
  { value: 'blue', label: 'ฟ้า', swatchClass: 'bg-cal-blue', eventClass: 'bg-cal-blue/25 text-ink', chipClass: 'bg-cal-blue text-chip-ink', dotClass: 'bg-cal-blue', strokeClass: 'stroke-cal-blue' },
  { value: 'peach', label: 'พีช', swatchClass: 'bg-cal-peach', eventClass: 'bg-cal-peach/25 text-ink', chipClass: 'bg-cal-peach text-chip-ink', dotClass: 'bg-cal-peach', strokeClass: 'stroke-cal-peach' },
  { value: 'lilac', label: 'ม่วงอ่อน', swatchClass: 'bg-cal-lilac', eventClass: 'bg-cal-lilac/25 text-ink', chipClass: 'bg-cal-lilac text-chip-ink', dotClass: 'bg-cal-lilac', strokeClass: 'stroke-cal-lilac' },
  { value: 'amber', label: 'อำพัน', swatchClass: 'bg-cal-amber', eventClass: 'bg-cal-amber/25 text-ink', chipClass: 'bg-cal-amber text-chip-ink', dotClass: 'bg-cal-amber', strokeClass: 'stroke-cal-amber' },
  { value: 'lime', label: 'เขียวมะนาว', swatchClass: 'bg-cal-lime', eventClass: 'bg-cal-lime/25 text-ink', chipClass: 'bg-cal-lime text-chip-ink', dotClass: 'bg-cal-lime', strokeClass: 'stroke-cal-lime' },
  { value: 'olive', label: 'เขียวมะกอก', swatchClass: 'bg-cal-olive', eventClass: 'bg-cal-olive/25 text-ink', chipClass: 'bg-cal-olive text-chip-ink', dotClass: 'bg-cal-olive', strokeClass: 'stroke-cal-olive' },
  { value: 'teal', label: 'เขียวมรกต', swatchClass: 'bg-cal-teal', eventClass: 'bg-cal-teal/25 text-ink', chipClass: 'bg-cal-teal text-chip-ink', dotClass: 'bg-cal-teal', strokeClass: 'stroke-cal-teal' },
  { value: 'sky', label: 'ฟ้าอมเขียว', swatchClass: 'bg-cal-sky', eventClass: 'bg-cal-sky/25 text-ink', chipClass: 'bg-cal-sky text-chip-ink', dotClass: 'bg-cal-sky', strokeClass: 'stroke-cal-sky' },
  { value: 'indigo', label: 'น้ำเงินอมม่วง', swatchClass: 'bg-cal-indigo', eventClass: 'bg-cal-indigo/25 text-ink', chipClass: 'bg-cal-indigo text-chip-ink', dotClass: 'bg-cal-indigo', strokeClass: 'stroke-cal-indigo' },
  { value: 'violet', label: 'ม่วง', swatchClass: 'bg-cal-violet', eventClass: 'bg-cal-violet/25 text-ink', chipClass: 'bg-cal-violet text-chip-ink', dotClass: 'bg-cal-violet', strokeClass: 'stroke-cal-violet' },
  { value: 'plum', label: 'มัลเบอร์รี่', swatchClass: 'bg-cal-plum', eventClass: 'bg-cal-plum/25 text-ink', chipClass: 'bg-cal-plum text-chip-ink', dotClass: 'bg-cal-plum', strokeClass: 'stroke-cal-plum' },
  { value: 'coral', label: 'ส้มอมชมพู', swatchClass: 'bg-cal-coral', eventClass: 'bg-cal-coral/25 text-ink', chipClass: 'bg-cal-coral text-chip-ink', dotClass: 'bg-cal-coral', strokeClass: 'stroke-cal-coral' },
  { value: 'rose', label: 'กุหลาบ', swatchClass: 'bg-cal-rose', eventClass: 'bg-cal-rose/25 text-ink', chipClass: 'bg-cal-rose text-chip-ink', dotClass: 'bg-cal-rose', strokeClass: 'stroke-cal-rose' },
  // ชั้นอ่อน
  { value: 'mustard', label: 'มัสตาร์ด', swatchClass: 'bg-cal-mustard', eventClass: 'bg-cal-mustard/25 text-ink', chipClass: 'bg-cal-mustard text-white', dotClass: 'bg-cal-mustard', strokeClass: 'stroke-cal-mustard' },
  { value: 'azure', label: 'ฟ้าสด', swatchClass: 'bg-cal-azure', eventClass: 'bg-cal-azure/25 text-ink', chipClass: 'bg-cal-azure text-white', dotClass: 'bg-cal-azure', strokeClass: 'stroke-cal-azure' },
  { value: 'jade', label: 'หยก', swatchClass: 'bg-cal-jade', eventClass: 'bg-cal-jade/25 text-ink', chipClass: 'bg-cal-jade text-white', dotClass: 'bg-cal-jade', strokeClass: 'stroke-cal-jade' },
  { value: 'orchid', label: 'กล้วยไม้', swatchClass: 'bg-cal-orchid', eventClass: 'bg-cal-orchid/25 text-ink', chipClass: 'bg-cal-orchid text-white', dotClass: 'bg-cal-orchid', strokeClass: 'stroke-cal-orchid' },
  // ชั้นเข้ม - พื้นเข้มพอที่ eddy-700 จะอ่านไม่ออก (คอนทราสต์ ~1.7-1.9) จึงใช้ตัวอักษรสีขาวแทน
  { value: 'bronze', label: 'บรอนซ์', swatchClass: 'bg-cal-bronze', eventClass: 'bg-cal-bronze/25 text-ink', chipClass: 'bg-cal-bronze text-white', dotClass: 'bg-cal-bronze', strokeClass: 'stroke-cal-bronze' },
  { value: 'grape', label: 'องุ่น', swatchClass: 'bg-cal-grape', eventClass: 'bg-cal-grape/25 text-ink', chipClass: 'bg-cal-grape text-white', dotClass: 'bg-cal-grape', strokeClass: 'stroke-cal-grape' },
  { value: 'pine', label: 'เขียวสน', swatchClass: 'bg-cal-pine', eventClass: 'bg-cal-pine/25 text-ink', chipClass: 'bg-cal-pine text-white', dotClass: 'bg-cal-pine', strokeClass: 'stroke-cal-pine' },
  { value: 'wine', label: 'ไวน์', swatchClass: 'bg-cal-wine', eventClass: 'bg-cal-wine/25 text-ink', chipClass: 'bg-cal-wine text-white', dotClass: 'bg-cal-wine', strokeClass: 'stroke-cal-wine' },
];

export function getColorOption(color: PastelColor): PastelColorOption {
  return PASTEL_COLORS.find((c) => c.value === color) ?? PASTEL_COLORS[3];
}

/**
 * จำนวนสีที่ colorForTask() หารเอา - ตรึงไว้ที่ 16 ห้ามผูกกับ PASTEL_COLORS.length
 *
 * สีที่ได้จาก colorForTask ถูก "เขียนลงฐานข้อมูล" ที่คอลัมน์ Event.color ตอนจัดลงปฏิทิน
 * (app/api/tasks/schedule/route.ts, lib/taskCalendar.ts) ไม่ได้คำนวณใหม่ตอนแสดงผล
 * ถ้าตัวหารเปลี่ยนตามความยาวอาร์เรย์ ของที่เขียนไว้แล้วจะค้างสีเดิม ส่วนของที่เขียนใหม่
 * หลังจากนี้จะได้อีกสี -> งานชิ้นเดียวกันมีทั้งบล็อกลงมือทำและหมุดกำหนดส่งคนละสี
 * ซึ่งขัดกับสัญญาของฟังก์ชันนี้เอง ("จัดลงปฏิทินใหม่กี่ครั้งสีก็ไม่เปลี่ยน")
 *
 * 8 สีที่เพิ่มมาทีหลังจึงเป็นสีสำหรับ "ให้ผู้ใช้เลือกเอง" (หมวดหมู่/กลุ่ม/อวาตาร์) เท่านั้น
 * ถ้าจะให้งานใช้ 24 สีด้วยจริงๆ ต้อง backfill Event.color ในฐานข้อมูลพร้อมกันทั้งหมด
 */
const TASK_COLOR_COUNT = 16;

/**
 * สีประจำงานหนึ่งชิ้น - คำนวณจาก id ของงาน
 *
 * "สุ่ม" แต่คงที่: id เดิมได้สีเดิมเสมอ
 *   - ขั้นตอนย่อยของงานเดียวกันจึงได้สีเดียวกัน (ส่งค่า taskId ของงานแม่เข้ามา)
 *   - จัดลงปฏิทินใหม่กี่ครั้งสีก็ไม่เปลี่ยน
 *   - ไม่ต้องเก็บ state อะไรเพิ่ม
 *
 * ใช้ FNV-1a ซึ่งกระจายค่าดีพอสำหรับงานนี้และเขียนสั้น (ไม่ต้องพึ่ง lib ภายนอก)
 */
export function colorForTask(taskId: string): PastelColor {
  let hash = 0x811c9dc5;
  for (let i = 0; i < taskId.length; i++) {
    hash ^= taskId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return PASTEL_COLORS[hash % TASK_COLOR_COUNT].value;
}

/**
 * สีที่ใช้แสดง event หนึ่งใบ
 * event ที่มีสีของตัวเอง (งานจาก To-do) ใช้สีนั้น ที่เหลือใช้สีของหมวดหมู่ตามเดิม
 */
export function getEventColor(
  eventColor: string | null | undefined,
  categoryColor: PastelColor | null | undefined,
): PastelColorOption | null {
  const value = (eventColor ?? categoryColor) as PastelColor | undefined;
  if (!value) return null;
  return getColorOption(value);
}
