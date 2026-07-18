import type { PastelColor } from './types';

interface PastelColorOption {
  value: PastelColor;
  label: string;
  swatchClass: string; // ใช้ตอนเลือกสีในฟอร์ม (พื้นหลังเข้มขึ้นนิดให้เห็นสีชัด)
  chipClass: string; // ใช้แสดงเป็น chip บนปฏิทิน/รายการ (พื้นอ่อน + ตัวอักษรเข้ม)
  dotClass: string; // จุดกลมเล็กแสดงสีหมวดหมู่
}

// ห้ามต่อ string เอง เช่น `bg-pastel-${color}` เพราะ Tailwind ต้องเห็น class แบบเต็มตอน build
// 6 สีแรกเป็นค่าดั้งเดิม (ห้ามแก้ไข ไม่งั้นหมวดหมู่เก่าที่ผู้ใช้สร้างไว้จะเปลี่ยนสีไปเอง)
// 10 สีที่เหลือสร้าง+ตรวจสอบผ่าน dataviz skill (categorical color validator) เพื่อให้แยกแยะง่าย
export const PASTEL_COLORS: PastelColorOption[] = [
  { value: 'pink', label: 'ชมพู', swatchClass: 'bg-pastel-pink-dark', chipClass: 'bg-pastel-pink text-eddy-700', dotClass: 'bg-pastel-pink-dark' },
  { value: 'yellow', label: 'เหลือง', swatchClass: 'bg-pastel-yellow-dark', chipClass: 'bg-pastel-yellow text-eddy-700', dotClass: 'bg-pastel-yellow-dark' },
  { value: 'mint', label: 'มิ้นท์', swatchClass: 'bg-pastel-mint-dark', chipClass: 'bg-pastel-mint text-eddy-700', dotClass: 'bg-pastel-mint-dark' },
  { value: 'blue', label: 'ฟ้า', swatchClass: 'bg-pastel-blue-dark', chipClass: 'bg-pastel-blue text-eddy-700', dotClass: 'bg-pastel-blue-dark' },
  { value: 'peach', label: 'พีช', swatchClass: 'bg-pastel-peach-dark', chipClass: 'bg-pastel-peach text-eddy-700', dotClass: 'bg-pastel-peach-dark' },
  { value: 'lilac', label: 'ม่วงอ่อน', swatchClass: 'bg-pastel-lilac-dark', chipClass: 'bg-pastel-lilac text-eddy-700', dotClass: 'bg-pastel-lilac-dark' },
  { value: 'amber', label: 'อำพัน', swatchClass: 'bg-pastel-amber-dark', chipClass: 'bg-pastel-amber text-eddy-700', dotClass: 'bg-pastel-amber-dark' },
  { value: 'lime', label: 'เขียวมะนาว', swatchClass: 'bg-pastel-lime-dark', chipClass: 'bg-pastel-lime text-eddy-700', dotClass: 'bg-pastel-lime-dark' },
  { value: 'olive', label: 'เขียวมะกอก', swatchClass: 'bg-pastel-olive-dark', chipClass: 'bg-pastel-olive text-eddy-700', dotClass: 'bg-pastel-olive-dark' },
  { value: 'teal', label: 'เขียวมรกต', swatchClass: 'bg-pastel-teal-dark', chipClass: 'bg-pastel-teal text-eddy-700', dotClass: 'bg-pastel-teal-dark' },
  { value: 'sky', label: 'ฟ้าอมเขียว', swatchClass: 'bg-pastel-sky-dark', chipClass: 'bg-pastel-sky text-eddy-700', dotClass: 'bg-pastel-sky-dark' },
  { value: 'indigo', label: 'น้ำเงินอมม่วง', swatchClass: 'bg-pastel-indigo-dark', chipClass: 'bg-pastel-indigo text-eddy-700', dotClass: 'bg-pastel-indigo-dark' },
  { value: 'violet', label: 'ม่วง', swatchClass: 'bg-pastel-violet-dark', chipClass: 'bg-pastel-violet text-eddy-700', dotClass: 'bg-pastel-violet-dark' },
  { value: 'plum', label: 'มัลเบอร์รี่', swatchClass: 'bg-pastel-plum-dark', chipClass: 'bg-pastel-plum text-eddy-700', dotClass: 'bg-pastel-plum-dark' },
  { value: 'coral', label: 'ส้มอมชมพู', swatchClass: 'bg-pastel-coral-dark', chipClass: 'bg-pastel-coral text-eddy-700', dotClass: 'bg-pastel-coral-dark' },
  { value: 'rose', label: 'กุหลาบ', swatchClass: 'bg-pastel-rose-dark', chipClass: 'bg-pastel-rose text-eddy-700', dotClass: 'bg-pastel-rose-dark' },
];

export function getColorOption(color: PastelColor): PastelColorOption {
  return PASTEL_COLORS.find((c) => c.value === color) ?? PASTEL_COLORS[3];
}
