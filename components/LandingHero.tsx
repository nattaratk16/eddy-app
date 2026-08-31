'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import SkyBackground from '@/components/SkyBackground';
import MascotWave from '@/components/MascotWave';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 210, damping: 22 } },
};

/**
 * ของตกแต่งลอยรอบขอบจอ - จงใจวางไว้ริมซ้าย/ริมขวาเท่านั้น
 * กลางหน้าปล่อยโล่งให้โลโก้กับมาสคอตเป็นพระเอก (แบบเดียวกับ referance.png)
 */
const decor = [
  { c: 'left-[6%] top-[24%]', size: 'h-5 w-5', color: 'bg-brand-yellow', d: 0 },
  { c: 'left-[12%] top-[52%]', size: 'h-3 w-3', color: 'bg-brand-pink', d: 1.1 },
  { c: 'right-[8%] top-[30%]', size: 'h-4 w-4', color: 'bg-accent-300', d: 0.5 },
  { c: 'right-[14%] top-[58%]', size: 'h-3.5 w-3.5', color: 'bg-brand-orange', d: 1.6 },
];

export default function LandingHero() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-white">
      <SkyBackground />

      {decor.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`pointer-events-none absolute ${s.c} ${s.size} ${s.color} rounded-full opacity-60`}
          animate={{ scale: [0.9, 1.2, 0.9], y: [0, -12, 0], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 5, repeat: Infinity, delay: s.d, ease: 'easeInOut' }}
        />
      ))}

      {/* ---------- แถบบนลอย (แคปซูลขาว) ---------- */}
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-20 mx-auto mt-6 flex w-[min(92vw,60rem)] items-center justify-between rounded-full border border-white/80 bg-white/90 px-5 py-2.5 shadow-clay backdrop-blur sm:px-7"
      >
        <span className="flex items-center gap-2">
          <Image src="/mascot/eddy-a-128.png" alt="" width={36} height={40} className="h-8 w-auto" />
          <span className="font-brand text-xl font-semibold tracking-tight text-eddy-600">EDDY</span>
        </span>

        <Link
          href="/login"
          className="rounded-full bg-ink px-5 py-2 font-brand text-sm font-semibold text-white transition-all hover:bg-black active:scale-95 sm:px-6"
        >
          เข้าสู่ระบบ
        </Link>
      </motion.header>

      {/* ---------- กลางหน้า: โลโก้ -> คำอธิบาย -> ปุ่ม (จัดกลางทั้งหมด) ---------- */}
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center justify-center px-5 pt-6 text-center"
      >
        <motion.div variants={item}>
          <Image
            src="/mascot/eddy-logo-640.png"
            alt="EDDY — Plan the date, clear the list, your perfect assist."
            width={640}
            height={678}
            priority
            className="h-auto w-[190px] drop-shadow-[0_12px_24px_rgba(10,76,196,0.16)] sm:w-[230px] lg:w-[260px]"
          />
        </motion.div>

        <motion.p variants={item} className="mt-4 max-w-md font-body text-sm text-ink-soft sm:text-base">
          วางแผนวัน เคลียร์ลิสต์งาน ผู้ช่วยที่สมบูรณ์แบบของคุณ
        </motion.p>

        <motion.div variants={item} className="mt-5">
          <Link
            href="/login"
            className="inline-flex items-center rounded-full bg-ink px-10 py-3.5 font-brand text-base font-semibold text-white shadow-clay-pop transition-all duration-200 hover:scale-[1.03] hover:bg-black active:scale-95"
          >
            Get Started
          </Link>
        </motion.div>
      </motion.section>

      {/* ---------- มาสคอตโผล่ขึ้นมาจากขอบล่างของจอ ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 mx-auto w-[min(96vw,780px)]"
      >
        <MascotWave />
      </motion.div>
    </main>
  );
}
