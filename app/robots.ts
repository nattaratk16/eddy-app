import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.eddyth.online';

// Disallow ทุกหน้าหลังล็อกอิน (ตรงกับ matcher ใน middleware.ts + หน้าอื่นในกลุ่ม (app) ที่เช็ค
// session เองฝั่งเซิร์ฟเวอร์) และ /api/* ทั้งหมด - เหลือแค่หน้าสาธารณะให้ Google เก็บ
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard',
        '/calendar',
        '/todo',
        '/groups',
        '/profile',
        '/settings',
        '/onboarding',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
