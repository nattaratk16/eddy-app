'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import SkyBackground from '@/components/SkyBackground';
import EddyMascot from '@/components/EddyMascot';

/**
 * เชลล์ split-screen ใช้ร่วมกันทั้ง 3 หน้า (login / register / onboarding) แทนที่แพทเทิร์นเดิม
 * ที่แต่ละหน้าก็อปโค้ด <main><SkyBackground/><การ์ดกลางจอ> เหมือนกันเป๊ะ - อิงจากภาพอ้างอิงที่ผู้ใช้ส่งมา
 * (แบบที่สนใจ.jpg): ฝั่งซ้ายภาพประกอบสีสัน ฝั่งขวาฟอร์มเรียบๆ
 *
 * มือถือ (ต่ำกว่า lg) ซ่อนฝั่งภาพประกอบไปเลย - จอแคบไม่พอให้ทั้งสองฝั่งอยู่ได้สวย และภาพอ้างอิง
 * เองก็เป็นแพทเทิร์นสำหรับจอกว้างอยู่แล้ว แสดงแค่โลโก้เล็กๆ + topRight slot แทน
 */

const SHAPES = [
  { c: 'left-[10%] top-[18%]', size: 'h-14 w-14', color: 'bg-accent-300', shape: 'rounded-full', anim: 'animate-float' },
  { c: 'right-[14%] top-[12%]', size: 'h-10 w-10', color: 'bg-pastel-mint-dark', shape: 'rounded-clay', anim: 'animate-floatSlow' },
  { c: 'left-[16%] bottom-[30%]', size: 'h-8 w-8', color: 'bg-brand-orange', shape: 'rounded-full', anim: 'animate-floatSlow' },
  { c: 'right-[10%] bottom-[22%]', size: 'h-9 w-9', color: 'bg-pastel-plum-dark', shape: 'rounded-clay', anim: 'animate-float' },
  { c: 'left-[42%] top-[10%]', size: 'h-6 w-6', color: 'bg-eddy-300', shape: 'rounded-t-full', anim: 'animate-float' },
];

interface AuthLayoutProps {
  children: ReactNode;
  /** มุมขวาบนฝั่งฟอร์ม - ลิงก์ "ยังไม่มีบัญชี? สมัครสมาชิก" หรือปุ่ม "ข้ามไปก่อน" ของ onboarding */
  topRight?: ReactNode;
  /** onboarding เนื้อหากว้างกว่า login/register (การ์ดเลือกบทบาท, กริดสอนใช้ 2 คอลัมน์) */
  maxWidth?: string;
}

export default function AuthLayout({ children, topRight, maxWidth = 'max-w-sm' }: AuthLayoutProps) {
  return (
    // พื้นหลังเทาอ่อนรอบนอก + การ์ดขอบมนใหญ่คลุมทั้งสองฝั่ง - ให้ความรู้สึก "อยู่ในกรอบ" แบบภาพต้นแบบ
    // แทนที่จะเต็มจอไปเลย (เดิม) ไม่งั้นมุมโค้งและเงาของการ์ดจะไม่มีที่ให้เห็น
    <div className="flex min-h-screen items-center justify-center bg-[#EDEFF2] p-3 sm:p-6 lg:p-10">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-clay-pop lg:h-[calc(100vh-5rem)] lg:max-h-[840px] lg:flex-row">
      {/* ---------- ฝั่งภาพประกอบ - จอกว้างเท่านั้น ---------- */}
      <div className="relative hidden overflow-hidden bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-[#F3F9FF] lg:flex lg:h-full lg:w-[45%] lg:flex-shrink-0 lg:flex-col">
        <SkyBackground />

        {SHAPES.map((s, i) => (
          <span key={i} className={`pointer-events-none absolute ${s.c} ${s.size} ${s.color} ${s.shape} ${s.anim} shadow-clay-sm opacity-90`} />
        ))}

        {/* เครื่องบินกระดาษ - ลอยเบาๆ พร้อมโยกซ้ายขวา */}
        <motion.div
          className="pointer-events-none absolute right-[22%] top-[22%] text-brand-orange"
          animate={{ y: [0, -14, 0], x: [0, 10, 0], rotate: [-8, 4, -8] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Send size={30} className="rotate-45" fill="currentColor" />
        </motion.div>

        <Link href="/" className="relative z-10 mt-8 pl-8">
          <Image src="/mascot/eddy-wordmark.png" alt="EDDY" width={900} height={411} className="h-9 w-auto" priority />
        </Link>

        <div className="relative z-10 flex flex-1 items-end justify-center gap-1 pb-8">
          <EddyMascot character="eddy" mood="happy" size={240} />
          <EddyMascot character="nova" mood="think" size={240} />
        </div>
      </div>

      {/* ---------- ฝั่งฟอร์ม ---------- */}
      <div className="relative flex flex-1 flex-col lg:h-full lg:overflow-y-auto">
        {/* หัวกระทัดรัดสำหรับมือถือ (แทนฝั่งภาพประกอบที่ซ่อนไป) */}
        <div className="flex items-center justify-between px-5 pt-5 lg:hidden">
          <Link href="/">
            <Image src="/mascot/eddy-wordmark.png" alt="EDDY" width={900} height={411} className="h-6 w-auto" priority />
          </Link>
          {topRight}
        </div>

        {/* topRight บนจอกว้าง - ลอยมุมขวาบนของฝั่งฟอร์ม */}
        {topRight && <div className="hidden justify-end px-8 pt-6 lg:flex">{topRight}</div>}

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10">
          <div className={`w-full ${maxWidth}`}>{children}</div>
        </div>
      </div>
      </div>
    </div>
  );
}
