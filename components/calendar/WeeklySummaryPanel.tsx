'use client';

import { useMemo, type ReactNode } from 'react';
import { CalendarDays, CalendarRange, Clock3, Flame } from 'lucide-react';
import EddyMascot from '@/components/EddyMascot';
import { getColorOption } from '@/lib/colors';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

/**
 * สรุปสัปดาห์จากเอ็ดดี้ - แสดงค้างไว้ใต้ปฏิทินเลย (เดิมซ่อนอยู่ใน popover ที่ต้องกดเปิด)
 *
 * ข้อความมาจาก AI ถ้าเรียกสำเร็จ ระหว่างรอจะเห็นฉบับที่คำนวณในเครื่องไปก่อน
 * ตัวเลขในแถบล่างคำนวณจาก weekEvents ชุดเดียวกับที่ส่งให้ AI - ที่อ่านกับที่นับจึงตรงกันเสมอ
 */
interface Props {
  summary: string;
  /** ช่วงวันของสัปดาห์ที่กำลังสรุป เช่น "7 – 13 ก.ย. 2569" */
  rangeLabel: string;
  /** กิจกรรมในสัปดาห์นั้น (ชุดเดียวกับที่ส่งให้ AI) */
  weekEvents: CalendarEvent[];
  categories: CalendarCategory[];
  /** ยังรอ AI อยู่ - ข้อความที่เห็นตอนนี้ยังเป็นฉบับคำนวณในเครื่อง */
  loading: boolean;
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

export default function WeeklySummaryPanel({ summary, rangeLabel, weekEvents, categories, loading }: Props) {
  const stats = useMemo(() => {
    const byDate = new Map<string, number>();
    const byCategory = new Map<string, number>();
    let totalMinutes = 0;
    for (const ev of weekEvents) {
      byDate.set(ev.date, (byDate.get(ev.date) ?? 0) + 1);
      byCategory.set(ev.categoryId, (byCategory.get(ev.categoryId) ?? 0) + 1);
      totalMinutes += minutesOf(ev);
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
  }, [weekEvents, categories]);

  // ev.date เป็นป้ายวันที่ (YYYY-MM-DD) ไม่ใช่เวลาจริง จึงอ่านเป็น UTC ตรงๆ ไม่ให้เลื่อนวันตามโซนเวลาเครื่อง
  const busiestLabel = stats.busiestDate
    ? new Date(`${stats.busiestDate}T00:00:00.000Z`).toLocaleDateString('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    : null;

  const paragraphs = useMemo(
    () =>
      summary
        .replace(/\*\*/g, '') // Gemini ชอบแถวตัวหนาแบบ markdown มาให้ แต่ตรงนี้เรนเดอร์เป็นข้อความล้วน
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [summary],
  );

  const empty = stats.count === 0;

  // ป้ายสั้นๆ เพราะแถบตัวเลขยืนเป็นคอลัมน์แคบข้างขวาตอนจอกว้าง (ป้ายซ้าย-ค่าขวาในบรรทัดเดียว)
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
    <section className="relative overflow-hidden rounded-clay border border-eddy-100 bg-surface shadow-clay">
      {/* แสงพาสเทลจางๆ กันกล่องดูแบน - อยู่หลังเนื้อหาและไม่รับคลิก */}
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-100/60 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-12 h-56 w-56 rounded-full bg-pastel-lilac/40 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <EddyMascot character="nova" mood={empty ? 'sleepy' : 'think'} size={44} float={false} className="flex-shrink-0" />
          <h2 className="font-display text-h3 text-ink">เอ็ดดี้สรุปสัปดาห์นี้</h2>
          <span className="flex items-center gap-1.5 rounded-full bg-eddy-50 px-2.5 py-1 font-display text-caption font-semibold text-eddy-700">
            <CalendarRange size={13} />
            {rangeLabel}
          </span>
          {loading && (
            <span className="flex items-center gap-1.5 font-body text-caption text-ink-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-eddy-400" />
              กำลังอ่านตารางให้ละเอียดอีกรอบ…
            </span>
          )}
        </div>

        {/* จอกว้าง: ข้อความซ้าย + แถบตัวเลขยืนเป็นคอลัมน์ขวา (ถ้าเรียงบน-ล่างเต็มความกว้าง
            ช่องตัวเลข 4 ช่องจะกว้างช่องละ ~350px แล้วดูโหวงเหวง) */}
        <div className={`mt-4 grid gap-4 ${empty ? '' : 'lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6'}`}>
          <div className="min-w-0 rounded-clay-sm border-l-[3px] border-eddy-200 bg-eddy-50/60 px-4 py-3">
            {paragraphs.map((p, i) => (
              <p key={i} className={`font-body text-body-lg leading-[1.9] text-ink ${i > 0 ? 'mt-2' : ''}`}>
                {p}
              </p>
            ))}
          </div>

          {!empty && (
            // เส้นคั่นบางๆ ได้จาก gap-px บนพื้นสีฟ้าอ่อน แล้วให้แต่ละช่องเป็นพื้นขาวทับ
            <dl className="grid grid-cols-1 gap-px self-start overflow-hidden rounded-clay-sm border border-eddy-100 bg-eddy-100 sm:grid-cols-2 lg:grid-cols-1">
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
          )}
        </div>
      </div>
    </section>
  );
}
