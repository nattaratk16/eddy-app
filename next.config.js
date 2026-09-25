/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /*
   * ตั้ง BUILD_DIST_DIR เพื่อให้ build เขียนลงโฟลเดอร์อื่นแทน .next
   *
   *   BUILD_DIST_DIR=.next-check npx next build
   *
   * มีไว้เพราะ `next build` เฉยๆ จะล้าง .next แล้วเขียนไฟล์ production ทับ
   * ถ้าตอนนั้น dev server รันอยู่ มันจะหาไฟล์ของตัวเองไม่เจอทันทีและตอบ Internal Server Error
   * (dev server ไม่ได้ crash แต่กู้เองไม่ได้ ต้อง npm run dev:clean สตาร์ทใหม่)
   *
   * เวลาจะ build เพื่อ "ตรวจว่าโค้ดคอมไพล์ผ่านไหม" ให้ใส่ตัวแปรนี้เสมอ
   * ส่วนการ build จริงตอน deploy ไม่ต้องใส่ - ปล่อยให้ลง .next ตามปกติ
   */
  ...(process.env.BUILD_DIST_DIR ? { distDir: process.env.BUILD_DIST_DIR } : {}),

  // รูปโปรไฟล์จาก Google OAuth (AUD-23) - ต้อง allowlist โดเมนก่อนถึงจะใช้ next/image ได้
  // (เดิมใช้ <img> ธรรมดาเพราะยังไม่ได้ config ตรงนี้ ทำให้ไม่ได้ optimize/lazy-load เลย)
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.googleusercontent.com' }],
  },

  // Security header พื้นฐาน (AUD-05) - ไม่มีอะไรตั้งไว้เลยมาก่อน ก่อนหน้านี้ปล่อยให้ Next.js default ทั้งหมด
  // ยังไม่ใส่ CSP เต็มรูปแบบ เพราะต้อง allowlist โดเมนของ Google OAuth/Gemini ให้ครบก่อน ไม่งั้นจะพังฟีเจอร์อื่น
  // (ทำทีหลังตอนใกล้ production เต็มรูปแบบ) พวกนี้ปลอดภัยที่จะใส่ตรงๆ ได้เลยไม่กระทบอะไร
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
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
