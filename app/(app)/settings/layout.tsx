import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SettingsNav from '@/components/settings/SettingsNav';

// โครงหน้าตั้งค่า: เมนูหัวข้อด้านซ้าย + เนื้อหาของแท็บที่เลือกด้านขวา
// หัวข้อทั้งหมดมาจาก SETTINGS_NAV ใน components/settings/SettingsNav.tsx ที่เดียว
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 md:px-10">
      <header className="flex flex-col gap-1 pt-8">
        <Link
          href="/profile"
          className="flex w-fit items-center gap-1.5 font-body text-caption font-semibold text-ink-muted transition-colors hover:text-eddy-600"
        >
          <ArrowLeft size={14} /> กลับไปหน้าโปรไฟล์
        </Link>
        <h1 className="font-display text-h1 text-ink">ตั้งค่า</h1>
      </header>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 pb-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-clay bg-eddy-50/70 p-2 lg:sticky lg:top-6">
          <SettingsNav />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
