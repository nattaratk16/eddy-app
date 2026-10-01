'use client';

import { useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import EddyMascot from '@/components/EddyMascot';
import type { CalendarEvent } from '@/lib/types';

/**
 * สรุปสัปดาห์จากเอ็ดดี้ - แสดงค้างไว้ใต้ปฏิทินเลย (เดิมซ่อนอยู่ใน popover ที่ต้องกดเปิด)
 *
 * ข้อความมาจาก AI ถ้าเรียกสำเร็จ ระหว่างรอจะเห็นฉบับที่คำนวณในเครื่องไปก่อน
 * กล่องสถิติตัวเลข (กิจกรรม/เวลารวม/วันแน่นที่สุด/หมวดหลัก) แยกออกไปอยู่ที่ WeekStatsCard
 * ใน sidebar ซ้ายของปฏิทินแล้ว ที่นี่เหลือแค่ข้อความสรุปจาก AI
 */
interface Props {
  summary: string;
  /** ช่วงวันของสัปดาห์ที่กำลังสรุป เช่น "7 – 13 ก.ย. 2569" */
  rangeLabel: string;
  /** กิจกรรมในสัปดาห์นั้น - ใช้แค่เช็คว่าสัปดาห์นี้ว่างมั้ยสำหรับท่าทางของเอ็ดดี้ */
  weekEvents: CalendarEvent[];
  /** ยังรอ AI อยู่ - ข้อความที่เห็นตอนนี้ยังเป็นฉบับคำนวณในเครื่อง */
  loading: boolean;
}

export default function WeeklySummaryPanel({ summary, rangeLabel, weekEvents, loading }: Props) {
  const empty = weekEvents.length === 0;

  const paragraphs = useMemo(
    () =>
      summary
        .replace(/\*\*/g, '') // Gemini ชอบแถวตัวหนาแบบ markdown มาให้ แต่ตรงนี้เรนเดอร์เป็นข้อความล้วน
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [summary],
  );

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

        <div className="mt-4 min-w-0 rounded-clay-sm border-l-[3px] border-eddy-200 bg-eddy-50/60 px-4 py-3">
          {paragraphs.map((p, i) => (
            <p key={i} className={`font-body text-body-lg leading-[1.9] text-ink ${i > 0 ? 'mt-2' : ''}`}>
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
