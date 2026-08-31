'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import SkyBackground from '@/components/SkyBackground';
import MascotWave from '@/components/MascotWave';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

export default function LandingHero() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-white">
      <SkyBackground />

      {/* แสงเรืองก้อนเดียว วางหลังมาสคอตทางขวา */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-[6%] top-[28%] h-[26rem] w-[26rem] rounded-full bg-accent-300/25 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ---------- แถบบน ---------- */}
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-20 mx-auto mt-5 flex w-[min(92vw,72rem)] items-center justify-between rounded-full border border-white/80 bg-white/85 px-4 py-2.5 shadow-clay backdrop-blur sm:px-6"
      >
        <span className="flex items-center gap-2">
          <Image src="/mascot/eddy-a-128.png" alt="" width={36} height={40} className="h-9 w-auto" />
          <span className="font-brand text-xl font-semibold tracking-tight text-eddy-600 sm:text-2xl">EDDY</span>
        </span>

        <Link
          href="/login"
          className="rounded-full bg-eddy-600 px-5 py-2 font-brand text-sm font-semibold text-white transition-all hover:bg-eddy-700 active:scale-95 sm:px-6"
        >
          เข้าสู่ระบบ
        </Link>
      </motion.header>

      {/* ---------- เนื้อหาหลัก ---------- */}
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-[min(92vw,72rem)] flex-1 flex-col items-center gap-8 py-10 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:py-0"
      >
        {/* ซ้าย: โลโก้ (มีสโลแกนในภาพ) + ปุ่ม */}
        <div className="flex max-w-lg flex-col items-center text-center lg:mb-24 lg:items-start lg:text-left">
          <motion.div variants={item}>
            <Image
              src="/mascot/eddy-logo-640.png"
              alt="EDDY — Plan the date, clear the list, your perfect assist."
              width={640}
              height={678}
              priority
              className="h-auto w-[248px] drop-shadow-[0_14px_26px_rgba(10,76,196,0.16)] sm:w-[300px] lg:w-[330px]"
            />
          </motion.div>

          <motion.p variants={item} className="mt-5 max-w-sm font-body text-sm text-ink-soft sm:text-base">
            วางแผนวัน เคลียร์ลิสต์งาน ผู้ช่วยที่สมบูรณ์แบบของคุณ
          </motion.p>

          <motion.div variants={item} className="mt-7">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-8 py-3.5 font-brand text-base font-semibold text-white shadow-clay-pop transition-all duration-200 hover:scale-[1.03] hover:brightness-110 active:scale-95"
            >
              Get Started
              <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* ขวา: มาสคอตยืนอยู่บนขอบล่างของหน้า */}
        <motion.div variants={item} className="w-[min(86vw,440px)] lg:w-[48%] lg:max-w-[560px] lg:self-end">
          <MascotWave />
        </motion.div>
      </motion.section>

      {/* ---------- เมฆขาวรับขอบล่าง ---------- */}
      <svg
        aria-hidden
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-16 w-full text-white sm:h-24"
      >
        <path
          fill="currentColor"
          d="M0 60 C 160 100, 260 20, 420 44 S 700 110, 880 68 S 1180 10, 1440 62 L1440 120 L0 120 Z"
        />
      </svg>
    </main>
  );
}
