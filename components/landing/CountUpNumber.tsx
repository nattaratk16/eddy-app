'use client';

import { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';

interface CountUpNumberProps {
  value: number;
  className?: string;
}

// นับเลขไต่ขึ้นจาก 0 ถึงค่าจริงตอนเลื่อนมาเห็น (ครั้งเดียว) - ใช้กับตัวเลขในการ์ดมอคอัพ
// ให้ความรู้สึก "มีชีวิต" มากกว่าตัวเลขนิ่งๆ
export default function CountUpNumber({ value, className }: CountUpNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    return spring.on('change', (v) => {
      if (ref.current) ref.current.textContent = String(Math.round(v));
    });
  }, [spring]);

  return (
    <motion.span ref={ref} className={className}>
      0
    </motion.span>
  );
}
