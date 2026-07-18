'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, CalendarDays, ListChecks, User, LogOut } from 'lucide-react';
import clsx from 'clsx';
import EddyMascot from './EddyMascot';

const navItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/calendar', label: 'ปฏิทิน', icon: CalendarDays },
  { href: '/todo', label: 'สิ่งที่ต้องทำ', icon: ListChecks },
  { href: '/profile', label: 'โปรไฟล์', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 flex-col bg-white px-5 py-8 shadow-clay md:flex">
      <div className="flex items-center gap-3 px-2">
        <EddyMascot mood="happy" size={48} float={false} />
        <div>
          <p className="font-display text-xl font-bold text-ink">EDDY</p>
          <p className="font-body text-[11px] text-ink-muted">ผู้ช่วยจัดตารางชีวิต</p>
        </div>
      </div>

      <nav className="mt-10 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-clay-sm px-4 py-3 font-display text-sm font-semibold transition-all duration-150 active:scale-[0.98]',
                active
                  ? 'bg-eddy-500 text-white shadow-clay-sm'
                  : 'text-ink-soft hover:translate-x-0.5 hover:bg-eddy-50'
              )}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        className="flex items-center gap-3 rounded-clay-sm px-4 py-3 font-display text-sm font-semibold text-ink-muted transition-all duration-150 hover:bg-pastel-pink/40 active:scale-[0.98]"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut size={20} />
        ออกจากระบบ
      </button>
    </aside>
  );
}
