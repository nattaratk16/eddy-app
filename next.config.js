/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

/*
 * เคยมี webpack.cache.cacheDirectory ย้าย cache ไปไว้บนไดรฟ์ระบบตรงนี้
 * เขียนไว้ตอนโปรเจกต์อยู่บนไดรฟ์ E: ซึ่งเป็นฮาร์ดดิสก์ต่อ USB (อ่านไฟล์เล็กๆ ช้ากว่า NVMe ~30 เท่า)
 * ตอนนี้โปรเจกต์ย้ายมาอยู่ D: ซึ่งเป็นพาร์ทิชันบน NVMe ตัวเดียวกับ C: แล้ว จึงไม่ได้เร็วขึ้นอีกต่อไป
 * แถมยังมีผลเสีย 2 ข้อ เลยเอาออก:
 *   1. cache ก้อน ~180 MB ไปกองใน %TEMP% ซึ่ง Windows (Storage Sense / Disk Cleanup) ลบทิ้งได้เอง
 *      พอโดนลบ dev server ต้องคอมไพล์ใหม่ทั้งโปรเจกต์ กลายเป็น "อยู่ดีๆ ก็ช้า" แบบไม่มีสาเหตุให้เห็น
 *   2. การมี webpack config อยู่ทำให้เปิด Turbopack ไม่ได้ (Next เตือนแล้วข้าม config นี้ไป)
 * ถ้าย้ายโปรเจกต์กลับไปอยู่บนไดรฟ์ที่ช้ากว่าไดรฟ์ระบบอีก ค่อยเอาโค้ดเดิมกลับมาจาก git history
 */

module.exports = nextConfig;
