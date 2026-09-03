'use client';

/**
 * BurndownChart — เส้นอุดมคติ vs เส้นจริง ของงานที่มีกำหนดส่งสัปดาห์นี้ (หลัก Agile/Scrum Burndown)
 * --------------------------------------------------------------
 * ข้อมูลคำนวณที่ lib/weeklyBurndown.ts ฝั่งเซิร์ฟเวอร์แล้วส่งมาเป็น prop ตรงๆ
 * เส้นประ = ควรเหลืองานเท่าไหร่ถ้าทำสม่ำเสมอตลอดสัปดาห์ (คำนวณจากยอดรวม ณ ตอนนี้ - ดู
 * คำอธิบายข้อจำกัดท้ายกราฟ) เส้นทึบ = เหลือจริงจากที่ปิดงานไปแล้ว (มีถึงแค่ "วันนี้" เท่านั้น
 * ทำนายอนาคตไม่ได้) เส้นทึบอยู่ใต้เส้นประ = กำลังไปได้ดีกว่าแผน, อยู่เหนือ = ตามหลังแผน
 * --------------------------------------------------------------
 */
import { useState } from 'react';
import clsx from 'clsx';
import type { BurndownSeries } from '@/lib/weeklyBurndown';

const WEEKDAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
function dayLabel(dateStr: string): string {
  return WEEKDAY_SHORT[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
}

interface BurndownChartProps {
  series: BurndownSeries;
  className?: string;
}

const WIDTH = 640;
const HEIGHT = 200;
const PAD_X = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 34;
const PLOT_W = WIDTH - PAD_X * 2;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

export default function BurndownChart({ series, className }: BurndownChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { ideal, actual, totalMinutes } = series;

  if (ideal.length === 0 || totalMinutes === 0) {
    return <p className={clsx('py-10 text-center font-body text-sm text-ink-muted', className)}>สัปดาห์นี้ยังไม่มีงานที่มีกำหนดส่งเลย</p>;
  }

  const n = ideal.length;
  const maxHours = Math.max(1, (totalMinutes / 60) * 1.1);
  const xAt = (i: number) => PAD_X + (n <= 1 ? PLOT_W / 2 : (PLOT_W * i) / (n - 1));
  const yAt = (hours: number) => PAD_TOP + PLOT_H * (1 - Math.min(hours, maxHours) / maxHours);
  const slotW = PLOT_W / n;

  const actualByDate = new Map(actual.map((p) => [p.date, p]));
  const todayISO = actual.length > 0 ? actual[actual.length - 1].date : '';

  return (
    <div className={className}>
      <div className="relative mt-2" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-label="กราฟ Burndown เปรียบเทียบเส้นอุดมคติกับเส้นจริงของสัปดาห์นี้"
        >
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={PAD_X} x2={WIDTH - PAD_X} y1={yAt(maxHours * f)} y2={yAt(maxHours * f)} className="stroke-ink-muted/15" strokeWidth={1} />
          ))}

          {/* เส้นอุดมคติ - ประ ครบทั้ง 7 วัน */}
          <polyline
            fill="none"
            className="stroke-ink-muted/60"
            strokeWidth={1.75}
            strokeDasharray="5 4"
            strokeLinecap="round"
            points={ideal.map((p, i) => `${xAt(i)},${yAt(p.minutes / 60)}`).join(' ')}
          />

          {/* เส้นจริง - ทึบ สีแบรนด์ มีถึงแค่วันนี้ */}
          {actual.length > 0 && (
            <polyline
              fill="none"
              className="stroke-eddy-500"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={actual.map((p, i) => `${xAt(i)},${yAt(p.minutes / 60)}`).join(' ')}
            />
          )}

          {ideal.map((p, i) => {
            const isToday = p.date === todayISO;
            const a = actualByDate.get(p.date);
            return (
              <g key={p.date}>
                {a && (
                  <circle cx={xAt(i)} cy={yAt(a.minutes / 60)} r={4} className={isToday ? 'fill-eddy-600' : 'fill-eddy-500'} stroke="white" strokeWidth={2} />
                )}
                <rect
                  x={xAt(i) - slotW / 2}
                  y={PAD_TOP}
                  width={slotW}
                  height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                />
                <text x={xAt(i)} y={HEIGHT - 8} textAnchor="middle" className={clsx('text-[11px]', isToday ? 'fill-eddy-600 font-semibold' : 'fill-ink-muted')}>
                  {dayLabel(p.date)}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverIdx !== null && (
          <div
            className="pointer-events-none absolute z-20 w-max -translate-x-1/2 -translate-y-full rounded-clay-sm bg-ink px-3 py-2 text-left shadow-clay-sm"
            style={{ left: `${(xAt(hoverIdx) / WIDTH) * 100}%`, top: `${(yAt(ideal[hoverIdx].minutes / 60) / HEIGHT) * 100 - 4}%` }}
          >
            <p className="font-display text-xs font-bold text-white">
              {dayLabel(ideal[hoverIdx].date)} {ideal[hoverIdx].date === todayISO ? '(วันนี้)' : ''}
            </p>
            <p className="font-body text-[11px] text-white/80">อุดมคติ {(ideal[hoverIdx].minutes / 60).toFixed(1)} ชม.</p>
            {actualByDate.has(ideal[hoverIdx].date) && (
              <p className="font-body text-[11px] text-white/80">จริง {(actualByDate.get(ideal[hoverIdx].date)!.minutes / 60).toFixed(1)} ชม.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5 font-body text-xs text-ink-soft">
          <svg width="14" height="8" className="flex-shrink-0">
            <line x1="0" y1="4" x2="14" y2="4" className="stroke-ink-muted/60" strokeWidth={1.75} strokeDasharray="4 3" />
          </svg>
          เส้นอุดมคติ
        </span>
        <span className="flex items-center gap-1.5 font-body text-xs text-ink-soft">
          <svg width="14" height="8" className="flex-shrink-0">
            <line x1="0" y1="4" x2="14" y2="4" className="stroke-eddy-500" strokeWidth={2} />
          </svg>
          เส้นจริง
        </span>
      </div>
      <p className="mt-2 font-body text-[11px] text-ink-muted">
        เส้นอุดมคติคำนวณจากยอดงานรวม ณ ตอนนี้ ไม่ใช่ยอดตอนต้นสัปดาห์จริง (เพิ่มงานได้ตลอดสัปดาห์) - เส้นจริงมีถึงแค่วันนี้เท่านั้น ทำนายอนาคตไม่ได้
      </p>
    </div>
  );
}
