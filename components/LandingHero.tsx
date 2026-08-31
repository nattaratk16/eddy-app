'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import SkyBackground from '@/components/SkyBackground';
import MascotWave from '@/components/MascotWave';

// เข้าฉากแบบไล่ทีละชิ้น (stagger)
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

/**
 * จุดสีลอยรอบหน้าจอ - ใช้แทนไอคอนประกาย (sparkle) เดิม
 * สีมาจากพาเลตของมาสคอต ให้หน้าแรกดูสนุกและเป็นชุดเดียวกับตัวละคร
 */
const dots = [
  { c: 'left-[14%] top-[20%]', size: 'h-5 w-5', color: 'bg-brand-yellow', d: 0 },
  { c: 'right-[16%] top-[26%]', size: 'h-3.5 w-3.5', color: 'bg-brand-pink', d: 0.6 },
  { c: 'left-[22%] bottom-[22%]', size: 'h-4 w-4', color: 'bg-accent-300', d: 1.2 },
  { c: 'right-[20%] bottom-[28%]', size: 'h-6 w-6', color: 'bg-brand-orange', d: 0.35 },
  { c: 'left-[44%] top-[9%]', size: 'h-3 w-3', color: 'bg-eddy-400', d: 0.9 },
  { c: 'right-[30%] top-[62%]', size: 'h-3.5 w-3.5', color: 'bg-brand-yellow', d: 1.5 },
  { c: 'left-[8%] top-[54%]', size: 'h-3 w-3', color: 'bg-brand-coral', d: 1.8 },
];

/** ตัวอักษรโลโก้ + สีประจำตัว (จากพาเลตมาสคอต) */
const LOGO_LETTERS = [
  { char: 'E', color: 'text-eddy-500' },
  { char: 'D', color: 'text-accent-500' },
  { char: 'D', color: 'text-brand-orange' },
  { char: 'Y', color: 'text-brand-yellow' },
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

      {/* จุดสีลอยไหว (แทนไอคอนประกายเดิม) */}
      {dots.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`pointer-events-none absolute ${s.c} ${s.size} ${s.color} rounded-full opacity-70`}
          animate={{ scale: [0.85, 1.25, 0.85], y: [0, -14, 0], opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: s.d, ease: 'easeInOut' }}
        />
      ))}

      {/* เนื้อหา */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex max-w-3xl flex-col items-center text-center"
      >
        {/* โลโก้ตัวอักษร - ตัวใหญ่ เล่นสีทีละตัว เด้งเข้าทีละตัวแล้วลอยไหวต่อเนื่อง */}
        <motion.div variants={item} className="mb-5">
          <div className="flex items-baseline justify-center gap-1 font-brand text-6xl font-semibold leading-none tracking-tight sm:text-7xl md:text-8xl">
            {LOGO_LETTERS.map((l, i) => (
              <motion.span
                key={l.char}
                className={l.color}
                style={{
                  // ขอบขาวบางๆ + เงา ทำให้ตัวอักษรอ่านชัดบนพื้นฟ้าอ่อน
                  WebkitTextStroke: '1px rgba(255,255,255,0.9)',
                  textShadow: '0 6px 14px rgba(10, 93, 235, 0.22)',
                }}
                initial={{ y: -60, opacity: 0, rotate: -12, scale: 0.6 }}
                animate={{
                  y: [0, -10, 0],
                  opacity: 1,
                  rotate: [0, i % 2 === 0 ? 2 : -2, 0],
                  scale: 1,
                }}
                transition={{
                  // ตอนเข้า: เด้งทีละตัว
                  opacity: { duration: 0.3, delay: 0.25 + i * 0.09 },
                  scale: { type: 'spring', stiffness: 420, damping: 12, delay: 0.25 + i * 0.09 },
                  // หลังเข้าแล้ว: ลอยไหวช้าๆ ไม่รบกวนสายตา
                  y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 + i * 0.16 },
                  rotate: { duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 + i * 0.16 },
                }}
              >
                {l.char}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* badge */}
        <motion.span
          variants={item}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-1.5 font-body text-sm text-ink-soft shadow-clay-sm backdrop-blur"
        >
          <span className="h-2 w-2 rounded-full bg-brand-yellow" />
          ขับเคลื่อนด้วย Gemini AI
        </motion.span>

        {/* มาสคอตคู่ - คลิปโบกมือทักทาย */}
        <motion.div variants={item} className="mb-7 w-[min(92vw,440px)]">
          <MascotWave />
        </motion.div>

        {/* แคปชั่นหลัก - เล่นสีทีละวลีให้อ่านสนุก */}
        <motion.h1
          variants={item}
          className="font-brand text-[2.1rem] font-semibold leading-[1.18] tracking-tight text-ink sm:text-5xl md:text-[3.4rem]"
        >
          <span className="text-eddy-500">Plan the date,</span>{' '}
          <span className="text-brand-orange">clear the list,</span>
          <br />
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-eddy-500 via-accent-500 to-eddy-400 bg-clip-text text-transparent">
              your perfect assist.
            </span>
            {/* ขีดเน้นสีเหลืองใต้วลีปิด */}
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-2.5 w-full rounded-full bg-brand-yellow/70 sm:-bottom-2 sm:h-3"
            />
          </span>
        </motion.h1>

        {/* คำแปลไทย */}
        <motion.p
          variants={item}
          className="mt-7 max-w-xl font-body text-base text-ink-soft sm:text-lg"
        >
          วางแผนวัน เคลียร์ลิสต์งาน ผู้ช่วยที่สมบูรณ์แบบของคุณ
        </motion.p>

        {/* ปุ่มเดียว - Get Started */}
        <motion.div variants={item} className="mt-9">
          <Link
            href="/login"
            className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-9 py-4 font-brand text-lg font-semibold text-white shadow-clay-pop transition-all duration-200 hover:scale-[1.04] hover:brightness-110 active:scale-95"
          >
            <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-eddy-500 opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-70" />
            Get Started
            <ArrowRight size={20} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
