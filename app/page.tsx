import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import LandingHero from '@/components/LandingHero';

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  // เลือกไฟล์มาสคอตให้ถูกตั้งแต่ฝั่งเซิร์ฟเวอร์ เพื่อไม่ให้เบราว์เซอร์โหลดทั้ง .webp และ .webm
  // (Safari เล่น VP9+alpha ใน WebM ไม่ได้ ต้องใช้ animated WebP แทน — ดูหมายเหตุใน MascotWave)
  // headers() ทำให้หน้านี้เป็น dynamic แต่ auth() ด้านบนทำให้เป็น dynamic อยู่แล้ว จึงไม่มีต้นทุนเพิ่ม
  const ua = headers().get('user-agent') ?? '';
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);

  return <LandingHero isSafari={isSafari} />;
}
