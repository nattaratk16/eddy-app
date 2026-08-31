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
        {/* โลโก้ - ตัวอักษรใหญ่ น้ำเงินเข้ม มีเส้นขอบขาวหุ้มรอบตัวอักษรเอง
            (ไม่ใช่กรอบสี่เหลี่ยมครอบข้างนอกแล้ว)
            ทำด้วยการซ้อน 2 ชั้น: ชั้นหลังเป็นตัวอักษรที่ตีเส้นขาวหนา
            ชั้นหน้าเป็นตัวอักษรสีน้ำเงินทับลงไป - วิธีนี้เส้นขอบจะไม่กินเนื้อตัวอักษร
            (ถ้าใช้ -webkit-text-stroke ชั้นเดียว เส้นจะกินเข้าไปข้างในจนตัวอักษรผอมลง) */}
        <motion.div variants={item} className="mb-7">
          <span className="relative inline-block font-brand text-6xl font-semibold leading-none tracking-tight sm:text-7xl md:text-8xl">
            <span
              aria-hidden
              className="absolute inset-0 text-white"
              style={{ WebkitTextStroke: '12px #FFFFFF', paintOrder: 'stroke fill' }}
            >
              EDDY
            </span>
            {/* ตัว D ตัวที่ 3 เป็นสีเหลืองของมาสคอต ที่เหลือน้ำเงินเข้ม
                เหลืองบนพื้นสว่างคอนทราสต์ต่ำมาก (1.1:1) เลยต้องพึ่งเส้นขอบขาวหนา
                บวกเงาน้ำเงินใต้ตัวอักษร ไม่งั้นตัวจะจมหายไปกับพื้น */}
            <span className="relative drop-shadow-[0_8px_16px_rgba(10,76,196,0.25)]">
              <span className="text-eddy-600">ED</span>
              <span className="text-brand-yellow [text-shadow:0_3px_0_rgba(10,76,196,0.35)]">D</span>
              <span className="text-eddy-600">Y</span>
            </span>
          </span>
        </motion.div>

        {/* มาสคอตคู่ - คลิปโบกมือทักทาย */}
        <motion.div variants={item} className="mb-7 w-[min(92vw,440px)]">
          <MascotWave />
        </motion.div>

        {/* แคปชั่นหลัก - จัดกลาง ตัวใหญ่ สะอาด ตามแนว referance.png
            เน้นสีเฉพาะคำสำคัญ ที่เหลือเป็นสีหมึก จะได้มีจังหวะหนัก-เบา */}
        <motion.h1
          variants={item}
          className="font-brand text-[1.6rem] font-normal leading-[1.35] tracking-tight text-ink sm:text-[2.1rem] md:text-[2.6rem]"
        >
          Plan the <span className="text-eddy-500">date</span>,{' '}
          <span className="whitespace-nowrap">
            clear the <span className="text-brand-orange-ink">list</span>,
          </span>
          <br />
          <span className="relative inline-block">
            your perfect assist.
            {/* ขีดเส้นใต้ลายมือ */}
            <svg
              aria-hidden
              viewBox="0 0 300 14"
              preserveAspectRatio="none"
              className="absolute -bottom-1 left-0 h-2 w-full text-brand-yellow sm:-bottom-1.5 sm:h-2.5"
            >
              <path
                d="M2 9 C 48 2, 96 12, 148 6 S 250 2, 298 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </motion.h1>

        {/* คำแปลไทย */}
        <motion.p variants={item} className="mt-8 max-w-lg font-body text-base text-ink-soft sm:text-lg">
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
