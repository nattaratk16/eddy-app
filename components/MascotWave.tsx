'use client';

/**
 * MascotWave — คลิปมาสคอตโบกมือบนหน้าแรก (พื้นหลังโปร่งใส)
 * --------------------------------------------------------------
 * ต้นฉบับเป็น .mp4 ซึ่ง H.264 ใส่พื้นหลังโปร่งใสไม่ได้ วางทับพื้นฟ้าแล้วเป็นกล่องขาว
 * เลยคีย์พื้นขาวออก (flood fill จากขอบภาพ) แล้วทำเป็น 2 ไฟล์:
 *
 *   .webm (VP9 + alpha)  = คลิปเต็ม 10 วิ 24 fps ขนาด 675 KB  <- ใช้กับเบราว์เซอร์ส่วนใหญ่
 *   .webp (animated)     = ลูปสั้น 1.8 วิ ขนาด 871 KB          <- สำรองสำหรับ Safari
 *
 * ทำไมต้องมีสำรอง: Safari เล่น VP9 ได้ก็จริง แต่ "ไม่รองรับ alpha ใน WebM"
 * จะเห็นเป็นกล่องทึบแทนที่จะโปร่งใส ส่วน animated WebP นั้น Safari 14+ รองรับ alpha ครบ
 * --------------------------------------------------------------
 */
import { useEffect, useState } from 'react';

interface MascotWaveProps {
  className?: string;
  /**
   * ตรวจจาก User-Agent ฝั่งเซิร์ฟเวอร์แล้วส่งมา (ดู app/page.tsx)
   * ทำให้เรนเดอร์แท็กที่ถูกต้องตั้งแต่ HTML ชุดแรก ไม่ต้องสลับทีหลัง
   */
  isSafari?: boolean;
  /**
   * 'width'  = กว้างเต็มกล่อง สูงตามสัดส่วน (ค่าเริ่มต้น)
   * 'height' = สูงเต็มกล่อง กว้างตามสัดส่วน - ใช้ตอนต้องคุมไม่ให้หน้าล้นจอ
   */
  fit?: 'width' | 'height';
}

type Mode = 'video' | 'image' | 'still';

export default function MascotWave({ className = '', fit = 'width', isSafari = false }: MascotWaveProps) {
  // เดิมเริ่มที่ 'image' เสมอแล้วค่อยสลับเป็นวิดีโอใน useEffect
  // ผลคือ Chrome/Edge/Firefox โหลด .webp (651 KB) ทิ้งไปเปล่าๆ ก่อนจะโหลด .webm (668 KB) ต่อ = 1.3 MB
  // ตอนนี้รู้เบราว์เซอร์ตั้งแต่ฝั่งเซิร์ฟเวอร์แล้ว จึงเลือกไฟล์ให้ถูกตั้งแต่แรก โหลดแค่ไฟล์เดียว
  const [mode, setMode] = useState<Mode>(isSafari ? 'image' : 'video');

  // คลิปต้นฉบับถ่ายใกล้ ขาของตัวละครถูกขอบล่างของเฟรมตัดไปแล้วตั้งแต่ต้นทาง
  // ไล่จางขอบล่างเล็กน้อยให้ดูเหมือนตั้งใจเฟดหาย ไม่ใช่ถูกตัดกลางคัน
  const fade =
    '[-webkit-mask-image:linear-gradient(to_bottom,black_93%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_93%,transparent_100%)]';
  const size = fit === 'height' ? 'h-full w-auto max-w-full object-contain' : 'h-auto w-full';

  // เหลือไว้เฉพาะ prefers-reduced-motion ซึ่งเป็นค่าฝั่งเบราว์เซอร์ล้วน เซิร์ฟเวอร์รู้ไม่ได้
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setMode('still');
  }, []);

  if (mode === 'video') {
    return (
      <video
        src="/mascot/eddy-duo-wave.webm"
        poster="/mascot/eddy-duo-wave-still.png"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label="เอ็ดดี้และผู้ช่วยโบกมือทักทาย"
        width={560}
        height={342}
        className={`${size} drop-shadow-[0_18px_28px_rgba(10,93,235,0.18)] ${fade} ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mode === 'still' ? '/mascot/eddy-duo-wave-still.png' : '/mascot/eddy-duo-wave.webp'}
      alt="เอ็ดดี้และผู้ช่วยโบกมือทักทาย"
      width={560}
      height={342}
      className={`${size} drop-shadow-[0_18px_28px_rgba(10,93,235,0.18)] ${fade} ${className}`}
    />
  );
}
