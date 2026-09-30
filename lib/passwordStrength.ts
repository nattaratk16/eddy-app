export type PasswordStrengthLevel = 'weak' | 'medium' | 'strong';

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  label: string;
}

// อักขระพิเศษตามมาตรฐานสากลทั่วไป (OWASP ASVS ใช้ชุดนี้เป็นตัวอย่างเหมือนกัน)
const SPECIAL_CHARS_RE = /[!@#$%^&*()\-_=+{}[\]|\\:;"'<>,.?/~`]/;

/**
 * ให้คะแนนความแข็งแรงของรหัสผ่าน อิงมาตรฐานสากล 4 กลุ่มอักขระ (a-z, A-Z, 0-9, อักขระพิเศษ) + ความยาว
 * ไม่เช็คกับ dictionary/รายชื่อรหัสผ่านที่รั่วไหล เพราะรันฝั่ง client ไม่ควรโหลด wordlist ใหญ่มาด้วย
 *
 * คะแนนเต็ม 6: กลุ่มอักขระ (0-4) + โบนัสความยาว (0=สั้นกว่า 8, 1=8-11 ตัว, 2=12 ตัวขึ้นไป)
 * คืน null ถ้ายังไม่ได้พิมพ์อะไรเลย (ไม่ต้องโชว์หลอดวัด)
 */
export function getPasswordStrength(password: string): PasswordStrengthResult | null {
  if (!password) return null;

  let categories = 0;
  if (/[a-z]/.test(password)) categories++;
  if (/[A-Z]/.test(password)) categories++;
  if (/[0-9]/.test(password)) categories++;
  if (SPECIAL_CHARS_RE.test(password)) categories++;

  const lengthScore = password.length >= 12 ? 2 : password.length >= 8 ? 1 : 0;
  const score = categories + lengthScore;

  if (score <= 2) return { level: 'weak', label: 'คาดเดาง่าย' };
  if (score <= 4) return { level: 'medium', label: 'ปานกลาง' };
  return { level: 'strong', label: 'แข็งแรง' };
}
