/**
 * lib/avatar.ts
 * --------------------------------------------------------------
 * อวาตาร์การ์ตูนจาก DiceBear (https://www.dicebear.com) - เลือกได้แทนรูปจริง ไม่ต้องอัปโหลด/เก็บไฟล์เอง
 * ภาพคือ URL ที่คำนวณจาก style+seed ล้วนๆ (ไม่มี object storage ในโปรเจกต์นี้) seed เดียวกันได้หน้าตา
 * เดิมเสมอ จึงเก็บแค่ style+seed ใน DB แล้วค่อย build URL ตอน render (ดู prisma/schema.prisma)
 * --------------------------------------------------------------
 */

/** สไตล์ที่คัดมาให้ดูเป็นตัวการ์ตูนน่ารักเข้ากับธีม EDDY (DiceBear มีสไตล์อื่นอีกเยอะแต่บางสไตล์ดูจริงจัง/ไม่เข้าธีม) */
export const AVATAR_STYLES = [
  { value: 'adventurer', label: 'นักผจญภัย' },
  { value: 'big-smile', label: 'ยิ้มกว้าง' },
  { value: 'fun-emoji', label: 'สดใส' },
  { value: 'notionists', label: 'มินิมอล' },
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number]['value'];

const VALID_STYLES = new Set<string>(AVATAR_STYLES.map((s) => s.value));

export function isValidAvatarStyle(style: string): style is AvatarStyle {
  return VALID_STYLES.has(style);
}

const DICEBEAR_VERSION = '9.x';

/** URL รูป SVG จาก DiceBear - ใช้ <img> ธรรมดา ไม่ใช้ next/image (เลี่ยงต้องเปิด dangerouslyAllowSVG) */
export function buildDicebearUrl(style: string, seed: string): string {
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

/** สุ่ม seed ใหม่ - ใช้ตอนผู้ใช้กด "สุ่มหน้าใหม่" ในตัวเลือกอวาตาร์ */
export function randomAvatarSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
