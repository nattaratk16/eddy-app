const crypto = require('crypto');
const os = require('os');
const path = require('path');

/**
 * โปรเจกต์นี้วางอยู่บนไดรฟ์ E: ซึ่งเป็นฮาร์ดดิสก์ต่อผ่าน USB (ASMT 2115)
 * การอ่านไฟล์เล็กๆ จำนวนมากบน USB ช้ากว่า NVMe ภายในเครื่องราว 30 เท่า
 * (วัดจริง: อ่าน 400 ไฟล์ = 1844ms บน E: เทียบกับ 62ms บน C:)
 *
 * webpack ต้องอ่าน/เขียน cache ก้อนใหญ่ (หลักร้อย MB) ทุกครั้งที่เริ่ม dev server
 * ถ้าปล่อยให้ cache อยู่ใน .next/cache บน USB ตัวมันเองจะกลายเป็นคอขวด
 * เลยย้าย cache ไปไว้บนไดรฟ์ระบบ (temp) เมื่อพบว่าโปรเจกต์อยู่คนละไดรฟ์กัน
 *
 * ตั้ง NEXT_WEBPACK_CACHE_DIR เองได้ถ้าอยากกำหนดที่เก็บ / ตั้งเป็น 'off' เพื่อปิดพฤติกรรมนี้
 */
function fastCacheDir() {
  const override = process.env.NEXT_WEBPACK_CACHE_DIR;
  if (override) return override === 'off' ? null : override;

  const tmp = os.tmpdir();
  // เทียบเฉพาะกรณีที่ path มี drive letter (Windows) — บน Linux/mac จะ parse ได้ค่าว่างทั้งคู่ แล้วข้ามไป
  const projectDrive = path.parse(process.cwd()).root.toLowerCase();
  const tmpDrive = path.parse(tmp).root.toLowerCase();
  if (!projectDrive || projectDrive === tmpDrive) return null;

  // ใส่ hash ของ path เต็มด้วย ไม่งั้นโปรเจกต์คนละที่ที่ชื่อโฟลเดอร์เหมือนกัน
  // (เช่น git worktree หรือสำเนาบน C:) จะใช้ cache ก้อนเดียวกันแล้วตีกัน
  const key = crypto.createHash('sha1').update(process.cwd()).digest('hex').slice(0, 8);
  return path.join(tmp, 'nextjs-cache', `${path.basename(process.cwd())}-${key}`);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { dev }) => {
    const dir = dev && fastCacheDir();
    if (dir && config.cache && config.cache.type === 'filesystem') {
      config.cache.cacheDirectory = dir;
    }
    return config;
  },
};

module.exports = nextConfig;
