'use client';

/**
 * DayTimeline
 * --------------------------------------------------------------
 * ไทม์ไลน์ของ "หนึ่งวัน" ที่เปิดจากการคลิกช่องวันในมุมมองเดือน
 * แสดงว่าวันนั้นมีอะไรต้องทำบ้าง เรียงตามเวลา แล้วคลิกที่รายการเพื่อแก้ไขได้
 *
 * เดิมคลิกช่องวันแล้วเด้งฟอร์ม "เพิ่มกิจกรรม" ทันที ซึ่งใช้งานจริงไม่เวิร์ค
 * (อยากดูว่าวันนั้นมีอะไรบ้างก่อน ไม่ได้อยากเพิ่มทุกครั้ง)
 * --------------------------------------------------------------
 */
import { CalendarPlus, CalendarRange, Clock, Flag, MapPin, Pencil, Lock } from 'lucide-react';
import clsx from 'clsx';
import EddyMascot from '@/components/EddyMascot';
import { getEventColor } from '@/lib/colors';
import { timeToMinutes } from '@/lib/calendarLayout';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

interface DayTimelineProps {
  /** กิจกรรมของวันนั้น (ยังไม่ต้องเรียง - จัดเรียงให้ในนี้) */
  events: CalendarEvent[];
  categories: CalendarCategory[];
  /** คลิกรายการที่แก้ไขได้ → เปิดฟอร์มแก้ไข */
  onEventClick: (event: CalendarEvent) => void;
  /** ปุ่มเพิ่มกิจกรรมในวันนี้ */
  onAdd: () => void;
  /** เปิดมุมมองรายวันเต็ม (ตารางเวลาแบบ Google) */
  onOpenDayView: () => void;
}

/** กิจกรรมที่ดึงมาจากที่อื่น แก้ไขจากปฏิทินปกติไม่ได้ */
function readOnlyLabel(ev: CalendarEvent): string | null {
  if (ev.source === 'google') return 'Google Calendar';
  if (ev.source === 'recurring') return 'Loop ประจำ';
  // แก้ที่หน้า To-do เท่านั้น - แก้ตรงนี้จะไม่ย้อนกลับไปอัปเดต Task.dueDate/dueTime
  // แล้วรอบซิงก์ถัดไปจะเขียนทับกลับเป็นค่าเดิม ผู้ใช้จะงงว่าทำไมแก้ไม่ติด
  if (ev.isDeadline) return 'กำหนดส่ง (แก้ที่ To-do)';
  return null;
}

export default function DayTimeline({ events, categories, onEventClick, onAdd, onOpenDayView }: DayTimelineProps) {
  // เรียงตามเวลาเริ่ม - กิจกรรมทั้งวัน (ไม่มีเวลา) ขึ้นก่อนสุด
  const sorted = [...events].sort((a, b) => (timeToMinutes(a.startTime) ?? -1) - (timeToMinutes(b.startTime) ?? -1));
  const categoryOf = (ev: CalendarEvent) => categories.find((c) => c.id === ev.categoryId);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <EddyMascot mood="happy" size={72} />
        <div>
          <p className="font-display text-body font-semibold text-ink">วันนี้ยังว่างอยู่</p>
          <p className="font-body text-xs text-ink-muted">ยังไม่มีอะไรในตารางวันนี้เลย</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-clay-sm bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110"
          >
            <CalendarPlus size={14} /> เพิ่มกิจกรรม
          </button>
          <button
            type="button"
            onClick={onOpenDayView}
            className="flex items-center gap-1.5 rounded-clay-sm bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted transition-colors hover:bg-eddy-100"
          >
            <CalendarRange size={14} /> เปิดตารางรายวัน
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative flex flex-col gap-2">
        {/* เส้นไทม์ไลน์แนวตั้ง */}
        <span className="absolute bottom-3 left-[58px] top-3 w-px bg-eddy-100" aria-hidden />

        {sorted.map((ev) => {
          const cat = categoryOf(ev);
          const color = getEventColor(ev.color, cat?.color);
          const locked = readOnlyLabel(ev);
          const fromTodo = ev.description === 'จากสิ่งที่ต้องทำ';

          return (
            <div key={ev.id} className="relative flex items-start gap-3">
              {/* คอลัมน์เวลา */}
              <div className="w-[46px] flex-shrink-0 pt-2 text-right font-display text-[11px] font-semibold text-ink-soft">
                {ev.startTime ?? 'ทั้งวัน'}
              </div>

              {/* จุดบนเส้นไทม์ไลน์ - หมุดกำหนดส่งใช้ไอคอนธงแทนจุดกลม ให้แยกออกจาก event/งานจริงตั้งแต่แรกเห็น */}
              {ev.isDeadline ? (
                <span className="relative z-10 mt-2.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-pastel-pink ring-2 ring-surface">
                  <Flag size={9} className="text-eddy-700" />
                </span>
              ) : (
                <span
                  className={clsx(
                    'relative z-10 mt-3 h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-surface',
                    color ? color.dotClass : 'bg-eddy-300',
                  )}
                  aria-hidden
                />
              )}

              {/* การ์ดรายการ - คลิกเพื่อแก้ไข (ถ้าแก้ได้) */}
              <button
                type="button"
                onClick={() => !locked && onEventClick(ev)}
                disabled={Boolean(locked)}
                className={clsx(
                  'group min-w-0 flex-1 rounded-clay-sm px-3 py-2 text-left transition-colors',
                  locked ? 'cursor-default bg-eddy-50/60' : 'bg-eddy-50 hover:bg-eddy-100',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-body text-sm text-ink">{ev.title}</span>
                  {locked ? (
                    <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 font-body text-[10px] text-ink-muted">
                      <Lock size={9} /> {locked}
                    </span>
                  ) : (
                    <Pencil size={13} className="flex-shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </div>

                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-body text-[11px] text-ink-muted">
                  {ev.startTime && ev.endTime && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {ev.startTime}-{ev.endTime}
                    </span>
                  )}
                  {cat && <span>{cat.name}</span>}
                  {ev.location && (
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin size={10} className="flex-shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </span>
                  )}
                  {ev.isDeadline ? (
                    <span className="flex items-center gap-1 rounded-full bg-pastel-pink px-2 py-0.5 font-display text-[10px] font-semibold text-eddy-700">
                      <Flag size={9} /> กำหนดส่ง
                    </span>
                  ) : (
                    fromTodo && (
                      <span className="rounded-full bg-pastel-lilac px-2 py-0.5 font-display text-[10px] font-semibold text-eddy-700">
                        จากสิ่งที่ต้องทำ
                      </span>
                    )
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-eddy-100 pt-3">
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-clay-sm bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110"
        >
          <CalendarPlus size={14} /> เพิ่มกิจกรรม
        </button>
        <button
          type="button"
          onClick={onOpenDayView}
          className="flex items-center gap-1.5 rounded-clay-sm bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted transition-colors hover:bg-eddy-100"
        >
          <CalendarRange size={14} /> เปิดตารางรายวัน
        </button>
      </div>
    </div>
  );
}
