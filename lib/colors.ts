import type { PastelColor } from './types';

interface PastelColorOption {
  value: PastelColor;
  label: string;
  swatchClass: string; // ใช้ตอนเลือกสีในฟอร์ม (พื้นหลังเข้มขึ้นนิดให้เห็นสีชัด)
  chipClass: string; // ใช้แสดงเป็น chip บนปฏิทิน/รายการ (พื้นอ่อน + ตัวอักษรเข้ม)
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
  { value: 'pink', label: 'ชมพู', swatchClass: 'bg-pastel-pink-dark', chipClass: 'bg-pastel-pink text-eddy-700', dotClass: 'bg-pastel-pink-dark', strokeClass: 'stroke-pastel-pink-dark' },
  { value: 'yellow', label: 'เหลือง', swatchClass: 'bg-pastel-yellow-dark', chipClass: 'bg-pastel-yellow text-eddy-700', dotClass: 'bg-pastel-yellow-dark', strokeClass: 'stroke-pastel-yellow-dark' },
  { value: 'mint', label: 'มิ้นท์', swatchClass: 'bg-pastel-mint-dark', chipClass: 'bg-pastel-mint text-eddy-700', dotClass: 'bg-pastel-mint-dark', strokeClass: 'stroke-pastel-mint-dark' },
  { value: 'blue', label: 'ฟ้า', swatchClass: 'bg-pastel-blue-dark', chipClass: 'bg-pastel-blue text-eddy-700', dotClass: 'bg-pastel-blue-dark', strokeClass: 'stroke-pastel-blue-dark' },
  { value: 'peach', label: 'พีช', swatchClass: 'bg-pastel-peach-dark', chipClass: 'bg-pastel-peach text-eddy-700', dotClass: 'bg-pastel-peach-dark', strokeClass: 'stroke-pastel-peach-dark' },
  { value: 'lilac', label: 'ม่วงอ่อน', swatchClass: 'bg-pastel-lilac-dark', chipClass: 'bg-pastel-lilac text-eddy-700', dotClass: 'bg-pastel-lilac-dark', strokeClass: 'stroke-pastel-lilac-dark' },
  { value: 'amber', label: 'อำพัน', swatchClass: 'bg-pastel-amber-dark', chipClass: 'bg-pastel-amber text-eddy-700', dotClass: 'bg-pastel-amber-dark', strokeClass: 'stroke-pastel-amber-dark' },
  { value: 'lime', label: 'เขียวมะนาว', swatchClass: 'bg-pastel-lime-dark', chipClass: 'bg-pastel-lime text-eddy-700', dotClass: 'bg-pastel-lime-dark', strokeClass: 'stroke-pastel-lime-dark' },
  { value: 'olive', label: 'เขียวมะกอก', swatchClass: 'bg-pastel-olive-dark', chipClass: 'bg-pastel-olive text-eddy-700', dotClass: 'bg-pastel-olive-dark', strokeClass: 'stroke-pastel-olive-dark' },
  { value: 'teal', label: 'เขียวมรกต', swatchClass: 'bg-pastel-teal-dark', chipClass: 'bg-pastel-teal text-eddy-700', dotClass: 'bg-pastel-teal-dark', strokeClass: 'stroke-pastel-teal-dark' },
  { value: 'sky', label: 'ฟ้าอมเขียว', swatchClass: 'bg-pastel-sky-dark', chipClass: 'bg-pastel-sky text-eddy-700', dotClass: 'bg-pastel-sky-dark', strokeClass: 'stroke-pastel-sky-dark' },
  { value: 'indigo', label: 'น้ำเงินอมม่วง', swatchClass: 'bg-pastel-indigo-dark', chipClass: 'bg-pastel-indigo text-eddy-700', dotClass: 'bg-pastel-indigo-dark', strokeClass: 'stroke-pastel-indigo-dark' },
  { value: 'violet', label: 'ม่วง', swatchClass: 'bg-pastel-violet-dark', chipClass: 'bg-pastel-violet text-eddy-700', dotClass: 'bg-pastel-violet-dark', strokeClass: 'stroke-pastel-violet-dark' },
  { value: 'plum', label: 'มัลเบอร์รี่', swatchClass: 'bg-pastel-plum-dark', chipClass: 'bg-pastel-plum text-eddy-700', dotClass: 'bg-pastel-plum-dark', strokeClass: 'stroke-pastel-plum-dark' },
  { value: 'coral', label: 'ส้มอมชมพู', swatchClass: 'bg-pastel-coral-dark', chipClass: 'bg-pastel-coral text-eddy-700', dotClass: 'bg-pastel-coral-dark', strokeClass: 'stroke-pastel-coral-dark' },
  { value: 'rose', label: 'กุหลาบ', swatchClass: 'bg-pastel-rose-dark', chipClass: 'bg-pastel-rose text-eddy-700', dotClass: 'bg-pastel-rose-dark', strokeClass: 'stroke-pastel-rose-dark' },
  // ชั้นอ่อน
  { value: 'mustard', label: 'มัสตาร์ด', swatchClass: 'bg-pastel-mustard-dark', chipClass: 'bg-pastel-mustard text-eddy-700', dotClass: 'bg-pastel-mustard-dark', strokeClass: 'stroke-pastel-mustard-dark' },
  { value: 'azure', label: 'ฟ้าสด', swatchClass: 'bg-pastel-azure-dark', chipClass: 'bg-pastel-azure text-eddy-700', dotClass: 'bg-pastel-azure-dark', strokeClass: 'stroke-pastel-azure-dark' },
  { value: 'jade', label: 'หยก', swatchClass: 'bg-pastel-jade-dark', chipClass: 'bg-pastel-jade text-eddy-700', dotClass: 'bg-pastel-jade-dark', strokeClass: 'stroke-pastel-jade-dark' },
  { value: 'orchid', label: 'กล้วยไม้', swatchClass: 'bg-pastel-orchid-dark', chipClass: 'bg-pastel-orchid text-eddy-700', dotClass: 'bg-pastel-orchid-dark', strokeClass: 'stroke-pastel-orchid-dark' },
  // ชั้นเข้ม - พื้นเข้มพอที่ eddy-700 จะอ่านไม่ออก (คอนทราสต์ ~1.7-1.9) จึงใช้ตัวอักษรสีขาวแทน
  { value: 'bronze', label: 'บรอนซ์', swatchClass: 'bg-pastel-bronze', chipClass: 'bg-pastel-bronze text-white', dotClass: 'bg-pastel-bronze-dark', strokeClass: 'stroke-pastel-bronze-dark' },
  { value: 'grape', label: 'องุ่น', swatchClass: 'bg-pastel-grape', chipClass: 'bg-pastel-grape text-white', dotClass: 'bg-pastel-grape-dark', strokeClass: 'stroke-pastel-grape-dark' },
  { value: 'pine', label: 'เขียวสน', swatchClass: 'bg-pastel-pine', chipClass: 'bg-pastel-pine text-white', dotClass: 'bg-pastel-pine-dark', strokeClass: 'stroke-pastel-pine-dark' },
  { value: 'wine', label: 'ไวน์', swatchClass: 'bg-pastel-wine', chipClass: 'bg-pastel-wine text-white', dotClass: 'bg-pastel-wine-dark', strokeClass: 'stroke-pastel-wine-dark' },
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
