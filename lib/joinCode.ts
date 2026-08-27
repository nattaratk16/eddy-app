/**
 * รหัสเข้าร่วมกลุ่ม
 * ใช้ตัวอักษร/ตัวเลขที่อ่านผิดยาก (ตัด 0 O 1 I L ออก) เพราะรหัสนี้ต้องพิมพ์ต่อ/บอกปากเปล่าได้
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

export function generateJoinCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** ผู้ใช้พิมพ์มาแบบไหนก็ได้ -> ตัวพิมพ์ใหญ่ ไม่มีช่องว่าง/ขีด */
export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function isValidJoinCode(code: string): boolean {
  return new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`).test(code);
}
