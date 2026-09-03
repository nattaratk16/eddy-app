/**
 * lib/categoryKind.ts
 * --------------------------------------------------------------
 * "วิชาการ" (academic) กับ "ไม่ใช่วิชาการ" (non_academic) ของหมวดหมู่ปฏิทิน
 * ใช้แยกภาระงานของสมาชิกกลุ่มในกราฟภาระงาน (WorkloadPanel)
 *
 * เดาจากชื่อหมวดหมู่ตอนสร้างเท่านั้น (ดู POST /api/categories) - ผู้ใช้แก้เองได้เสมอ
 * ผ่าน CategoryManager เพราะคำเดาเป็น heuristic ล้วนๆ ไม่ได้เรียก AI และเดาผิดได้
 * (เช่น "งานอดิเรก" ไม่มีคำในลิสต์ -> ได้ non_academic ทั้งที่บางคนอาจมองว่าเกี่ยวกับเรียน)
 * --------------------------------------------------------------
 */

export type CategoryKind = 'academic' | 'non_academic';

export const CATEGORY_KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'academic', label: 'วิชาการ' },
  { value: 'non_academic', label: 'ไม่ใช่วิชาการ' },
];

export function isCategoryKind(value: unknown): value is CategoryKind {
  return value === 'academic' || value === 'non_academic';
}

// คำที่ค่อนข้างเฉพาะเจาะจงกับเรื่องเรียน/การศึกษา - ตรวจแบบ substring ไม่สนตัวพิมพ์เล็ก-ใหญ่
// ตั้งใจเลี่ยงคำกำกวมอย่าง "งาน" เดี่ยวๆ (เป็นได้ทั้งงานที่ได้รับมอบหมายในวิชาและงานประจำ)
const ACADEMIC_KEYWORDS = [
  'เรียน', 'วิชา', 'การบ้าน', 'สอบ', 'ปริญญา', 'มหาวิทยาลัย', 'มหาลัย', "มหา'ลัย",
  'คลาส', 'บรรยาย', 'สัมมนา', 'ฝึกงาน', 'ห้องเรียน', 'ติวหนังสือ', 'ติวเตอร์',
  'นักเรียน', 'นักศึกษา', 'โรงเรียน', 'ป.ตรี', 'ป.โท', 'ปวช', 'ปวส', 'วิทยานิพนธ์',
  'lecture', 'class', 'course', 'study', 'studies', 'homework', 'assignment',
  'exam', 'quiz', 'thesis', 'seminar', 'university', 'college', 'school',
  'academic', 'capstone',
];

/** เดาว่าหมวดหมู่ชื่อนี้เป็นวิชาการหรือไม่ - ใช้ตอนสร้างหมวดหมู่ใหม่เท่านั้น */
export function guessCategoryKind(name: string): CategoryKind {
  const lower = name.toLowerCase();
  return ACADEMIC_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase())) ? 'academic' : 'non_academic';
}
