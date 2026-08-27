'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LayoutDashboard, CalendarDays, ListChecks, Users, User, LogOut, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/calendar', label: 'ปฏิทิน', icon: CalendarDays },
  { href: '/todo', label: 'งาน', icon: ListChecks },
  { href: '/groups', label: 'กลุ่ม', icon: Users },
  { href: '/profile', label: 'โปรไฟล์', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const displayName = user?.name || user?.email?.split('@')[0] || 'ผู้ใช้';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="sticky top-0 z-20 hidden h-screen w-[76px] flex-col items-center gap-1 border-r border-eddy-100 bg-white/70 py-4 backdrop-blur-xl md:flex">
      {/* โลโก้ */}
      <Link
        href="/dashboard"
        className="mb-2 flex h-11 w-11 items-center justify-center rounded-clay-sm bg-gradient-to-br from-eddy-600 to-accent-500 shadow-clay-sm transition-transform duration-200 hover:scale-105 active:scale-95"
        aria-label="EDDY"
      >
        <Sparkles size={22} className="text-white" fill="currentColor" />
      </Link>

      {/* เมนู */}
      <nav className="flex w-full flex-1 flex-col items-center gap-1">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
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
                  className="absolute inset-y-0 left-0 my-auto h-7 w-1 rounded-r-full bg-ink"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span
                className={clsx(
                  'flex h-11 w-11 items-center justify-center rounded-clay-sm transition-all duration-200 group-hover:scale-105 group-active:scale-95',
                  active
                    ? 'bg-gradient-to-br from-eddy-500 to-accent-500 text-white shadow-clay-sm'
                    : 'text-ink-muted group-hover:bg-eddy-100 group-hover:text-ink'
                )}
              >
                <Icon size={21} />
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
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-white">
              {initial}
            </span>
          )}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          aria-label="ออกจากระบบ"
          className="flex h-9 w-9 items-center justify-center rounded-clay-sm text-ink-muted transition-colors duration-150 hover:bg-pastel-pink/40 hover:text-eddy-700"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
