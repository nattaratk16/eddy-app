import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai, Mitr } from 'next/font/google';
import Providers from './providers';
import GlowBackground from '@/components/backgrounds/GlowBackground';
import './globals.css';

// IBM Plex Sans Thai: ฟอนต์โมเดิร์นทันสมัย อ่านง่าย รองรับภาษาไทยครบทุกวรรณยุกต์
// ใช้ทั้งแอป - น้ำหนักหนา (600/700) สำหรับหัวเรื่อง, น้ำหนักปกติ (400/500) สำหรับเนื้อหา
//
// เดิมเรียก IBM_Plex_Sans_Thai สองครั้ง (display กับ body) ทั้งที่เป็นฟอนต์ตระกูลเดียวกัน
// next/font จึงโหลดไฟล์ .woff2 ของน้ำหนัก 500/600/700 มาซ้ำสองชุด และประกาศ @font-face ซ้ำ
// รวมเหลือชุดเดียวที่มีครบ 400-700 แล้วให้ font-display กับ font-body ใน Tailwind ชี้มาที่ตัวแปรเดียวกัน
const plex = IBM_Plex_Sans_Thai({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

// ฟอนต์แบรนด์: กลมมนสนุก เข้ากับมาสคอต 3D ใช้เฉพาะโลโก้/หัวเรื่องใหญ่บนหน้าแรก
// (เนื้อหาทั่วไปยังเป็น IBM Plex Sans Thai เพราะอ่านยาวๆ สบายตากว่า)
const brandFont = Mitr({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600'], // Mitr มีหนักสุดที่ 600
  variable: '--font-brand',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EDDY — ผู้ช่วยจัดตารางชีวิตของคุณ',
  description: 'AI assistant ที่ช่วยจัดตารางชีวิตประจำวัน งาน และสิ่งที่ต้องทำ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${plex.variable} ${brandFont.variable} font-body`}>
        <GlowBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
