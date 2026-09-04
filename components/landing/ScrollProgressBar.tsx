'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

// แถบบางๆ ด้านบนสุดของหน้า บอกว่าเลื่อนอ่านไปถึงไหนแล้ว (0-100% ของทั้งหน้า)
// useSpring ทำให้ไม่กระตุกตามพิกเซลเป๊ะๆ แต่ไล่ตามอย่างนุ่มนวล
export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 300, damping: 40, mass: 0.2 });

  return (
    <motion.div
      aria-hidden
      className="fixed left-0 top-0 z-50 h-1 w-full origin-left bg-gradient-to-r from-eddy-500 to-accent-400"
      style={{ scaleX }}
    />
  );
}
