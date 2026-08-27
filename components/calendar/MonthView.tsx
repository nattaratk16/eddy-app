'use client';

import { useMemo } from 'react';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Plus } from 'lucide-react';
import { getColorOption } from '@/lib/colors';
import { timeToMinutes } from '@/lib/calendarLayout';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

// ตัวย่อภาษาไทยแบบมาตรฐาน - ย่อเหลือตัวเดียวไม่ได้เพราะ "อาทิตย์" กับ "อังคาร" จะกลายเป็น "อ" เหมือนกัน
const weekDayLabels = [
  { full: 'อาทิตย์', short: 'อา.' },
  { full: 'จันทร์', short: 'จ.' },
  { full: 'อังคาร', short: 'อ.' },
  { full: 'พุธ', short: 'พ.' },
  { full: 'พฤหัส', short: 'พฤ.' },
  { full: 'ศุกร์', short: 'ศ.' },
  { full: 'เสาร์', short: 'ส.' },
];
const MAX_CHIPS = 3;

interface MonthViewProps {
  currentMonth: Date;
  events: CalendarEvent[];
  categories: CalendarCategory[];
  /** ปุ่ม + ที่โผล่ตอนชี้เมาส์ในช่องวัน → เพิ่มกิจกรรมวันนั้นทันที */
  onAddOnDay: (day: Date) => void;
  /** คลิกช่องวัน / เลขวัน / "+N เพิ่มเติม" → เปิดไทม์ไลน์ของวันนั้น */
  onOpenDay: (day: Date) => void;
  /** คลิกกิจกรรม → แก้ไข */
  onEventClick: (event: CalendarEvent) => void;
}

export default function MonthView({
  currentMonth,
  events,
  categories,
  onAddOnDay,
  onOpenDay,
  onEventClick,
}: MonthViewProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const result: Date[] = [];
    let day = start;
    while (day <= end) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [currentMonth]);

  const categoryOf = (ev: CalendarEvent) => categories.find((c) => c.id === ev.categoryId);

  const eventsForDay = (day: Date) =>
    events
      .filter((ev) => isSameDay(new Date(ev.date), day))
      // เรียงตามเวลาเริ่ม (ไม่มีเวลา = กิจกรรมทั้งวัน ขึ้นก่อน)
      .sort((a, b) => (timeToMinutes(a.startTime) ?? -1) - (timeToMinutes(b.startTime) ?? -1));

  return (
    <div className="overflow-hidden rounded-clay-sm border border-eddy-100">
      {/* หัวตารางชื่อวัน */}
      <div className="grid grid-cols-7 border-b border-eddy-100 bg-eddy-50/50">
        {weekDayLabels.map((d) => (
          <div
            key={d.full}
            className="min-w-0 truncate px-1 py-2 text-center font-display text-xs font-semibold text-ink-muted"
          >
            <span className="hidden lg:inline">{d.full}</span>
            <span className="lg:hidden">{d.short}</span>
          </div>
        ))}
      </div>

      {/* ตารางวัน */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <div
              key={day.toISOString()}
              onClick={() => onOpenDay(day)}
              title="คลิกเพื่อดูไทม์ไลน์ของวันนี้"
              // min-w-0 + overflow-hidden สำคัญมาก: ถ้าไม่ใส่ ชื่อกิจกรรมยาวๆ จะดันคอลัมน์นั้นให้กว้าง
              // แล้วคอลัมน์ที่เหลือ (โดยเฉพาะอาทิตย์ที่อยู่ซ้ายสุด) จะถูกบีบจนเลขวันที่เบียดกัน
              className={`group flex min-h-[112px] min-w-0 cursor-pointer flex-col gap-1 overflow-hidden border-b border-r border-eddy-100 p-2 transition-colors [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0 hover:bg-eddy-50/40 ${
                !inMonth ? 'bg-eddy-50/30' : isWeekend ? 'bg-eddy-50/40' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDay(day);
                  }}
                  className={`flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 font-display text-xs font-semibold transition-colors ${
                    today
                      ? 'bg-eddy-500 text-white'
                      : inMonth
                      ? 'text-ink hover:bg-eddy-100'
                      : 'text-ink-muted/60 hover:bg-eddy-100'
                  }`}
                >
                  {format(day, 'd')}
                </button>
                {/* ปุ่มเพิ่มด่วน - โผล่ตอนชี้เมาส์ที่ช่องวัน (คลิกที่ช่องเปล่าๆ = ดูไทม์ไลน์) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddOnDay(day);
                  }}
                  aria-label={`เพิ่มกิจกรรมวันที่ ${format(day, 'd')}`}
                  title="เพิ่มกิจกรรมในวันนี้"
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-ink-muted opacity-0 transition-opacity hover:bg-eddy-100 hover:text-eddy-600 focus:opacity-100 group-hover:opacity-100"
                >
                  <Plus size={13} />
                </button>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-0.5">
                {dayEvents.slice(0, MAX_CHIPS).map((ev) => {
                  const cat = categoryOf(ev);
                  const color = cat ? getColorOption(cat.color) : null;
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(ev);
                      }}
                      className="flex w-full min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left font-body text-[11px] text-ink transition-colors hover:bg-white"
                    >
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${color ? color.dotClass : 'bg-eddy-300'}`} />
                      {ev.startTime && <span className="flex-shrink-0 text-ink-muted">{ev.startTime}</span>}
                      <span className="truncate">{ev.title}</span>
                    </button>
                  );
                })}
                {dayEvents.length > MAX_CHIPS && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDay(day);
                    }}
                    className="px-1 text-left font-body text-[10px] font-semibold text-eddy-600 hover:underline"
                  >
                    +{dayEvents.length - MAX_CHIPS} เพิ่มเติม
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
