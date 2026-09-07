'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CalendarView } from '@/lib/types';

interface CalendarToolbarProps {
  view: CalendarView;
  title: string;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAdd: () => void;
  /** ปุ่มเสริมฝั่งขวา (Loop ประจำ / Google) - รับเป็น slot เพื่อไม่ต้องมีแถวปุ่มลอยอีกแถวเหนือ toolbar */
  extra?: ReactNode;
}

const viewLabels: Record<CalendarView, string> = {
  day: 'วัน',
  week: 'สัปดาห์',
  month: 'เดือน',
};

export default function CalendarToolbar({
  view,
  title,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onAdd,
  extra,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onToday}
          className="rounded-full border border-eddy-200 bg-white px-4 py-2 font-display text-caption font-semibold text-eddy-700 transition-all hover:bg-eddy-50 active:scale-95"
        >
          วันนี้
        </button>
        <div className="flex items-center">
          <button
            onClick={onPrev}
            className="rounded-full p-2 text-eddy-600 transition-colors hover:bg-eddy-50 active:scale-90"
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onNext}
            className="rounded-full p-2 text-eddy-600 transition-colors hover:bg-eddy-50 active:scale-90"
            aria-label="ถัดไป"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <h2 className="ml-1 font-display text-h3 text-ink">{title}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {extra}
        {extra && <span className="mx-0.5 hidden h-6 w-px bg-eddy-100 sm:block" />}

        {/* ตัวสลับมุมมอง วัน/สัปดาห์/เดือน (segmented control - pill เลื่อนลื่นด้วย layoutId) */}
        <div className="relative flex rounded-clay-sm bg-eddy-50 p-1">
          {(Object.keys(viewLabels) as CalendarView[]).map((v) => {
            const activeV = view === v;
            return (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                className={`relative rounded-[8px] px-3.5 py-1.5 font-display text-caption font-semibold transition-colors ${
                  activeV ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'
                }`}
              >
                {activeV && (
                  <motion.span
                    layoutId="calendar-view-pill"
                    className="absolute inset-0 rounded-[6px] bg-white shadow-clay-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative z-10">{viewLabels[v]}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-5 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 active:scale-95"
        >
          <Plus size={15} /> เพิ่มกิจกรรม
        </button>
      </div>
    </div>
  );
}
