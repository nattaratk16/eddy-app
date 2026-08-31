'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import SkyBackground from '@/components/SkyBackground';
import Image from 'next/image';

// เข้าฉากแบบไล่ทีละชิ้น (stagger)
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

// ตำแหน่ง+ดีเลย์ของประกายวิบวับ
const sparkles = [
  { c: 'left-[16%] top-[22%]', size: 22, d: 0 },
  { c: 'right-[18%] top-[28%]', size: 16, d: 0.6 },
  { c: 'left-[24%] bottom-[24%]', size: 18, d: 1.2 },
  { c: 'right-[22%] bottom-[30%]', size: 24, d: 0.35 },
  { c: 'left-[46%] top-[12%]', size: 14, d: 0.9 },
];

export default function LandingHero() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-white px-4 py-10">
      <SkyBackground />

      {/* แสงเรืองไล่สี (aurora glow) เคลื่อนไหวช้าๆ */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-eddy-300/40 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.6, 0.35], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-accent-300/30 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.55, 0.3], x: [0, -30, 0], y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ประกายวิบวับ */}
      {sparkles.map((s, i) => (
        <motion.div
          key={i}
          aria-hidden
          className={`pointer-events-none absolute ${s.c} text-eddy-400`}
          animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.25, 1, 0.25], rotate: [0, 90, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: s.d, ease: 'easeInOut' }}
        >
          <Sparkles size={s.size} fill="currentColor" />
        </motion.div>
      ))}

      {/* เนื้อหา */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex max-w-2xl flex-col items-center text-center"
      >
        {/* โลโก้ */}
        <motion.div variants={item} className="mb-5 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-clay-sm bg-ink shadow-clay">
            <Sparkles size={20} className="text-white" fill="currentColor" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-ink">EDDY</span>
        </motion.div>

        {/* badge */}
        <motion.span
          variants={item}
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-4 py-1.5 font-body text-sm text-ink-soft shadow-clay-sm backdrop-blur"
        >
          <Sparkles size={14} className="text-eddy-500" /> ขับเคลื่อนด้วย Gemini AI
        </motion.span>

        {/* มาสคอตคู่ - หน้าแรกคือที่แรกที่คนเห็น เลยให้ตัวจริงขึ้นเต็มตัวแทนไอคอน */}
        <motion.div variants={item} className="mb-6">
          <Image
            src="/mascot/eddy-duo-512.png"
            alt="เอ็ดดี้และผู้ช่วย"
            width={512}
            height={351}
            priority
            className="h-auto w-[260px] drop-shadow-[0_18px_28px_rgba(10,93,235,0.18)] sm:w-[320px]"
          />
        </motion.div>

        {/* headline (concept) */}
        <motion.h1
          variants={item}
          className="font-display text-4xl font-bold leading-[1.15] tracking-tight text-ink sm:text-5xl md:text-6xl"
        >
          จัดตารางชีวิต งาน
          <br />
          และทำงานเป็นทีม
          <br />
          <span className="bg-gradient-to-r from-eddy-500 via-accent-500 to-eddy-400 bg-clip-text text-transparent">
            ให้ลงตัวในที่เดียว
          </span>
        </motion.h1>

        {/* subtitle */}
        <motion.p variants={item} className="mt-6 max-w-lg font-body text-base text-ink-soft sm:text-lg">
          ผู้ช่วย AI ที่ช่วยจัดปฏิทิน วางแผนงาน หาเวลาว่างของกลุ่ม และเตือนสิ่งที่ต้องทำ — เริ่มต้นฟรีวันนี้
        </motion.p>

        {/* ปุ่มเดียว - Get Started (เรืองแสง) */}
        <motion.div variants={item} className="mt-10">
          <Link
            href="/login"
            className="group relative inline-flex items-center gap-2 rounded-full bg-ink px-9 py-4 font-display text-lg font-semibold text-white shadow-clay-pop transition-all duration-200 hover:scale-[1.04] hover:bg-black active:scale-95"
          >
            <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-ink opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-70" />
            Get Started
            <ArrowRight size={20} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
