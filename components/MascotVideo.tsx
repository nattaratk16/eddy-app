'use client';

/**
 * MascotVideo — คลิปมาสคอตโบกมือบนหน้าแรก
 * --------------------------------------------------------------
 * ข้อจำกัดที่ต้องรู้: ไฟล์ .mp4 (H.264) ไม่รองรับพื้นหลังโปร่งใส
 * คลิปนี้พื้นหลังขาว ถ้าวางทับพื้นฟ้าของหน้าเว็บตรงๆ จะเห็นเป็นกล่องขาว
 * เลยจัดให้อยู่ในการ์ดมนๆ พื้นขาว ให้ดูตั้งใจแทนที่จะดูเหมือนหลุด
 *
 * ข้อควรระวังของ autoplay บนเบราว์เซอร์:
 *   - ต้อง muted + playsInline ไม่งั้น iOS/Chrome จะบล็อกไม่ให้เล่นเอง
 *   - ใส่ poster ไว้ให้เห็นภาพทันทีระหว่างวิดีโอโหลด (ไฟล์ 2.9 MB)
 *   - ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหว (prefers-reduced-motion) จะได้ภาพนิ่งแทน
 * --------------------------------------------------------------
 */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface MascotVideoProps {
  className?: string;
}

export default function MascotVideo({ className = '' }: MascotVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div
      className={`overflow-hidden rounded-clay-lg border border-white/80 bg-white shadow-clay-pop ring-1 ring-eddy-100 ${className}`}
    >
      {reduceMotion ? (
        <Image
          src="/mascot/eddy-duo-wave-poster.jpg"
          alt="เอ็ดดี้และผู้ช่วยโบกมือทักทาย"
          width={640}
          height={360}
          className="h-auto w-full"
          priority
        />
      ) : (
        <video
          ref={videoRef}
          src="/mascot/eddy-duo-wave.mp4"
          poster="/mascot/eddy-duo-wave-poster.jpg"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label="เอ็ดดี้และผู้ช่วยโบกมือทักทาย"
          className="h-auto w-full"
        />
      )}
    </div>
  );
}
