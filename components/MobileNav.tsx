'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, ListChecks, User } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/calendar', label: 'ปฏิทิน', icon: CalendarDays },
  { href: '/todo', label: 'สิ่งที่ต้องทำ', icon: ListChecks },
  { href: '/profile', label: 'โปรไฟล์', icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around bg-white px-4 py-3 shadow-clay md:hidden">
      {navItems.map((item) => {
        const active = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex flex-col items-center gap-1 rounded-clay-sm px-4 py-1.5 font-display text-[11px] font-semibold transition-all duration-150 active:scale-95',
              active ? 'bg-eddy-50 text-eddy-600' : 'text-ink-muted hover:text-eddy-500'
            )}
          >
            <Icon size={22} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
