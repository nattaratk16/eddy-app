'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { ChevronLeft, ChevronRight, CalendarRange, ArrowRight } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string; // ISO yyyy-MM-dd
  endDate: string; // ISO yyyy-MM-dd (>= startDate)
  onChange: (start: string, end: string) => void;
  id?: string;
}

const POPOVER_WIDTH = 288; // w-72
const POPOVER_EST_HEIGHT = 360;

const weekLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const monthsFull = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// แปลง ISO string -> Date แบบ local component (ปี/เดือน/วัน) ตรงๆ ไม่ผ่าน UTC parsing
// กันปัญหาเขตเวลาเหมือนที่ eventDateRangeISO/isEventOnDateISO ใช้ string compare แทน Date compare
function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function formatRangeLabel(startISO: string, endISO: string): string {
  const s = parseLocal(startISO);
  const e = parseLocal(endISO || startISO);
  const sYear = s.getFullYear() + 543;
  const eYear = e.getFullYear() + 543;
  if (isSameDay(s, e)) return `${s.getDate()} ${monthsShort[s.getMonth()]} ${sYear}`;
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} ${monthsShort[s.getMonth()]} ${sYear}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} ${monthsShort[s.getMonth()]} – ${e.getDate()} ${monthsShort[e.getMonth()]} ${sYear}`;
  }
  return `${s.getDate()} ${monthsShort[s.getMonth()]} ${sYear} – ${e.getDate()} ${monthsShort[e.getMonth()]} ${eYear}`;
}

/**
 * ตัวเลือกช่วงวันที่แบบปฏิทินในตัว (คลิก 2 ครั้ง = เริ่ม/จบ) แทน input type="date" ของเบราว์เซอร์
 * popover render ผ่าน portal ไปที่ document.body เพราะแผงที่ครอบอยู่มี overflow-hidden (กันแสงเรืองประดับล้น)
 * ถ้า render เป็น absolute ธรรมดาในนั้น ปฏิทินจะโดนตัดขอบ
 */
export default function DateRangePicker({ startDate, endDate, onChange, id }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parseLocal(startDate || format(new Date(), 'yyyy-MM-dd')));
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setViewMonth(parseLocal(startDate || format(new Date(), 'yyyy-MM-dd')));
    setPendingStart(null);
    setHoverDate(null);
  }, [open, startDate]);

  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.min(Math.max(rect.left, 8), window.innerWidth - POPOVER_WIDTH - 8);
      const fitsBelow = rect.bottom + 6 + POPOVER_EST_HEIGHT <= window.innerHeight;
      const top = fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - 6 - POPOVER_EST_HEIGHT);
      setCoords({ top, left });
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
        // กัน Escape ไหลไปปิด Modal ที่ครอบอยู่ (เหมือน TimePicker)
        e.stopPropagation();
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClickOutside);
      document.addEventListener('keydown', onKeyDown, true);
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

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

  let rangeStart: Date;
  let rangeEnd: Date;
  if (pendingStart) {
    const other = hoverDate ?? pendingStart;
    rangeStart = other < pendingStart ? other : pendingStart;
    rangeEnd = other < pendingStart ? pendingStart : other;
  } else {
    rangeStart = parseLocal(startDate);
    rangeEnd = parseLocal(endDate || startDate);
  }

  function handleDayClick(day: Date) {
    if (!pendingStart) {
      setPendingStart(day);
      return;
    }
    const finalStart = day < pendingStart ? day : pendingStart;
    const finalEnd = day < pendingStart ? pendingStart : day;
    onChange(format(finalStart, 'yyyy-MM-dd'), format(finalEnd, 'yyyy-MM-dd'));
    setPendingStart(null);
    setHoverDate(null);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-clay-sm bg-eddy-50 px-4 py-2.5 font-body text-sm text-ink shadow-clay-inset transition-colors focus:outline-none focus:ring-2 focus:ring-eddy-300"
      >
        <CalendarRange size={15} className="flex-shrink-0 text-ink-muted" />
        <span>{formatRangeLabel(startDate, endDate)}</span>
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
            className="z-50 rounded-clay-sm bg-surface p-3 shadow-clay"
          >
            <div className="mb-1 flex items-center justify-between">
              <p className="font-display text-sm font-bold text-ink">
                {monthsFull[viewMonth.getMonth()]} {viewMonth.getFullYear() + 543}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  className="rounded-full p-1 text-ink-muted transition-colors hover:bg-eddy-50 hover:text-eddy-600"
                  aria-label="เดือนก่อนหน้า"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="rounded-full p-1 text-ink-muted transition-colors hover:bg-eddy-50 hover:text-eddy-600"
                  aria-label="เดือนถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* บอกชัดๆ ว่าต้องคลิก 2 ครั้ง (วันเริ่ม แล้วค่อยวันสิ้นสุด) - ขั้นตอนที่กำลังทำอยู่ไฮไลต์เป็นสีทึบ
                คนใช้ครั้งแรกจะได้ไม่งงว่าทำไมคลิกครั้งเดียวแล้ว popover ไม่ปิด */}
            <div className="mb-2.5 flex items-center gap-1">
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-1 font-body text-[11px] font-semibold transition-colors ${
                  !pendingStart ? 'bg-eddy-500 text-white' : 'bg-eddy-50 text-ink-muted'
                }`}
              >
                <span
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                    !pendingStart ? 'bg-white/25' : 'bg-eddy-200 text-ink-soft'
                  }`}
                >
                  1
                </span>
                วันเริ่ม
              </span>
              <ArrowRight size={12} className="flex-shrink-0 text-ink-muted" />
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-1 font-body text-[11px] font-semibold transition-colors ${
                  pendingStart ? 'bg-eddy-500 text-white' : 'bg-eddy-50 text-ink-muted'
                }`}
              >
                <span
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                    pendingStart ? 'bg-white/25' : 'bg-eddy-200 text-ink-soft'
                  }`}
                >
                  2
                </span>
                วันสิ้นสุด
              </span>
            </div>

            <div className="grid grid-cols-7 text-center">
              {weekLabels.map((d) => (
                <div key={d} className="py-1 font-body text-[10px] font-semibold text-ink-muted">
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const today = isToday(day);
                const isStart = isSameDay(day, rangeStart);
                const isEnd = isSameDay(day, rangeEnd);
                const isSingle = isSameDay(rangeStart, rangeEnd);
                const inRange = day > rangeStart && day < rangeEnd;
                const edge = isStart || isEnd;
                return (
                  <div
                    key={day.toISOString()}
                    className={`relative ${inRange ? 'bg-eddy-100' : ''} ${
                      isStart && !isSingle ? 'rounded-l-full bg-eddy-100' : ''
                    } ${isEnd && !isSingle ? 'rounded-r-full bg-eddy-100' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleDayClick(day)}
                      onMouseEnter={() => pendingStart && setHoverDate(day)}
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full font-body text-xs transition-colors ${
                        edge
                          ? 'bg-eddy-500 font-semibold text-white'
                          : today
                          ? 'font-semibold text-eddy-600 hover:bg-eddy-200/60'
                          : inMonth
                          ? 'text-ink-soft hover:bg-eddy-200/60'
                          : 'text-ink-muted/50 hover:bg-eddy-200/60'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
