'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value?: string; // "HH:mm" หรือค่าว่าง
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

const TIMES = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

export default function TimePicker({ value, onChange, id, placeholder = 'เลือกเวลา' }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // ต้องกันไม่ให้ Escape ไปถึง Modal ที่ครอบอยู่ (Modal ฟัง keydown บน document เหมือนกัน)
        // ใช้ capture phase เพื่อดักก่อน Modal's bubble-phase listener เสมอ ไม่ว่าจะลงทะเบียนก่อน/หลังกัน
        e.stopPropagation();
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClickOutside);
      document.addEventListener('keydown', onKeyDown, true);
      requestAnimationFrame(() => {
        listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' });
      });
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-clay-sm bg-eddy-50 px-4 py-2.5 font-body text-sm shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-eddy-300"
      >
        <Clock size={15} className="flex-shrink-0 text-ink-muted" />
        <span className={value ? 'text-ink' : 'text-ink-muted'}>{value || placeholder}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-20 max-h-56 w-full min-w-[120px] overflow-y-auto rounded-clay-sm bg-surface p-1.5 shadow-clay">
          <div ref={listRef} className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="rounded-clay-sm px-3 py-1.5 text-left font-body text-xs text-ink-muted hover:bg-eddy-50"
            >
              ไม่ระบุเวลา
            </button>
            {TIMES.map((t) => (
              <button
                key={t}
                type="button"
                data-selected={t === value}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={`rounded-clay-sm px-3 py-1.5 text-left font-body text-sm transition-colors ${
                  t === value ? 'bg-eddy-500 text-white' : 'text-ink hover:bg-eddy-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
