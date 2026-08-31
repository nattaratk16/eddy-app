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

/**
 * โลโก้แบบสติกเกอร์ - ตัวอักษรอยู่ในแผ่นสีทึบ
 *
 * ทำไมต้องเป็นแผ่นสี: ถ้าระบายสีที่ตัวอักษรตรงๆ บนพื้นฟ้าอ่อนของหน้าแรก
 * จะใช้ได้แค่น้ำเงินกับส้มแดง (สีอื่นคอนทราสต์ต่ำกว่า 2:1 อ่านไม่ออก)
 * พอย้ายสีไปไว้ที่พื้นแผ่นแล้วใส่ตัวอักษรทับ จะใช้สีจัดๆ ได้ครบทั้งพาเลต
 * และคุมให้ทุกตัวอ่านชัดเท่ากัน (ตรวจคอนทราสต์ทุกคู่แล้ว ผ่าน 4.5:1 ทั้งหมด)
 */
const LOGO_TILES = [
  { char: 'E', bg: 'bg-eddy-500', text: 'text-white', tilt: -6 },      // ตัวขาวบนน้ำเงิน 5.56:1
  { char: 'D', bg: 'bg-brand-yellow', text: 'text-ink', tilt: 4 },     // ตัวเข้มบนเหลือง 10.86:1
  { char: 'D', bg: 'bg-brand-red', text: 'text-white', tilt: -3 },     // ตัวขาวบนแดง 4.83:1
  { char: 'Y', bg: 'bg-brand-green', text: 'text-ink', tilt: 6 },      // ตัวเข้มบนเขียว 5.48:1
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
        {/* โลโก้สติกเกอร์ - เด้งเข้าทีละแผ่นแล้วโยกไหวต่อเนื่อง */}
        <motion.div variants={item} className="mb-6">
          <div className="flex items-center justify-center gap-2 sm:gap-2.5">
            {LOGO_TILES.map((t, i) => (
              <motion.span
                key={i}
                className={`flex h-16 w-16 items-center justify-center rounded-clay font-brand text-4xl font-semibold leading-none shadow-clay sm:h-20 sm:w-20 sm:text-5xl ${t.bg} ${t.text}`}
                initial={{ y: -70, opacity: 0, rotate: t.tilt - 20, scale: 0.5 }}
                animate={{ y: [0, -7, 0], opacity: 1, rotate: [t.tilt, t.tilt + 3, t.tilt], scale: 1 }}
                transition={{
                  opacity: { duration: 0.25, delay: 0.2 + i * 0.1 },
                  scale: { type: 'spring', stiffness: 460, damping: 13, delay: 0.2 + i * 0.1 },
                  y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.9 + i * 0.18 },
                  rotate: { duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.9 + i * 0.18 },
                }}
                whileHover={{ scale: 1.12, rotate: 0, transition: { type: 'spring', stiffness: 400, damping: 12 } }}
              >
                {t.char}
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

        {/* แคปชั่นหลัก - แนวโน้ตกระดาษอุ่นๆ ติดเทป
            เลิกใช้แถบไฮไลต์สีจัดแบบเดิมที่ดูเหมือนปากกาเน้นข้อความในชีทเรียน
            เปลี่ยนเป็นการ์ดกระดาษครีม + ขีดเส้นใต้ลายมือ ให้ดูอบอุ่นและเป็นเอกลักษณ์ */}
        <motion.div variants={item} className="relative w-full max-w-xl">
          {/* เทปกาวติดมุมบน */}
          <span
            aria-hidden
            className="absolute -top-3 left-1/2 z-10 h-7 w-28 -translate-x-1/2 -rotate-2 rounded-[3px] bg-brand-yellow/70 shadow-[0_1px_3px_rgba(31,39,51,0.12)] backdrop-blur-[1px]"
          />
          <div className="-rotate-[0.6deg] rounded-clay-lg border border-white/90 bg-[#FFFBF3] px-7 py-8 shadow-clay-pop sm:px-10 sm:py-10">
            <h1 className="text-left font-brand text-[1.85rem] font-semibold leading-[1.35] tracking-tight text-ink sm:text-[2.6rem] sm:leading-[1.3]">
              <span className="block">
                Plan the <span className="text-eddy-500">date</span>,
              </span>
              <span className="block">
                clear the <span className="text-brand-orange-ink">list</span>,
              </span>
              <span className="relative inline-block">
                your perfect assist.
                {/* ขีดเส้นใต้ลายมือ - วาดเป็นเส้นโค้งไม่เท่ากันให้ดูเหมือนขีดด้วยมือ */}
                <svg
                  aria-hidden
                  viewBox="0 0 300 14"
                  preserveAspectRatio="none"
                  className="absolute -bottom-2 left-0 h-3 w-full text-brand-yellow"
                >
                  <path
                    d="M2 9 C 48 2, 96 12, 148 6 S 250 2, 298 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-7 text-left font-body text-sm text-ink-soft sm:text-base">
              วางแผนวัน เคลียร์ลิสต์งาน ผู้ช่วยที่สมบูรณ์แบบของคุณ
            </p>
          </div>
        </motion.div>

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
