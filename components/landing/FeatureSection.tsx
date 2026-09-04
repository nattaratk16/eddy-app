'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

// โทนเดียวกันทั้งหน้า (ฟ้าแบรนด์) แทนที่จะสลับสีไปตาม section เดิม - ผู้ใช้บอกว่าหลายสีดูคลุ้ง
const ICON_BG = 'bg-pastel-blue';
const BLOB_BG = 'bg-pastel-blue-dark';

const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const textItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

interface FeatureSectionProps {
  icon: string;
  title: string;
  description: string;
  /** สลับด้าน (ไอคอน+ข้อความ กับ มอคอัพ) - ใช้สลับซ้าย/ขวาลงไปเรื่อยๆ ให้หน้าไม่จำเจ (มือถือเรียงซ้อนเหมือนกันหมด) */
  reverse?: boolean;
  /** การ์ดมอคอัพเล็กๆ ประกอบเนื้อหา - authored แยกทีละจุดที่เรียกใช้ ไม่ generate อัตโนมัติ */
  children: ReactNode;
}

export default function FeatureSection({ icon, title, description, reverse = false, children }: FeatureSectionProps) {
  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden px-5 py-14 sm:py-20">
      {/* blob ลอยตกแต่งพื้นหลัง - เบลอ+โปร่งแสง ไม่แย่งซีนเนื้อหา */}
      <motion.span
        aria-hidden
        className={`pointer-events-none absolute -left-10 top-4 h-32 w-32 rounded-full opacity-30 blur-2xl ${BLOB_BG}`}
        animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden
        className={`pointer-events-none absolute -right-6 bottom-0 h-24 w-24 rounded-full opacity-25 blur-2xl ${BLOB_BG}`}
        animate={{ y: [0, 16, 0], x: [0, -8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      />

      <div className={`relative flex flex-col items-center gap-10 md:flex-row md:gap-16 ${reverse ? 'md:flex-row-reverse' : ''}`}>
        <motion.div
          className="flex-1 text-center md:text-left"
          variants={textContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.span
            variants={textItem}
            className={`inline-flex h-16 w-16 items-center justify-center rounded-clay ${ICON_BG} shadow-clay-sm`}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image src={icon} alt="" width={128} height={128} className="h-9 w-9 object-contain" />
          </motion.span>
          <motion.h2 variants={textItem} className="mt-5 font-display text-h2 text-ink">
            {title}
          </motion.h2>
          <motion.p variants={textItem} className="mt-3 font-body text-body text-ink-soft">
            {description}
          </motion.p>
        </motion.div>

        <motion.div
          className="flex-1"
          initial={{ opacity: 0, y: 30, scale: 0.94 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -6, rotate: reverse ? -1 : 1, transition: { duration: 0.25, ease: 'easeOut' } }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
