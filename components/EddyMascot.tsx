'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * มาสคอตของแอป
 * --------------------------------------------------------------
 * มี 2 ตัวแบ่งหน้าที่กัน:
 *   'eddy' (ตัวฟ้าถือสมุด) = ผู้ช่วยหลัก ใช้ทั่วแอป
 *   'nova' (ตัวครีมใส่หูฟัง) = โผล่ตอน AI กำลังคิดงานหนักๆ
 *                             เช่น กระจายงานกลุ่ม / จัดตารางให้
 *
 * เดิมเป็น SVG วาดเองที่เปลี่ยนสีหน้าได้ตาม mood ตอนนี้เป็นภาพวาดจริง
 * เลยคง prop mood ไว้เพื่อไม่ให้ที่เรียกใช้พัง แต่ mood ไปคุม "ท่าทาง" แทนสีหน้า
 *
 * อนิเมชัน: ขยับทั้งตัว (หายใจ/ลอย/เอียง) โดยไม่ต้องตัดภาพเป็นชั้นๆ
 * ถ้าอยากได้กะพริบตา/โบกมือ ต้องแยกไฟล์ตา-แขนออกมาก่อน แล้วค่อยซ้อนเพิ่มทีหลัง
 * --------------------------------------------------------------
 */
export type EddyMood = 'wave' | 'happy' | 'sleepy' | 'celebrate' | 'think';
export type EddyCharacter = 'eddy' | 'nova';

interface EddyMascotProps {
  mood?: EddyMood;
  /** ตัวไหน - ไม่ระบุ = เอ็ดดี้ */
  character?: EddyCharacter;
  size?: number;
  className?: string;
  /** ลอยขึ้นลง (ปิดได้เวลาวางในแถวข้อความ) */
  float?: boolean;
  /** ปิดอนิเมชันทั้งหมด เช่น เวลาใช้เป็นไอคอนเล็กๆ ที่ไม่ควรดึงสายตา */
  still?: boolean;
}

/** ไฟล์ภาพต่อตัวละคร + สัดส่วนหลังตัดขอบใสออกแล้ว (ใช้คำนวณความกว้างไม่ให้ยืด) */
const SRC: Record<EddyCharacter, { file: string; ratio: number }> = {
  eddy: { file: 'eddy-a', ratio: 455 / 512 },
  nova: { file: 'eddy-b', ratio: 349 / 512 },
};

function assetFor(size: number): 128 | 256 | 512 {
  // เผื่อจอ retina (2x) ก่อนเลือกไฟล์
  const needed = size * 2;
  if (needed <= 128) return 128;
  if (needed <= 256) return 256;
  return 512;
}

/** ท่าทางตาม mood - ค่าที่ใส่ให้ framer-motion เล่นวนไปเรื่อยๆ */
function idleFor(mood: EddyMood, float: boolean) {
  const base = {
    // "หายใจ" - ยืดแนวตั้งนิดเดียว ตาเปล่ามองแทบไม่ออกแต่ทำให้ดูมีชีวิต
    scaleY: [1, 1.025, 1],
    scaleX: [1, 0.99, 1],
    y: float ? [0, -6, 0] : [0, -2, 0],
    rotate: [0, 0, 0] as number[],
  };
  if (mood === 'think') return { ...base, rotate: [-3, -1, -3] };
  if (mood === 'celebrate') return { ...base, y: [0, -14, 0], rotate: [-4, 4, -4] };
  if (mood === 'wave') return { ...base, rotate: [-2, 3, -2] };
  if (mood === 'sleepy') return { ...base, scaleY: [1, 1.015, 1], y: [0, -2, 0] };
  return base;
}

const DURATION: Record<EddyMood, number> = {
  happy: 3.2,
  think: 3.8,
  celebrate: 1.4,
  wave: 2.4,
  sleepy: 5,
};

export default function EddyMascot({
  mood = 'happy',
  character = 'eddy',
  size = 160,
  className = '',
  float = true,
  still = false,
}: EddyMascotProps) {
  const { file, ratio } = SRC[character];
  const height = size;
  const width = Math.round(size * ratio);

  return (
    <motion.span
      className={clsx('inline-block select-none', mood === 'sleepy' && 'opacity-85', className)}
      style={{ width, height, transformOrigin: 'bottom center' }}
      animate={still ? undefined : idleFor(mood, float)}
      transition={
        still
          ? undefined
          : { duration: DURATION[mood], repeat: Infinity, ease: 'easeInOut', repeatType: 'loop' }
      }
      whileHover={still ? undefined : { scale: 1.06, rotate: mood === 'think' ? -5 : 3 }}
    >
      <Image
        src={`/mascot/${file}-${assetFor(size)}.png`}
        alt={character === 'eddy' ? 'เอ็ดดี้ ผู้ช่วยของคุณ' : 'ผู้ช่วยของเอ็ดดี้'}
        width={width}
        height={height}
        priority={size >= 120}
        className="h-full w-full object-contain"
      />
    </motion.span>
  );
}
