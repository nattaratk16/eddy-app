// บทบาทผู้ใช้ (จาก onboarding) - ใช้กำหนด category พื้นฐาน, ปรับภาษา AI, และบริบทการวิเคราะห์
import type { PastelColor } from './types';

// ตัด 'school' (นักเรียน) ออกไปแล้วก่อนหน้านี้ ตอนนี้แทน 'working' (วัยทำงาน) ด้วย 'teacher' (อาจารย์)
// ตามที่อาจารย์ที่ปรึกษาขอ - ค่าเก่า 'working' ที่เคยบันทึกไว้ใน DB จะไม่ผ่าน isUserRole() อีกต่อไป
// (ระบบจะมองว่า "ยังไม่เลือก role" เหมือนค่า legacy 'school' เดิม ไม่ต้อง migrate ข้อมูล)
// role: 'teacher' เลือกได้อิสระเหมือน 'university' ไม่จำกัดจำนวนคน (รองรับหลายอาจารย์ในระบบเดียวกัน
// เช่น คนละวิชา - ดู app/api/onboarding/route.ts) สิทธิ์จัดการคลาส/กลุ่มจริงๆผูกกับ Group.ownerId
// ของแต่ละกลุ่ม ไม่ใช่ role นี้โดยตรง
export type UserRole = 'university' | 'teacher';

export const ROLE_LABELS: Record<UserRole, string> = {
  university: 'นักศึกษา',
  teacher: 'อาจารย์',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  university: 'เรียน/มหาวิทยาลัย — มีวิชาเรียน งานกลุ่ม ช่วงสอบ midterm/final',
  teacher: 'สอน/ดูแลนักศึกษา — จัดการคลาสเรียน ดูภาระงานนักศึกษาทั้งห้อง มอบหมายงานกลุ่ม',
};

export const ROLE_EMOJI: Record<UserRole, string> = {
  university: '🎓',
  teacher: '🧑‍🏫',
};

// หมวดหมู่ปฏิทินพื้นฐานที่จะสร้างให้อัตโนมัติตามบทบาท
export const ROLE_DEFAULT_CATEGORIES: Record<UserRole, { name: string; color: PastelColor }[]> = {
  university: [
    { name: 'เรียน', color: 'blue' },
    { name: 'งานกลุ่ม/โปรเจกต์', color: 'indigo' },
    { name: 'อ่านหนังสือ', color: 'teal' },
    { name: 'ชมรม/กิจกรรม', color: 'mint' },
    { name: 'ส่วนตัว', color: 'peach' },
  ],
  teacher: [
    { name: 'สอน', color: 'rose' },
    { name: 'ประชุม/งานบริหาร', color: 'amber' },
    { name: 'ตรวจงาน/ให้คะแนน', color: 'indigo' },
    { name: 'วิจัย', color: 'teal' },
    { name: 'ส่วนตัว', color: 'peach' },
  ],
};

// บริบทสำหรับ AI - บอกให้ปรับ "ภาษา" + "สิ่งที่ควรรู้" เกี่ยวกับวัยนี้ เพื่อวางแผน/วิเคราะห์ให้แม่นขึ้น
export const ROLE_AI_CONTEXT: Record<UserRole, string> = {
  university:
    'ผู้ใช้เป็นนักศึกษา — มีช่วง midterm/final ที่ต้องอ่านหนังสือหนักและงานเยอะ มักมีงานกลุ่ม/โปรเจกต์และตารางเรียนที่ยืดหยุ่น; ใช้ภาษาเป็นกันเองแต่ช่วยกระตุ้นการวางแผนล่วงหน้า',
  teacher:
    'ผู้ใช้เป็นอาจารย์ — ดูแลหลายคลาสเรียน มีงานสอน ตรวจงาน ประชุม และดูแลภาระงานของนักศึกษาในความรับผิดชอบ; ใช้ภาษาสุภาพ กระชับ เป็นมืออาชีพ',
};

export function isUserRole(v: unknown): v is UserRole {
  return v === 'university' || v === 'teacher';
}
