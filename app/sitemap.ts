import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.eddyth.online';

// เฉพาะหน้าสาธารณะ (ไม่ต้องล็อกอิน) - ตรงกับ allow list ใน robots.ts
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
