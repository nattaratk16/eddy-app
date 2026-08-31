'use client';

/**
 * MascotWave — คลิปมาสคอตโบกมือบนหน้าแรก (พื้นหลังโปร่งใส)
 * --------------------------------------------------------------
 * ต้นฉบับเป็น .mp4 ซึ่ง H.264 ไม่รองรับพื้นหลังโปร่งใส วางทับพื้นฟ้าแล้วจะเป็นกล่องขาว
 * เลยแปลงเป็น animated WebP ที่มี alpha (คีย์พื้นขาวออกด้วย flood fill จากขอบภาพ
 * ไม่ใช่วิธี "ขาว = โปร่งใส" ที่จะกินตาขาว/สมุด/ตัวโนวาสีครีมไปด้วย)
 *
 * ใช้เป็น <img> ธรรมดา เบราว์เซอร์เล่นลูปให้เอง ไม่ต้องมี <video>
 * ไม่ต้องกังวลเรื่อง autoplay ถูกบล็อกบนมือถือ และไม่มีแทร็กเสียงติดมา
 *
 * ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหว (prefers-reduced-motion) จะได้ภาพนิ่งแทน
 * --------------------------------------------------------------
 */
import { useEffect, useState } from 'react';

interface MascotWaveProps {
  className?: string;
}

export default function MascotWave({ className = '' }: MascotWaveProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    // ใช้ <img> ตรงๆ ไม่ผ่าน next/image เพราะตัว optimizer จะแปลง animated webp
    // เป็นภาพนิ่งเฟรมแรก (ต้องใส่ unoptimized อยู่ดี เลยใช้ img ให้ตรงไปตรงมากว่า)
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={reduceMotion ? '/mascot/eddy-duo-wave-still.png' : '/mascot/eddy-duo-wave.webp'}
      alt="เอ็ดดี้และผู้ช่วยโบกมือทักทาย"
      width={440}
      height={284}
      className={`h-auto w-full drop-shadow-[0_18px_28px_rgba(10,93,235,0.18)] ${className}`}
    />
  );
}
