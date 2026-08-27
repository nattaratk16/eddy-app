// บทบาทผู้ใช้ (จาก onboarding) - ใช้กำหนด category พื้นฐาน, ปรับภาษา AI, และบริบทการวิเคราะห์
import type { PastelColor } from './types';

export type UserRole = 'school' | 'university' | 'working';

export const ROLE_LABELS: Record<UserRole, string> = {
  school: 'นักเรียน',
  university: 'นักศึกษา',
  working: 'วัยทำงาน',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  school: 'มัธยม/ประถม — มีตารางเรียนประจำ การบ้าน กิจกรรม',
  university: 'มหาวิทยาลัย — มีวิชาเรียน งานกลุ่ม ช่วงสอบ midterm/final',
  working: 'ทำงานประจำ/อิสระ — เน้นงาน ประชุม สมดุลชีวิต',
};

export const ROLE_EMOJI: Record<UserRole, string> = {
  school: '🎒',
  university: '🎓',
  working: '💼',
};

// หมวดหมู่ปฏิทินพื้นฐานที่จะสร้างให้อัตโนมัติตามบทบาท
export const ROLE_DEFAULT_CATEGORIES: Record<UserRole, { name: string; color: PastelColor }[]> = {
  school: [
    { name: 'เรียน', color: 'blue' },
    { name: 'การบ้าน', color: 'amber' },
    { name: 'กิจกรรม', color: 'mint' },
    { name: 'ส่วนตัว', color: 'peach' },
    { name: 'ครอบครัว', color: 'rose' },
  ],
  university: [
    { name: 'เรียน', color: 'blue' },
    { name: 'งานกลุ่ม/โปรเจกต์', color: 'indigo' },
    { name: 'อ่านหนังสือ', color: 'teal' },
    { name: 'ชมรม/กิจกรรม', color: 'mint' },
    { name: 'ส่วนตัว', color: 'peach' },
  ],
  working: [
    { name: 'งาน', color: 'rose' },
    { name: 'ประชุม', color: 'amber' },
    { name: 'ส่วนตัว', color: 'peach' },
    { name: 'ออกกำลังกาย', color: 'mint' },
    { name: 'ครอบครัว', color: 'lilac' },
  ],
};

// บริบทสำหรับ AI - บอกให้ปรับ "ภาษา" + "สิ่งที่ควรรู้" เกี่ยวกับวัยนี้ เพื่อวางแผน/วิเคราะห์ให้แม่นขึ้น
export const ROLE_AI_CONTEXT: Record<UserRole, string> = {
  school:
    'ผู้ใช้เป็นนักเรียน — ใช้ภาษาเป็นกันเอง เข้าใจง่าย ให้กำลังใจ; มีช่วงสอบกลางภาค/ปลายภาคที่การบ้านและการอ่านหนังสือจะหนักเป็นพิเศษ และมักมีตารางเรียนประจำในแต่ละวัน',
  university:
    'ผู้ใช้เป็นนักศึกษา — มีช่วง midterm/final ที่ต้องอ่านหนังสือหนักและงานเยอะ มักมีงานกลุ่ม/โปรเจกต์และตารางเรียนที่ยืดหยุ่น; ใช้ภาษาเป็นกันเองแต่ช่วยกระตุ้นการวางแผนล่วงหน้า',
  working:
    'ผู้ใช้เป็นวัยทำงาน — ใช้ภาษาสุภาพ กระชับ เป็นมืออาชีพ; เน้นงาน ประชุม เดดไลน์ และสมดุลชีวิต-งาน (work-life balance)',
};

export function isUserRole(v: unknown): v is UserRole {
  return v === 'school' || v === 'university' || v === 'working';
}
