import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import Providers from './providers';
import GlowBackground from '@/components/backgrounds/GlowBackground';
import './globals.css';

// IBM Plex Sans Thai: ฟอนต์โมเดิร์นทันสมัย อ่านง่าย รองรับภาษาไทยครบทุกวรรณยุกต์
// ใช้ทั้งแอป - น้ำหนักหนา (600/700) สำหรับหัวเรื่อง, น้ำหนักปกติ (400/500) สำหรับเนื้อหา
const plexDisplay = IBM_Plex_Sans_Thai({
  subsets: ['latin', 'thai'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const plexBody = IBM_Plex_Sans_Thai({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
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
      <body className={`${plexDisplay.variable} ${plexBody.variable} font-body`}>
        <GlowBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
