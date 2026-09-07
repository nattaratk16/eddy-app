'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, ListChecks, Users, User } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/calendar', label: 'ปฏิทิน', icon: CalendarDays },
  { href: '/todo', label: 'งาน', icon: ListChecks },
  { href: '/groups', label: 'กลุ่ม', icon: Users },
  { href: '/profile', label: 'โปรไฟล์', icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-clay border border-eddy-100 bg-surface/90 px-2 py-2 shadow-clay backdrop-blur-md md:hidden">
      {navItems.map((item) => {
        const active = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex flex-1 flex-col items-center gap-1 rounded-clay-sm px-2 py-1.5 font-display text-[11px] font-semibold transition-colors duration-150 active:scale-95',
              active
                ? 'bg-eddy-100 text-ink'
                : 'text-ink-muted hover:text-ink-soft'
            )}
          >
            <Icon size={21} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
