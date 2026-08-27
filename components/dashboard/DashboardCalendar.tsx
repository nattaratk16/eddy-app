'use client';

/**
 * ปฏิทินเดือนของหน้า Dashboard
 * --------------------------------------------------------------
 * เดิมหน้า Dashboard มี 2 การ์ดที่เล่าเรื่องเดียวกัน:
 *   - มินิปฏิทิน: บอกได้แค่ว่า "วันไหนมีกิจกรรม" ด้วยจุดสี
 *   - ตารางสัปดาห์นี้: บอกชื่อกิจกรรม แต่เห็นแค่ 7 วัน
 * รวมเป็นอันเดียว: ปฏิทินทั้งเดือนที่โชว์ชื่อกิจกรรมในช่องวันเลย
 * เรียงตามเวลา ถ้าวันไหนเยอะเกินช่องก็บอกว่าเหลืออีกกี่รายการ
 * แล้วกดที่วันเพื่อดูรายละเอียดทั้งวันแบบไทม์ไลน์
 * --------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { ArrowRight, CalendarDays } from 'lucide-react';
import clsx from 'clsx';
import Modal from '@/components/Modal';
import DayTimeline from '@/components/calendar/DayTimeline';
import { getColorOption } from '@/lib/colors';
import { timeToMinutes } from '@/lib/calendarLayout';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

const weekDayLabels = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
const thMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
/** จำนวนกิจกรรมที่โชว์ในช่องวันก่อนจะยุบเป็น "+N" */
const MAX_CHIPS = 3;

interface DashboardCalendarProps {
  /** กิจกรรมทั้งเดือนที่แสดงอยู่ (โหลดมาจากฝั่งเซิร์ฟเวอร์แล้ว) */
  events: CalendarEvent[];
  categories: CalendarCategory[];
  /** วันนี้ตามเวลาเซิร์ฟเวอร์ - ส่งมาเป็น ISO เพื่อให้ตรงกับข้อมูลที่ query มา */
  todayISO: string;
}

export default function DashboardCalendar({ events, categories, todayISO }: DashboardCalendarProps) {
  const router = useRouter();
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const today = useMemo(() => new Date(`${todayISO}T00:00:00`), [todayISO]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(today));
    const end = endOfWeek(endOfMonth(today));
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [today]);

  // จัดกลุ่มกิจกรรมตามวัน + เรียงตามเวลาเริ่ม (ไม่ระบุเวลา = กิจกรรมทั้งวัน ขึ้นก่อน)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (timeToMinutes(a.startTime) ?? -1) - (timeToMinutes(b.startTime) ?? -1));
    }
    return map;
  }, [events]);

  const categoryOf = (ev: CalendarEvent) => categories.find((c) => c.id === ev.categoryId);
  const dayEvents = (day: Date) => eventsByDate.get(format(day, 'yyyy-MM-dd')) ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-display text-h3 text-ink">
          <CalendarDays size={18} className="text-eddy-500" />
          {thMonths[today.getMonth()]} {today.getFullYear() + 543}
        </h2>
        <Link
          href="/calendar"
          className="flex items-center gap-1 font-body text-caption font-semibold text-eddy-600 transition-colors hover:underline"
        >
          เปิดปฏิทินเต็ม <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-clay-sm border border-eddy-100">
        {/* หัวตารางชื่อวัน */}
        <div className="grid grid-cols-7 border-b border-eddy-100 bg-eddy-50/60">
          {weekDayLabels.map((d) => (
            <div key={d} className="py-2 text-center font-display text-xs font-semibold text-ink-muted">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const list = dayEvents(day);
            const inMonth = isSameMonth(day, today);
            const isCurrent = isToday(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setOpenDay(day)}
                title={`ดูกิจกรรมของวันที่ ${format(day, 'd')} ทั้งหมด`}
                className={clsx(
                  'flex min-h-[104px] flex-col gap-1 border-b border-r border-eddy-100 p-1.5 text-left transition-colors last:border-r-0 hover:bg-eddy-50/60',
                  inMonth ? 'bg-white' : 'bg-eddy-50/30',
                )}
              >
                <span
                  className={clsx(
                    'flex h-6 w-6 flex-shrink-0 items-center justify-center self-end rounded-full font-display text-xs font-semibold',
                    isCurrent ? 'bg-eddy-500 text-white' : inMonth ? 'text-ink' : 'text-ink-muted/60',
                  )}
                >
                  {format(day, 'd')}
                </span>

                <span className="flex min-w-0 flex-col gap-0.5">
                  {list.slice(0, MAX_CHIPS).map((ev) => {
                    const cat = categoryOf(ev);
                    const color = cat ? getColorOption(cat.color) : null;
                    return (
                      <span key={ev.id} className="flex items-center gap-1 truncate font-body text-[11px] text-ink">
                        <span
                          className={clsx('h-1.5 w-1.5 flex-shrink-0 rounded-full', color ? color.dotClass : 'bg-eddy-300')}
                        />
                        {ev.startTime && <span className="flex-shrink-0 text-ink-muted">{ev.startTime}</span>}
                        <span className="truncate">{ev.title}</span>
                      </span>
                    );
                  })}
                  {list.length > MAX_CHIPS && (
                    <span className="px-1 font-body text-[10px] font-semibold text-eddy-600">
                      +{list.length - MAX_CHIPS} รายการ
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* กดที่วัน -> ไทม์ไลน์ของวันนั้นทั้งวัน (คอมโพเนนต์เดียวกับที่ใช้ในหน้าปฏิทิน) */}
      <Modal
        open={openDay !== null}
        onClose={() => setOpenDay(null)}
        title={
          openDay
            ? `${openDay.getDate()} ${thMonths[openDay.getMonth()]} ${openDay.getFullYear() + 543}`
            : ''
        }
        maxWidth="max-w-lg"
      >
        {openDay && (
          <DayTimeline
            events={events.filter((ev) => isSameDay(new Date(ev.date), openDay))}
            categories={categories}
            // หน้า Dashboard ไม่มีฟอร์มแก้ไข - พาไปที่หน้าปฏิทินของวันนั้นแทน
            onEventClick={() => router.push(`/calendar?date=${format(openDay, 'yyyy-MM-dd')}`)}
            onAdd={() => router.push(`/calendar?date=${format(openDay, 'yyyy-MM-dd')}`)}
            onOpenDayView={() => router.push(`/calendar?date=${format(openDay, 'yyyy-MM-dd')}`)}
          />
        )}
      </Modal>
    </>
  );
}
