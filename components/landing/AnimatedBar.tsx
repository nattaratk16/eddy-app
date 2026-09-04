'use client';

import { motion } from 'framer-motion';

interface AnimatedBarProps {
  /** 0-100 */
  percent: number;
  className?: string;
}

// แถบความคืบหน้าที่ไล่ความกว้างจาก 0 ตอนเลื่อนมาเห็น - แยกเป็น client component เล็กๆ เพราะ
// app/page.tsx เป็น Server Component เรียก motion.div ตรงๆ ไม่ได้
export default function AnimatedBar({ percent, className }: AnimatedBarProps) {
  return (
    <motion.div
      className={className}
      initial={{ width: 0 }}
      whileInView={{ width: `${percent}%` }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
    />
  );
}
