'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  label: string;
  icon?: ReactNode;
  badge?: number | null; // ตัวเลขมุมปุ่ม (เช่นจำนวน Loop)
  dotClass?: string; // จุดสถานะเล็ก ๆ (เช่น เชื่อม Google = เขียว)
  width?: string; // คลาสความกว้างของ panel เช่น 'w-80'
  children: ReactNode | ((close: () => void) => ReactNode);
}

export default function Popover({ label, icon, badge, dotClass, width = 'w-80', children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-display text-caption font-semibold transition-colors ${
          open ? 'border-eddy-400 bg-eddy-50 text-ink' : 'border-eddy-200 bg-surface text-ink-soft hover:bg-eddy-50'
        }`}
      >
        {dotClass && <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />}
        {icon}
        {label}
        {badge != null && badge > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-inverse px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute right-0 z-30 mt-2 max-h-[72vh] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-clay border border-eddy-100 bg-surface p-4 shadow-glow ${width}`}
          >
            {typeof children === 'function' ? children(() => setOpen(false)) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
