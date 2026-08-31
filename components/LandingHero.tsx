'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import SkyBackground from '@/components/SkyBackground';
import MascotWave from '@/components/MascotWave';

// เข้าฉากแบบไล่ทีละชิ้น (stagger)
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

/**
 * จุดสีลอยรอบหน้าจอ - เหลือ 3 จุดพอเป็นบรรยากาศ
 * (เดิมมี 7 จุดกระจายทั่วหน้า ซึ่งแย่งสายตากับโลโก้และมาสคอต)
 */
const dots = [
  { c: 'left-[8%] top-[18%]', size: 'h-4 w-4', color: 'bg-brand-yellow', d: 0 },
  { c: 'right-[10%] top-[26%]', size: 'h-3 w-3', color: 'bg-brand-pink', d: 0.9 },
  { c: 'left-[12%] bottom-[20%]', size: 'h-3.5 w-3.5', color: 'bg-accent-300', d: 1.6 },
];

export default function LandingHero() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-white px-5 py-10 sm:px-10">
      <SkyBackground />

      {/* แสงเรืองไล่สีอันเดียว วางเยื้องไปทางขวา ไม่ให้ความสนใจไปกองกลางหน้า */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-[8%] top-1/4 h-80 w-80 rounded-full bg-accent-300/30 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {dots.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`pointer-events-none absolute ${s.c} ${s.size} ${s.color} rounded-full opacity-60`}
          animate={{ scale: [0.9, 1.2, 0.9], y: [0, -12, 0], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 5, repeat: Infinity, delay: s.d, ease: 'easeInOut' }}
        />
      ))}

      {/* เนื้อหา: 2 คอลัมน์บนจอกว้าง - ข้อความซ้าย มาสคอตขวา
          เดิมวางซ้อนกันเป็นแถวเดียวกลางหน้า เลยดูกระจุกและเหลือที่ว่างสองข้างเยอะ */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col items-center justify-center gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16"
      >
        {/* ---- ซ้าย: โลโก้ + ปุ่ม ---- */}
        <div className="flex max-w-md flex-col items-center text-center lg:items-start lg:text-left">
          {/* โลโก้ทำหน้าที่เป็นทั้งชื่อแบรนด์และสโลแกนในตัว จึงไม่ต้องมีข้อความซ้ำอีก */}
          <motion.div variants={item}>
            <Image
              src="/mascot/eddy-logo-640.png"
              alt="EDDY — Plan the date, clear the list, your perfect assist."
              width={640}
              height={678}
              priority
              className="h-auto w-[260px] drop-shadow-[0_12px_24px_rgba(10,76,196,0.18)] sm:w-[320px]"
            />
          </motion.div>

          <motion.p variants={item} className="mt-6 font-body text-sm text-ink-soft sm:text-base">
            วางแผนวัน เคลียร์ลิสต์งาน ผู้ช่วยที่สมบูรณ์แบบของคุณ
          </motion.p>

          <motion.div variants={item} className="mt-8">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-8 py-3.5 font-brand text-base font-semibold text-white shadow-clay-pop transition-all duration-200 hover:scale-[1.03] hover:brightness-110 active:scale-95"
            >
              Get Started
              <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* ---- ขวา: มาสคอต ---- */}
        <motion.div variants={item} className="w-[min(88vw,460px)] lg:w-[46%] lg:max-w-[520px]">
          <MascotWave />
        </motion.div>
      </motion.div>
    </main>
  );
}
