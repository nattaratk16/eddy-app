'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value?: string; // "HH:mm" หรือค่าว่าง
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

const TIMES = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

const LIST_WIDTH = 140;
const LIST_EST_HEIGHT = 224; // max-h-56

/**
 * popover render ผ่าน portal ไปที่ document.body เพื่อไม่ให้โดน overflow-hidden ของ container ที่ครอบอยู่ตัดขอบ
 * (เจอปัญหานี้ตอนใช้ใน multi-day-panel ที่มี overflow-hidden - ดรอปดาวน์โดนบังเหลือแค่ 2-3 แถว)
 */
export default function TimePicker({ value, onChange, id, placeholder = 'เลือกเวลา', disabled = false }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ถ้าโดนปิดใช้งานขณะ dropdown เปิดค้างอยู่ (เช่น ผู้ใช้ลบวันกำหนดส่งทิ้งทั้งที่ช่องเวลายังเปิดอยู่)
  // ต้องปิด open ไปด้วย ไม่งั้นพอกลับมาเปิดใช้งานได้อีกครั้ง dropdown จะโผล่มาเองทันทีโดยไม่ได้กดปุ่มเลย
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, LIST_WIDTH);
      const left = Math.min(Math.max(rect.left, 8), window.innerWidth - width - 8);
      const fitsBelow = rect.bottom + 6 + LIST_EST_HEIGHT <= window.innerHeight;
      const top = fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - 6 - LIST_EST_HEIGHT);
      setCoords({ top, left, width });
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // กัน Escape ไหลไปปิด Modal ที่ครอบอยู่
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
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-clay-sm bg-eddy-50 px-4 py-2.5 font-body text-sm shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-eddy-300 disabled:opacity-40"
      >
        <Clock size={15} className="flex-shrink-0 text-ink-muted" />
        <span className={value ? 'text-ink' : 'text-ink-muted'}>{value || placeholder}</span>
      </button>

      {open &&
        !disabled &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
            className="z-50 max-h-56 overflow-y-auto rounded-clay-sm bg-surface p-1.5 shadow-clay"
          >
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
          </div>,
          document.body
        )}
    </>
  );
}
