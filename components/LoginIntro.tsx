'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import SkyBackground from './SkyBackground';
import EddyMascot from './EddyMascot';

// Splash intro ที่เด้งขึ้นมาคลุมหน้า login - กดเข้าสู่ระบบแล้ว fade/scale ออกเผยฟอร์ม
export default function LoginIntro({ onEnter }: { onEnter: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-white px-6"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
    >
      <SkyBackground />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center"
        initial={{ scale: 0.85, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.05 }}
      >
        <div className="mb-7 flex items-baseline gap-0.5 font-brand text-3xl font-semibold tracking-tight">
          <span className="text-eddy-500">E</span>
          <span className="text-accent-500">D</span>
          <span className="text-brand-orange">D</span>
          <span className="text-brand-yellow">Y</span>
        </div>

        {/* มาสคอตเด้งเข้ามาทักทาย */}
        <motion.div
          className="mb-7"
          initial={{ scale: 0.6, y: -16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.3 }}
        >
          <EddyMascot size={132} />
        </motion.div>

        <motion.h1
          className="font-display text-3xl font-bold leading-snug tracking-tight text-ink sm:text-4xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          ยินดีต้อนรับสู่ EDDY
        </motion.h1>
        <motion.p
          className="mt-3 max-w-sm font-body text-base text-ink-soft"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          ผู้ช่วย AI ที่ช่วยจัดปฏิทิน วางแผนงาน และเตือนสิ่งที่ต้องทำ
        </motion.p>

        <motion.button
          onClick={onEnter}
          className="group mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-8 py-3.5 font-display text-base font-semibold text-white shadow-clay transition-colors hover:bg-black"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72, duration: 0.4 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          เข้าสู่ระบบ
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
