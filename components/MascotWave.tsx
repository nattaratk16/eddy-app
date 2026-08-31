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
}

type Mode = 'video' | 'image' | 'still';

export default function MascotWave({ className = '' }: MascotWaveProps) {
  // เริ่มที่ image ไว้ก่อน (ปลอดภัยกับทุกเบราว์เซอร์) แล้วค่อยสลับเป็นวิดีโอถ้ารองรับ
  const [mode, setMode] = useState<Mode>('image');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMode('still');
      return;
    }
    const ua = navigator.userAgent;
    const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
    setMode(isSafari ? 'image' : 'video');
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
        height={340}
        className={`h-auto w-full drop-shadow-[0_18px_28px_rgba(10,93,235,0.18)] ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mode === 'still' ? '/mascot/eddy-duo-wave-still.png' : '/mascot/eddy-duo-wave.webp'}
      alt="เอ็ดดี้และผู้ช่วยโบกมือทักทาย"
      width={560}
      height={340}
      className={`h-auto w-full drop-shadow-[0_18px_28px_rgba(10,93,235,0.18)] ${className}`}
    />
  );
}
