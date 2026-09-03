'use client';

/**
 * CategoryDonutChart — โดนัทสัดส่วนเวลาที่ลงปฏิทินแล้วใน 7 วันที่ผ่านมา แยกตามหมวดหมู่จริง
 * --------------------------------------------------------------
 * ข้อมูลคำนวณที่ lib/categoryTimeDistribution.ts ฝั่งเซิร์ฟเวอร์แล้วส่งมาเป็น prop ตรงๆ
 * สีของแต่ละเสี้ยว = สีหมวดหมู่ที่ผู้ใช้เลือกไว้เองในปฏิทิน (ไม่ใช่สีเชิงหมวดหมู่ที่คิดขึ้นใหม่)
 * --------------------------------------------------------------
 */
import { useState } from 'react';
import clsx from 'clsx';
import { getColorOption } from '@/lib/colors';
import { computeDonutSlices } from '@/lib/donutGeometry';
import type { CategorySlice } from '@/lib/categoryTimeDistribution';

interface CategoryDonutChartProps {
  slices: CategorySlice[];
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

export default function CategoryDonutChart({ slices, className }: CategoryDonutChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const totalMinutes = slices.reduce((sum, s) => sum + s.minutes, 0);
  if (totalMinutes === 0) {
    return <p className={clsx('py-10 text-center font-body text-sm text-ink-muted', className)}>7 วันที่ผ่านมายังไม่มีกิจกรรมในปฏิทินเลย</p>;
  }

  const entries = slices.map((s) => ({
    id: s.id,
    label: s.label,
    minutes: s.minutes,
    colorClass: s.color === 'other' ? 'stroke-ink-muted/50' : getColorOption(s.color).strokeClass,
  }));
  const dots = slices.map((s) => (s.color === 'other' ? 'bg-ink-muted/50' : getColorOption(s.color).dotClass));
  const arcs = computeDonutSlices(entries, CIRCUMFERENCE);

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
        <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="โดนัทสัดส่วนเวลา 7 วันที่ผ่านมาแยกตามหมวดหมู่">
            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-eddy-50" />
              {arcs.map((s, i) => (
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
            <span className="font-display text-lg font-bold text-ink">{formatHoursShort(totalMinutes)}</span>
            <span className="font-body text-[10px] text-ink-muted">7 วันที่ผ่านมา</span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[170px]">
          {arcs.map((s, i) => (
            <div
              key={s.id}
              className={clsx('flex items-center gap-2 rounded-clay-sm px-2 py-1.5 transition-colors', hoverIdx === i && 'bg-eddy-50')}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            >
              <span className={clsx('h-2.5 w-2.5 flex-shrink-0 rounded-sm', dots[i])} />
              <span className="flex-1 truncate font-body text-sm text-ink">{s.label}</span>
              <span className="font-body text-xs text-ink-muted">{formatHoursShort(s.minutes)}</span>
              <span className="w-9 flex-shrink-0 text-right font-display text-xs font-semibold text-ink">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
