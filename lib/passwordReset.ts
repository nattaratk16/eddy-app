/**
 * lib/passwordReset.ts
 * --------------------------------------------------------------
 * ตัวช่วยสร้าง/ตรวจสอบ token ลิงก์ "ลืมรหัสผ่าน" ใช้ร่วมกันระหว่าง
 * app/api/auth/forgot-password และ app/api/auth/reset-password
 * --------------------------------------------------------------
 */
import crypto from 'node:crypto';

/** อายุลิงก์รีเซ็ต - สั้นพอที่จะลดความเสี่ยงถ้าอีเมลหลุด แต่ยังพอมีเวลาเปิดอีเมลจริง */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 ชั่วโมง

/** token ดิบที่ส่งไปในอีเมล/URL - เอนโทรปีสูงพอแล้ว ไม่ต้องใช้ bcrypt (ซึ่งออกแบบมาสำหรับรหัสผ่านที่เดาได้ง่ายกว่านี้มาก) */
export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** hash ไว้เก็บใน DB แทน token ดิบ - กัน token ถูกสวมรอยได้ต่อถ้า DB รั่ว (เทียบ hash ตอนตรวจสอบเสมอ ไม่เทียบ token ตรงๆ) */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
