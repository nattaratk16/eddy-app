'use client';

import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';

const miniWeekLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const thMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

interface MiniCalendarProps {
  /** วันที่ที่เลือกอยู่ในมุมมองหลัก - มินิปฏิทินจะไฮไลต์ให้ */
  selectedDate: Date;
  /** กิจกรรมทั้งหมด (ที่มองเห็นได้) ใช้ขึ้นจุดเล็กใต้วันที่มีกิจกรรม */
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
}

export default function MiniCalendar({ selectedDate, events, onSelectDate }: MiniCalendarProps) {
  // เดือนที่มินิปฏิทินกำลังแสดง (เลื่อนแยกจากมุมมองหลักได้ เหมือน Google)
  const [viewMonth, setViewMonth] = useState(selectedDate);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth));
    const end = endOfWeek(endOfMonth(viewMonth));
    const result: Date[] = [];
    let day = start;
    while (day <= end) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [viewMonth]);

  const daysWithEvents = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) set.add(ev.date);
    return set;
  }, [events]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-sm font-bold text-ink">
          {thMonths[viewMonth.getMonth()]} {viewMonth.getFullYear() + 543}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            className="rounded-full p-1 text-ink-muted transition-colors hover:bg-eddy-50 hover:text-eddy-600"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="rounded-full p-1 text-ink-muted transition-colors hover:bg-eddy-50 hover:text-eddy-600"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center">
        {miniWeekLabels.map((d) => (
          <div key={d} className="py-1 font-body text-[10px] font-semibold text-ink-muted">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const inMonth = isSameMonth(day, viewMonth);
          const hasEvents = daysWithEvents.has(format(day, 'yyyy-MM-dd'));
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full font-body text-xs transition-colors ${
                selected
                  ? 'bg-eddy-500 font-semibold text-white'
                  : today
                  ? 'font-semibold text-eddy-600 hover:bg-eddy-50'
                  : inMonth
                  ? 'text-ink-soft hover:bg-eddy-50'
                  : 'text-ink-muted/50 hover:bg-eddy-50'
              }`}
            >
              {format(day, 'd')}
              {hasEvents && !selected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-eddy-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
