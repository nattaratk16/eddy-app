import type { Metadata } from 'next';
import { Mali, Noto_Sans_Thai } from 'next/font/google';
import Providers from './providers';
import './globals.css';

// Mali: ฟอนต์หัวเรื่องทรงกลม friendly รองรับภาษาไทยเต็มรูปแบบ - ใช้เป็นซิกเนเจอร์ของแบรนด์ EDDY
const mali = Mali({
  subsets: ['latin', 'thai'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// Noto Sans Thai: ฟอนต์เนื้อหาที่อ่านง่าย รองรับภาษาไทยครบทุกวรรณยุกต์
const notoSansThai = Noto_Sans_Thai({
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
      <body className={`${mali.variable} ${notoSansThai.variable} font-body`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
