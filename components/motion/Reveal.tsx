'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** หน่วงเวลาเริ่ม (วินาที) - ใช้ทำ stagger */
  delay?: number;
  /** เปิดลูกเล่นยกตัวตอน hover (สำหรับการ์ดที่กดได้/เป็นไทล์) */
  hover?: boolean;
}

// เอนทรานซ์แบบ physics: จางเข้า + เลื่อนขึ้น ด้วย easing นุ่ม (ใช้แทน CSS animate-fade-in-up)
export default function Reveal({ children, className, delay = 0, hover = false }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover ? { y: -5, transition: { duration: 0.2, ease: 'easeOut' } } : undefined}
    >
      {children}
    </motion.div>
  );
}
