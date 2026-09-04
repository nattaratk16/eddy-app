'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Clock, ShieldCheck, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export interface SettingsNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

// จุดเดียวที่กำหนดว่าหน้าตั้งค่ามีหัวข้ออะไรบ้าง - เพิ่มหัวข้อใหม่ในอนาคต (การแจ้งเตือน, ธีม,
// จัดการหมวดหมู่, เชื่อมต่อ Google Calendar, ส่งออกข้อมูล ฯลฯ) = เพิ่ม 1 บรรทัดที่นี่
// + สร้างไฟล์ app/(app)/settings/<ชื่อ>/page.tsx เท่านั้น ไม่ต้องแก้ layout หรือเมนูที่ไหนอีก
export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    href: '/settings/profile',
    label: 'โปรไฟล์',
    description: 'ชื่อ อวาตาร์ และข้อมูลที่คนอื่นเห็น',
    icon: User,
  },
  {
    href: '/settings/work',
    label: 'การทำงานและเวลา',
    description: 'เวลาที่สะดวก ทักษะ และค่าที่เอ็ดดี้ใช้จัดตาราง',
    icon: Clock,
  },
  {
    href: '/settings/account',
    label: 'บัญชีและความปลอดภัย',
    description: 'อีเมล รหัสผ่าน และการออกจากระบบ',
    icon: ShieldCheck,
  },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    // จอเล็ก: เลื่อนแนวนอนเป็นแถบแท็บ / จอใหญ่: เรียงลงเป็นเมนูข้าง
    <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
      {SETTINGS_NAV.map((item) => {
        const active = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'flex flex-shrink-0 items-center gap-3 rounded-clay-sm px-3.5 py-3 transition-colors duration-150 lg:flex-shrink',
              active ? 'bg-white shadow-clay-sm ring-1 ring-eddy-200' : 'hover:bg-white/70',
            )}
          >
            <span
              className={clsx(
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-clay-sm transition-colors',
                active ? 'bg-pastel-blue text-eddy-700' : 'bg-eddy-50 text-ink-muted',
              )}
            >
              <Icon size={18} />
            </span>
            <span className="min-w-0">
              <span
                className={clsx(
                  'block whitespace-nowrap font-display text-sm lg:whitespace-normal',
                  active ? 'font-bold text-ink' : 'font-semibold text-ink-soft',
                )}
              >
                {item.label}
              </span>
              <span className="hidden font-body text-xs text-ink-muted lg:block">{item.description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
