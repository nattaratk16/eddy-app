'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_STORAGE_KEY } from './ThemeScript';

type Choice = 'light' | 'dark' | 'system';

const OPTIONS: { value: Choice; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'สว่าง', icon: Sun },
  { value: 'dark', label: 'มืด', icon: Moon },
  { value: 'system', label: 'ตามระบบ', icon: Monitor },
];

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** ทาคลาส .dark บน <html> ตามตัวเลือก - ตรรกะเดียวกับ ThemeScript ที่รันตอนโหลดหน้า */
function apply(choice: Choice) {
  const dark = choice === 'dark' || (choice === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

export default function ThemeToggle() {
  // เริ่มที่ 'system' เสมอตอน render ฝั่งเซิร์ฟเวอร์ แล้วค่อยอ่านค่าจริงใน effect
  // (อ่าน localStorage ตอน render ตรงๆ ไม่ได้ เพราะเซิร์ฟเวอร์ไม่มี แล้ว markup จะไม่ตรงกัน)
  const [choice, setChoice] = useState<Choice>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setChoice(saved);
    } catch {
      /* อ่านไม่ได้ก็ถือว่าตามระบบ */
    }
    setReady(true);
  }, []);

  // เลือก "ตามระบบ" ไว้ -> ผู้ใช้สลับธีมใน OS ระหว่างเปิดแอปอยู่ ต้องเปลี่ยนตามทันที
  useEffect(() => {
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  function pick(next: Choice) {
    setChoice(next);
    apply(next);
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* เขียนไม่ได้ก็ยังเปลี่ยนธีมในหน้านี้ได้ แค่ไม่ถูกจำไว้รอบหน้า */
    }
  }

  return (
    <div className="inline-flex rounded-clay-sm bg-eddy-50 p-1" role="group" aria-label="ธีมของแอป">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = ready && choice === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => pick(value)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 font-display text-caption font-semibold transition-colors ${
              active ? 'bg-surface text-ink shadow-clay-sm' : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
