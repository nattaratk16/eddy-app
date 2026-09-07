'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { Flag } from 'lucide-react';
import { getEventColor } from '@/lib/colors';
import {
  DEFAULT_DURATION,
  HOUR_HEIGHT,
  layoutDayEvents,
  minutesToTime,
  timeToMinutes,
} from '@/lib/calendarLayout';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const weekDayShort = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

interface TimeGridViewProps {
  /** วันที่จะแสดง: 1 วัน (มุมมองวัน) หรือ 7 วัน (มุมมองสัปดาห์) */
  days: Date[];
  events: CalendarEvent[];
  categories: CalendarCategory[];
  /** คลิกช่องเวลาว่าง → เพิ่มกิจกรรม (ส่งวันและเวลาเริ่ม "HH:mm") */
  onAddSlot?: (day: Date, startTime: string) => void;
  /** คลิกกิจกรรม → แก้ไข */
  onEventClick?: (event: CalendarEvent) => void;
  /** อ่านอย่างเดียว (เช่น ปฏิทินกลุ่ม) - ปิดการคลิกช่องว่างเพื่อเพิ่ม */
  readOnly?: boolean;
}

export default function TimeGridView({
  days,
  events,
  categories,
  onAddSlot,
  onEventClick,
  readOnly = false,
}: TimeGridViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryOf = (ev: CalendarEvent) => categories.find((c) => c.id === ev.categoryId);

  // เวลาปัจจุบัน - อัปเดตทุกนาทีเพื่อขยับเส้นบอกเวลา
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // เลื่อนไปที่ ~7 โมงเช้าตอนเปิดครั้งแรก (เหมือน Google) แทนที่จะเริ่มที่เที่ยงคืน
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  // กิจกรรมทั้งวัน (ไม่มีเวลาเริ่ม) แยกออกไปแถบบนสุด
  const allDayByDay = useMemo(
    () => days.map((day) => events.filter((ev) => !ev.startTime && isSameDay(new Date(ev.date), day))),
    [days, events],
  );
  const hasAllDay = allDayByDay.some((list) => list.length > 0);

  // กิจกรรมที่มีเวลา จัดวางตำแหน่ง (คำนวณการเหลื่อมกัน) แยกตามวัน
  // หมุดกำหนดส่ง (isDeadline) ไม่เข้าลูปนี้ - ระยะเวลา 0 นาที ไม่ควรไปแย่งคอลัมน์กับ event/งานจริง
  // เพราะจะทำให้ทั้งคู่ถูกบีบแคบลงเหลือครึ่งความกว้างทั้งที่หมุดไม่ได้กินเวลาจริงเลย
  const timedByDay = useMemo(
    () =>
      days.map((day) => {
        const items = events
          .filter((ev) => ev.startTime && !ev.isDeadline && isSameDay(new Date(ev.date), day))
          .map((ev) => {
            const startMin = timeToMinutes(ev.startTime) as number;
            let endMin = timeToMinutes(ev.endTime) ?? startMin + DEFAULT_DURATION;
            if (endMin <= startMin) endMin = startMin + DEFAULT_DURATION;
            return { event: ev, startMin, endMin };
          });
        return layoutDayEvents(items);
      }),
    [days, events],
  );

  // หมุดกำหนดส่งที่ระบุเวลา - เรนเดอร์แยกเป็นเส้นขีดพาด + ไอคอนธง ปักทับได้อิสระ ไม่แย่งพื้นที่กับใคร
  const deadlinesByDay = useMemo(
    () =>
      days.map((day) =>
        events
          .filter((ev) => ev.isDeadline && ev.startTime && isSameDay(new Date(ev.date), day))
          .map((ev) => ({ event: ev, startMin: timeToMinutes(ev.startTime) as number })),
      ),
    [days, events],
  );

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const gridHeight = 24 * HOUR_HEIGHT;

  return (
    <div className="flex flex-col overflow-hidden rounded-clay-sm border border-eddy-100 bg-surface">
      {/* ---------- หัวตาราง: ชื่อวัน + วันที่ ---------- */}
      <div className="flex border-b border-eddy-100">
        <div className="w-14 flex-shrink-0" />
        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((day) => {
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className="border-l border-eddy-100 py-2 text-center first:border-l-0">
                <p className="font-body text-[11px] font-semibold text-ink-muted">
                  {weekDayShort[day.getDay()]}
                </p>
                <p
                  className={`mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold ${
                    today ? 'bg-gradient-to-br from-eddy-500 to-accent-500 text-white shadow-clay-sm' : 'text-ink'
                  }`}
                >
                  {format(day, 'd')}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- แถบกิจกรรมทั้งวัน ---------- */}
      {hasAllDay && (
        <div className="flex border-b border-eddy-100 bg-eddy-50/30">
          <div className="flex w-14 flex-shrink-0 items-center justify-center py-1 font-body text-[10px] text-ink-muted">
            ทั้งวัน
          </div>
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {allDayByDay.map((list, i) => (
              <div key={days[i].toISOString()} className="flex flex-col gap-0.5 border-l border-eddy-100 p-1 first:border-l-0">
                {list.map((ev) => {
                  const cat = categoryOf(ev);
                  const color = getEventColor(ev.color, cat?.color);
                  // หมุดกำหนดส่งไม่มีเวลาชัดเจน: ใส่กรอบเส้นประ+ไอคอนธงแทนพื้นทึบ
                  // ให้ตาแยกออกจาก event/งานจริงทันที และไม่ได้ล็อกเวลาไว้จริง ทับซ้อนกับอันอื่นได้เต็มที่
                  if (ev.isDeadline) {
                    return (
                      <span
                        key={ev.id}
                        title={ev.title}
                        className="flex items-center gap-1 truncate rounded border border-dashed border-eddy-400 bg-pastel-pink/40 px-1.5 py-0.5 text-left font-body text-[11px] font-semibold text-eddy-700"
                      >
                        <Flag size={10} className="flex-shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </span>
                    );
                  }
                  return (
                    <button
                      key={ev.id}
                      onClick={onEventClick ? () => onEventClick(ev) : undefined}
                      className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left font-body text-[11px] font-medium ${
                        onEventClick ? '' : 'cursor-default'
                      } ${color ? color.chipClass : 'bg-eddy-100 text-ink-muted'}`}
                    >
                      <span className="truncate">{ev.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- ตารางเวลา (เลื่อนได้) ---------- */}
      <div ref={scrollRef} className="max-h-[calc(100vh_-_260px)] min-h-[420px] overflow-y-auto">
        <div className="flex" style={{ height: gridHeight }}>
          {/* แกนเวลาด้านซ้าย */}
          <div className="w-14 flex-shrink-0">
            {HOURS.map((h) => (
              <div key={h} className="relative border-eddy-100" style={{ height: HOUR_HEIGHT }}>
                {h > 0 && (
                  <span className="absolute -top-2 right-2 font-body text-[10px] text-ink-muted">
                    {String(h).padStart(2, '0')}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* คอลัมน์แต่ละวัน */}
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((day, dayIdx) => {
              const positioned = timedByDay[dayIdx];
              const showNowLine = isToday(day);
              return (
                <div key={day.toISOString()} className="relative border-l border-eddy-100 first:border-l-0">
                  {/* ช่องเวลารายชั่วโมง (คลิกเพื่อเพิ่มกิจกรรม) */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      onClick={readOnly || !onAddSlot ? undefined : () => onAddSlot(day, minutesToTime(h * 60))}
                      className={`border-t border-eddy-100 first:border-t-0 ${readOnly || !onAddSlot ? '' : 'cursor-pointer transition-colors hover:bg-eddy-50/50'}`}
                      style={{ height: HOUR_HEIGHT }}
                    />
                  ))}

                  {/* บล็อกกิจกรรมที่มีเวลา */}
                  {positioned.map(({ event: ev, startMin, endMin, leftPct, widthPct }) => {
                    const cat = categoryOf(ev);
                    const color = getEventColor(ev.color, cat?.color);
                    const top = (startMin / 60) * HOUR_HEIGHT;
                    const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 18);
                    const compact = height < 34;
                    return (
                      <button
                        key={ev.id}
                        onClick={onEventClick ? (e) => { e.stopPropagation(); onEventClick(ev); } : undefined}
                        className={`absolute overflow-hidden rounded-md text-left shadow-clay-sm transition-all duration-150 hover:z-20 hover:-translate-y-px hover:shadow-clay-pop ${
                          onEventClick ? '' : 'cursor-default'
                        } ${color ? color.chipClass : 'bg-eddy-100 text-ink-muted'}`}
                        style={{
                          top,
                          height,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                      >
                        <span className={`absolute inset-y-0 left-0 w-1 ${color ? color.dotClass : 'bg-eddy-300'}`} />
                        <span className="block h-full pl-2 pr-1 pt-0.5">
                          <span className={`block truncate font-body font-semibold leading-tight ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                            {ev.title}
                          </span>
                          {!compact && (
                            <span className="mt-0.5 block truncate font-body text-[10px] opacity-80">
                              {ev.startTime}
                              {ev.endTime ? `–${ev.endTime}` : ''}
                              {ev.location ? ` · ${ev.location}` : ''}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}

                  {/* หมุดกำหนดส่ง: เส้นขีดพาด + ไอคอนธงปักไว้ข้างเวลา - ไม่ใช่กล่องทึบ ไม่กินพื้นที่สเกลเวลา
                      pointer-events-none เพราะแก้ตรงนี้ไม่ได้ (ต้องแก้ที่หน้า To-do) ไม่ต้องให้ดูเหมือนกดได้ */}
                  {deadlinesByDay[dayIdx].map(({ event: ev, startMin }) => (
                    <div
                      key={ev.id}
                      title={`กำหนดส่ง ${ev.title} (${ev.startTime})`}
                      className="pointer-events-none absolute inset-x-0.5 z-10 flex items-center gap-1"
                      style={{ top: (startMin / 60) * HOUR_HEIGHT }}
                    >
                      <span className="flex flex-shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-pastel-pink px-1.5 py-0.5 font-display text-[10px] font-bold text-eddy-700 shadow-clay-sm">
                        <Flag size={9} className="flex-shrink-0" /> {ev.startTime}
                      </span>
                      <span className="h-px min-w-0 flex-1 border-t border-dashed border-eddy-400" />
                    </div>
                  ))}

                  {/* เส้นบอกเวลาปัจจุบัน (เฉพาะคอลัมน์ของวันนี้) */}
                  {showNowLine && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                      style={{ top: (nowMin / 60) * HOUR_HEIGHT }}
                    >
                      <span className="-ml-1 h-2.5 w-2.5 flex-shrink-0 animate-pulse-dot rounded-full bg-rose-500" />
                      <span className="h-px flex-1 bg-rose-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
