'use client';

/**
 * EisenhowerPieChart — โดนัท 2 เสี้ยว "วันนี้หมดเวลาไปกับงานด่วน+สำคัญ หรือด่วนแต่ไม่สำคัญ มากกว่ากัน"
 * --------------------------------------------------------------
 * ยึดตามเมทริกซ์ไอเซนฮาวร์ แต่โชว์แค่ 2 เสี้ยวตามที่ขอ (เฉพาะงาน "ด่วน" แบ่งตาม "สำคัญ"/"ไม่สำคัญ")
 * ข้อมูลคำนวณที่ lib/eisenhowerToday.ts ฝั่งเซิร์ฟเวอร์แล้วส่งมาเป็น prop ตรงๆ (ไม่ต้อง fetch เอง)
 *
 * นิยาม "ด่วน"/"สำคัญ" ใช้เกณฑ์เดียวกับกราฟความเสี่ยงหมดไฟ (dueDate ถึงกำหนดแล้ว / priority=high)
 * และนับเฉพาะกิจกรรมวันนี้ที่มาจากสิ่งที่ต้องทำจริง (มี sourceTaskId) - กิจกรรมทั่วไปไม่มีสัญญาณ
 * สำคัญ/ด่วนให้จัดหมวด เลยไม่ถูกนับ (ดูรายละเอียดที่ lib/eisenhowerToday.ts)
 * --------------------------------------------------------------
 */
import { useState } from 'react';
import clsx from 'clsx';
import { computeDonutSlices } from '@/lib/donutGeometry';
import type { EisenhowerSplit } from '@/lib/eisenhowerToday';

interface EisenhowerPieChartProps {
  split: EisenhowerSplit;
  className?: string;
}

const SIZE = 160;
const CENTER = SIZE / 2;
const RADIUS = 58;
const STROKE = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatHoursShort(minutes: number): string {
  const h = minutes / 60;
  return h >= 10 || h === 0 ? `${Math.round(h)} ชม.` : `${h.toFixed(1).replace(/\.0$/, '')} ชม.`;
}

export default function EisenhowerPieChart({ split, className }: EisenhowerPieChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (split.totalTaskMinutes === 0) {
    return <p className={clsx('py-10 text-center font-body text-sm text-ink-muted', className)}>วันนี้ยังไม่มีกิจกรรมที่มาจากสิ่งที่ต้องทำเลย</p>;
  }
  if (split.totalUrgentMinutes === 0) {
    return (
      <p className={clsx('py-10 text-center font-body text-sm text-ink-muted', className)}>
        ยังไม่มีงานด่วนวันนี้ สบายๆ ไปก่อนได้ 🎉
      </p>
    );
  }

  const entries = [
    { id: 'important', label: 'ด่วน + สำคัญ', minutes: split.importantMinutes, colorClass: 'stroke-eisenhower-important' },
    { id: 'routine', label: 'ด่วน + ไม่สำคัญ', minutes: split.routineMinutes, colorClass: 'stroke-eisenhower-routine' },
  ];
  const slices = computeDonutSlices(entries, CIRCUMFERENCE);
  const dotClassFor = (id: string) => (id === 'important' ? 'bg-eisenhower-important' : 'bg-eisenhower-routine');

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
        <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="โดนัทสัดส่วนงานด่วนวันนี้แยกตามความสำคัญ">
            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-eddy-50" />
              {slices.map((s, i) => (
                <circle
                  key={s.id}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  strokeWidth={STROKE}
                  strokeDasharray={s.dashArray}
                  strokeDashoffset={s.dashOffset}
                  className={clsx(s.colorClass, 'cursor-default transition-opacity', hoverIdx !== null && hoverIdx !== i ? 'opacity-40' : 'opacity-100')}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                />
              ))}
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-lg font-bold text-ink">{formatHoursShort(split.totalUrgentMinutes)}</span>
            <span className="font-body text-[10px] text-ink-muted">งานด่วนวันนี้</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {slices.map((s, i) => (
            <div
              key={s.id}
              className={clsx('flex items-center gap-2 rounded-clay-sm px-2 py-1.5 transition-colors', hoverIdx === i && 'bg-eddy-50')}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            >
              <span className={clsx('h-2.5 w-2.5 flex-shrink-0 rounded-sm', dotClassFor(s.id))} />
              <span className="font-body text-sm text-ink">{s.label}</span>
              <span className="ml-auto font-body text-xs text-ink-muted">{formatHoursShort(s.minutes)}</span>
              <span className="w-9 flex-shrink-0 text-right font-display text-xs font-semibold text-ink">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-center font-body text-[11px] text-ink-muted sm:text-left">
        {formatHoursShort(split.totalUrgentMinutes)} จาก {formatHoursShort(split.totalTaskMinutes)} ของกิจกรรมที่มาจากสิ่งที่ต้องทำวันนี้เป็นงานด่วน
      </p>
    </div>
  );
}
