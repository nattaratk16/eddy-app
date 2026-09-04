'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import EddyMascot from '@/components/EddyMascot';

export default function CTASection() {
  return (
    <section className="px-5 py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 overflow-hidden rounded-clay bg-gradient-to-br from-eddy-500 to-accent-500 px-6 py-14 text-center shadow-clay-pop sm:px-12"
      >
        {/* แสงเรืองลอยตกแต่ง - เพิ่มความรู้สึก "พิเศษ" ให้การ์ดปิดท้าย */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-white/10 blur-2xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <EddyMascot mood="celebrate" size={96} />
        </motion.div>
        <h2 className="relative font-display text-h1 text-white">พร้อมจัดชีวิตให้ลงตัวหรือยัง</h2>
        <p className="relative max-w-md font-body text-body text-white/90">
          สมัครฟรีวันนี้ แล้วให้เอ็ดดี้ช่วยวางแผนวัน เคลียร์ลิสต์งาน และจัดตารางให้คุณ
        </p>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} className="relative mt-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-brand text-base font-semibold text-eddy-700 shadow-clay transition-shadow hover:shadow-clay-pop"
          >
            Get Started <ArrowRight size={18} />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
