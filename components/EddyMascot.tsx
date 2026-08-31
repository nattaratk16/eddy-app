'use client';

import Image from 'next/image';
import clsx from 'clsx';

/**
 * มาสคอตของแอป
 * --------------------------------------------------------------
 * มี 2 ตัวแบ่งหน้าที่กัน:
 *   'eddy' (ตัวฟ้าถือสมุด) = เอ็ดดี้ ผู้ช่วยหลัก ใช้ทั่วแอป
 *   'nova' (ตัวครีมใส่หูฟัง) = ตัวที่โผล่ตอน AI กำลังคิดงานหนักๆ
 *                             เช่น กระจายงานกลุ่ม / จัดตารางให้
 *
 * เดิมเป็น SVG วาดเองที่เปลี่ยนสีหน้าได้ตาม mood ตอนนี้เป็นภาพวาดจริง
 * เลยคง prop mood ไว้เพื่อไม่ให้ที่เรียกใช้ทั้ง 13 จุดพัง แต่ mood ไปคุม
 * "ท่าทาง" แทน (ลอย/เอียง/เด้ง) ไม่ได้เปลี่ยนสีหน้า
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
  float?: boolean;
}

/** ไฟล์ภาพต่อขนาด - เลือกไฟล์ที่ใกล้เคียงเพื่อไม่ต้องโหลด 512px มาแสดงที่ 32px */
const SRC: Record<EddyCharacter, { file: string; ratio: number }> = {
  // ratio = กว้าง/สูง ของภาพหลังตัดขอบใสออกแล้ว (ใช้คำนวณความกว้างให้ไม่ยืด)
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

export default function EddyMascot({
  mood = 'happy',
  character = 'eddy',
  size = 160,
  className = '',
  float = true,
}: EddyMascotProps) {
  const { file, ratio } = SRC[character];
  const height = size;
  const width = Math.round(size * ratio);

  return (
    <span
      className={clsx(
        'inline-block select-none',
        float && 'animate-float',
        mood === 'celebrate' && 'animate-bounce-slow',
        mood === 'sleepy' && 'opacity-80',
        className,
      )}
      style={{ width, height }}
    >
      <Image
        src={`/mascot/${file}-${assetFor(size)}.png`}
        alt={character === 'eddy' ? 'เอ็ดดี้ ผู้ช่วยของคุณ' : 'ผู้ช่วยของเอ็ดดี้'}
        width={width}
        height={height}
        priority={size >= 120}
        className={clsx('h-full w-full object-contain', mood === 'think' && '-rotate-3')}
      />
    </span>
  );
}
