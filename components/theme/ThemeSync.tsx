'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { resolveDark } from '@/lib/theme';

/**
 * ทาคลาส .dark ให้ตรงกับ "หน้าปัจจุบัน + ค่าที่ผู้ใช้เลือก" ทุกครั้งที่เปลี่ยนหน้า
 *
 * ThemeScript ใน <head> จัดการให้แล้วตอนโหลดหน้าครั้งแรก แต่การเปลี่ยนหน้าในแอป
 * เป็น client-side routing สคริปต์นั้นจึงไม่ได้รันซ้ำ - ถ้าไม่มีตัวนี้ กดออกจากระบบ
 * ตอนอยู่ธีมมืดแล้วเด้งมาหน้า login จะได้หน้า login เวอร์ชันมืดที่ไม่ได้ออกแบบไว้
 *
 * ตั้งใจให้เป็นจุดเดียวใน layout ราก ไม่ใช่คอมโพเนนต์ที่ไปแปะรายหน้า เพราะถ้าแปะรายหน้า
 * ตอนสลับระหว่างหน้าสว่าง-มืด จังหวะ mount ของหน้าใหม่กับ unmount ของหน้าเก่าจะแข่งกัน
 * แล้วคลาสค้างผิดสถานะได้
 *
 * ทาตั้งแต่ตอน render ไม่รอ useEffect เพราะ useEffect ทำงานหลังเบราว์เซอร์วาดไปแล้ว
 * (useEffect ยังต้องมีอยู่ เผื่อกรณีที่ render ไม่ได้เกิดฝั่ง client)
 */
export default function ThemeSync() {
  const pathname = usePathname();

  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolveDark(pathname));
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolveDark(pathname));
  }, [pathname]);

  return null;
}
