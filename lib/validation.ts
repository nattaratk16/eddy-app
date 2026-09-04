/**
 * lib/validation.ts
 * --------------------------------------------------------------
 * กฎตรวจสอบ username/รหัสผ่าน/อีเมล ที่ใช้ร่วมกันระหว่างสมัครสมาชิก
 * (app/api/auth/register) และแก้ไขโปรไฟล์ (app/api/profile) - แยกมาไว้
 * ที่เดียวกันไม่ให้กฎเพี้ยนกันระหว่างสองจุด (เช่น username ที่สมัครผ่าน
 * ได้แบบหนึ่งแต่ไปตันตอนแก้ในหน้าโปรไฟล์อีกแบบ)
 * --------------------------------------------------------------
 */
import dns from 'node:dns/promises';

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export const MIN_PASSWORD_LENGTH = 8;

/** อย่างน้อย 8 ตัว + มีตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว (กันรหัสผ่านตัวเลขล้วนแบบ "12345678") */
export function isStrongPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

// เข้มงวดกว่า type="email" ของเบราว์เซอร์เล็กน้อย (กันเคสหลุดๆ เช่นมีช่องว่างหรือไม่มีจุดในโดเมน)
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * เช็คว่าโดเมนหลัง @ มี MX record จริง - พอบอกได้ว่าโดเมนนี้มีเซิร์ฟเวอร์รับอีเมลอยู่จริง
 * ("gmial.com" สมัครไม่ได้เพราะโดเมนนี้ไม่มี MX เลย)
 *
 * นี่ไม่ใช่การยืนยันว่ากล่องอีเมลนั้นมีอยู่จริง (ต้องส่งอีเมลไปให้กดยืนยันถึงจะรู้แน่ - โปรเจกต์นี้
 * ยังไม่มีระบบส่งอีเมล) แค่กันสมัครด้วยโดเมนที่ไม่มีทางรับอีเมลได้เลยตั้งแต่ต้น
 */
export async function domainHasMx(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    // โดเมนไม่มีอยู่จริง / ไม่มี record เลย -> ถือว่าไม่ผ่าน
    if (code === 'ENOTFOUND' || code === 'ENODATA') return false;
    // ปัญหาอื่น (DNS resolver เราเองมีปัญหาชั่วคราว, timeout) - ไม่ควรเอาไปลงโทษผู้ใช้
    return true;
  }
}
