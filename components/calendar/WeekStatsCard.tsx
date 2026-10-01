'use client';

import { useMemo, type ReactNode } from 'react';
import { CalendarDays, Clock3, Flame } from 'lucide-react';
import Card from '@/components/Card';
import { getColorOption } from '@/lib/colors';
import { eventDateRangeISO } from '@/lib/calendarLayout';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

/**
 * กล่องสถิติสัปดาห์แบบย่อ (กิจกรรม/เวลารวม/วันแน่นที่สุด/หมวดหลัก) - แยกออกมาจาก WeeklySummaryPanel
 * เดิม เพื่อไปอยู่ใน sidebar ซ้ายของปฏิทินแทน (ส่วนสรุปข้อความจาก AI ยังอยู่ที่ WeeklySummaryPanel เหมือนเดิม)
 */
interface Props {
  /** ช่วงวันของสัปดาห์ที่กำลังดู เช่น "7 – 13 ก.ย. 2569" */
  rangeLabel: string;
  /** ขอบเขตสัปดาห์ (ISO) - ใช้ตัดวันของกิจกรรมหลายวันให้เหลือเฉพาะวันที่อยู่ในสัปดาห์นี้จริงๆ */
  weekStartISO: string;
  weekEndISO: string;
  weekEvents: CalendarEvent[];
  categories: CalendarCategory[];
}

/** ความยาวของกิจกรรมเป็นนาที - หมุดวันส่ง/กิจกรรมที่ไม่ระบุเวลา = 0 (ไม่กินเวลาในตาราง) */
function minutesOf(ev: CalendarEvent): number {
  if (ev.isDeadline || !ev.startTime || !ev.endTime) return 0;
  const [sh, sm] = ev.startTime.split(':').map(Number);
  const [eh, em] = ev.endTime.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return Number.isFinite(mins) && mins > 0 ? mins : 0;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} นาที`;
  return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} น.`;
}

export default function WeekStatsCard({ rangeLabel, weekStartISO, weekEndISO, weekEvents, categories }: Props) {
  const stats = useMemo(() => {
    const byDate = new Map<string, number>();
    const byCategory = new Map<string, number>();
    let totalMinutes = 0;
    for (const ev of weekEvents) {
      // กิจกรรมหลายวัน (มี endDate) ต้องนับ "เวลารวม"/"แน่นที่สุด" ทุกวันที่มันครอบคลุม ไม่ใช่แค่วันเริ่ม
      // ไม่งั้นค่าย 5 วันจะโดนนับเป็นแค่ 1 วัน ตัวเลขน้อยกว่าภาระเวลาจริงมาก - ตัดเหลือเฉพาะวันที่อยู่ใน
      // สัปดาห์นี้ด้วย (filter ด้วย weekStartISO/weekEndISO) กันกิจกรรมที่ลากยาวข้ามสัปดาห์นับวันนอกสัปดาห์ปนมา
      const daysInWeek = eventDateRangeISO(ev.date, ev.endDate).filter((d) => d >= weekStartISO && d <= weekEndISO);
      for (const d of daysInWeek) {
        byDate.set(d, (byDate.get(d) ?? 0) + 1);
      }
      totalMinutes += minutesOf(ev) * daysInWeek.length;
      // "กิจกรรม"/"หมวดหลัก" นับเป็นชิ้นเหมือนเดิม (1 ต่ออีเวนต์) ไม่ขยายตามจำนวนวัน - มันคือกิจกรรมเดียวกัน
      byCategory.set(ev.categoryId, (byCategory.get(ev.categoryId) ?? 0) + 1);
    }
    // เท่ากันให้เอาวันที่มาก่อน จะได้ไม่สลับไปมาทุกครั้งที่ re-render
    const busiest = [...byDate.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      count: weekEvents.length,
      totalMinutes,
      busiestDate: busiest?.[0] ?? null,
      busiestCount: busiest?.[1] ?? 0,
      topCategory: top ? categories.find((c) => c.id === top[0]) ?? null : null,
      topCategoryCount: top?.[1] ?? 0,
    };
  }, [weekEvents, categories, weekStartISO, weekEndISO]);

  // ev.date เป็นป้ายวันที่ (YYYY-MM-DD) ไม่ใช่เวลาจริง จึงอ่านเป็น UTC ตรงๆ ไม่ให้เลื่อนวันตามโซนเวลาเครื่อง
  const busiestLabel = stats.busiestDate
    ? new Date(`${stats.busiestDate}T00:00:00.000Z`).toLocaleDateString('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    : null;

  if (stats.count === 0) return null; // ไม่มีกิจกรรมในสัปดาห์นี้ - ไม่ต้องโชว์กล่องว่างๆ ใน sidebar

  const facts: { icon: ReactNode; label: string; value: string }[] = [
    { icon: <CalendarDays size={12} />, label: 'กิจกรรม', value: `${stats.count} รายการ` },
    {
      icon: <Clock3 size={12} />,
      label: 'เวลารวม',
      value: stats.totalMinutes > 0 ? formatDuration(stats.totalMinutes) : 'ไม่ระบุเวลา',
    },
    {
      icon: <Flame size={12} />,
      label: 'แน่นที่สุด',
      value: busiestLabel ? `${busiestLabel} · ${stats.busiestCount}` : '-',
    },
    {
      icon: (
        <span
          className={`h-2 w-2 rounded-full ${
            stats.topCategory ? getColorOption(stats.topCategory.color).dotClass : 'bg-ink-muted/40'
          }`}
        />
      ),
      label: 'หมวดหลัก',
      value: stats.topCategory ? `${stats.topCategory.name} · ${stats.topCategoryCount}` : '-',
    },
  ];

  return (
    <Card className="!p-4">
      <h2 className="font-display text-h3 text-ink">สรุปสัปดาห์นี้</h2>
      <p className="mt-1 font-body text-caption text-ink-muted">{rangeLabel}</p>
      {/* เส้นคั่นบางๆ ได้จาก gap-px บนพื้นสีฟ้าอ่อน แล้วให้แต่ละช่องเป็นพื้นขาวทับ
          คอลัมน์เดียวเสมอ (ไม่ตามเบรกพอยต์จอแบบเดิม) เพราะตอนนี้อยู่ใน sidebar แคบตายตัว
          ไม่ใช่แผงกว้างเต็มจอแบบที่ออกแบบ sm:grid-cols-2 ไว้ตอนแรก - 2 คอลัมน์ในกรอบ 260px จะอัดจนข้อความโดนตัด */}
      <dl className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-clay-sm border border-eddy-100 bg-eddy-100">
        {facts.map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-3 bg-surface px-3 py-2">
            <dt className="flex flex-shrink-0 items-center gap-1.5 font-body text-micro text-ink-muted">
              {f.icon}
              {f.label}
            </dt>
            <dd className="truncate font-display text-caption font-semibold text-ink" title={f.value}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
