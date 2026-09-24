/**
 * lib/rateLimit.ts
 * --------------------------------------------------------------
 * ตัวจำกัดจำนวนครั้ง in-memory ง่ายๆ กัน brute-force เดารหัสผ่าน/สแปมสมัครบัญชี
 * เก็บ state ไว้ในหน่วยความจำของ process เดียว - พอสำหรับ beta ขนาดเล็กที่รันบน instance เดียว
 * ถ้าจะ deploy แบบ scale-out หลาย instance พร้อมกันจริงจัง (เช่น Vercel ที่ auto-scale) ควรย้ายไป
 * Upstash Redis หรือเทียบเท่าแทน เพราะแต่ละ instance จะนับแยกกันคนละ state ไม่ใช่ตัวเลขรวม
 * --------------------------------------------------------------
 */
interface Entry {
  count: number;
  resetAt: number;
}

const hits = new Map<string, Entry>();

// กันตารางโตไม่มีที่สิ้นสุดถ้ามีคนยิงด้วย key สุ่มจำนวนมาก (เช่น ปลอม IP/อีเมลต่างกันทุกครั้ง)
// ยอมรีเซ็ตทุก key พร้อมกันถ้าเต็มจริงๆ - ง่ายกว่า LRU และไม่กระทบการใช้งานปกติที่ไม่ได้ถูกโจมตี
const MAX_TRACKED_KEYS = 5000;

/** true = ยังทำต่อได้, false = เกินจำนวนครั้งที่กำหนดในหน้าต่างเวลานี้แล้ว */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    if (hits.size >= MAX_TRACKED_KEYS) hits.clear();
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

/** ดึง IP ผู้เรียกจาก header ที่ reverse proxy (เช่น Vercel) ใส่ให้ - คืน "unknown" ถ้าไม่มีเลย */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
