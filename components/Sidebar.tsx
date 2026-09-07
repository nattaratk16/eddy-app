'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

// ไอคอน 3D จากชุดที่ผู้ใช้ทำเอง (mascottmodel/ICON.png ตัดออกมาเป็นไฟล์เดี่ยวไว้ที่ public/icons/)
// แทนที่ lucide-react เดิม (เส้นบางๆ) ให้เข้ากับธีมมาสคอตของแอปมากขึ้น
const navItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: '/icons/browser-chart.png' },
  { href: '/calendar', label: 'ปฏิทิน', icon: '/icons/calendar-time.png' },
  { href: '/todo', label: 'งาน', icon: '/icons/clipboard-check.png' },
  { href: '/groups', label: 'กลุ่ม', icon: '/icons/people-group.png' },
  { href: '/profile', label: 'โปรไฟล์', icon: '/icons/id-card.png' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const displayName = user?.name || user?.email?.split('@')[0] || 'ผู้ใช้';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="sticky top-0 z-20 hidden h-screen w-[76px] flex-col items-center gap-1 border-r border-eddy-100 bg-surface/70 py-4 backdrop-blur-xl md:flex">
      {/* โลโก้ - เป็นรูปโลโก้จริงแล้ว (ไม่ใช่ badge ไอคอนเหมือนเดิม) เลยไม่ต้องมีพื้นหลังไล่สีคลุมอีก */}
      <Link
        href="/dashboard"
        className="mb-2 flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
        aria-label="EDDY"
      >
        <Image src="/mascot/eddy-wordmark.png" alt="" width={900} height={411} className="h-auto w-14" priority />
      </Link>

      {/* เมนู */}
      <nav className="flex w-full flex-1 flex-col items-center gap-1">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex w-full flex-col items-center gap-1 py-1.5"
            >
              {/* แถบบอกเมนูที่เลือก (ด้านซ้าย) - เลื่อนลื่นด้วย shared layout ของ framer */}
              {active && (
                <motion.span
                  layoutId="sidebar-active-bar"
                  className="absolute inset-y-0 left-0 my-auto h-7 w-1 rounded-r-full bg-inverse"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              {/* ไอคอนสีเต็มอยู่แล้ว (ไม่ใช่ SVG เส้น) เลยใช้พื้นหลังพาสเทลอ่อนๆ บอกสถานะ active แทนไล่สีเข้มแบบเดิม
                  ที่ออกแบบมาคู่กับไอคอน currentColor สีขาว */}
              <span
                className={clsx(
                  'flex h-11 w-11 items-center justify-center rounded-clay-sm transition-all duration-200 group-hover:scale-105 group-active:scale-95',
                  active ? 'bg-eddy-50 shadow-clay-sm ring-1 ring-eddy-200' : 'group-hover:bg-eddy-50/70'
                )}
              >
                <Image src={item.icon} alt="" width={26} height={26} className="h-[26px] w-[26px] object-contain" />
              </span>
              <span
                className={clsx(
                  'font-display text-[11px] transition-colors',
                  active ? 'font-bold text-ink' : 'font-medium text-ink-muted group-hover:text-ink-soft'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ผู้ใช้ + ออกจากระบบ */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <Link
          href="/profile"
          aria-label="โปรไฟล์"
          className="transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={displayName} className="h-9 w-9 rounded-full object-cover ring-2 ring-eddy-100" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-inverse font-display text-sm font-bold text-white">
              {initial}
            </span>
          )}
        </Link>
        {/* ตั้งค่าเป็นเมนูรอง ไม่ใช่เมนูหลัก - อยู่คู่กับปุ่มออกจากระบบตรงนี้แทนการเพิ่มช่องที่ 6
            ในแถบเมนูหลัก (ซึ่งใช้ไอคอน 3D ชุดที่ทำเองไว้ และแถบล่างบนมือถือก็เต็ม 5 ช่องพอดีแล้ว) */}
        <Link
          href="/settings"
          aria-label="ตั้งค่า"
          className={clsx(
            'flex h-9 w-9 items-center justify-center rounded-clay-sm transition-colors duration-150',
            pathname?.startsWith('/settings')
              ? 'bg-eddy-50 text-eddy-700 ring-1 ring-eddy-200'
              : 'text-ink-muted hover:bg-eddy-50 hover:text-eddy-700',
          )}
        >
          <Settings size={18} />
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          aria-label="ออกจากระบบ"
          className="flex h-9 w-9 items-center justify-center rounded-clay-sm text-ink-muted transition-colors duration-150 hover:bg-pastel-pink/40 hover:text-chip-ink"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
