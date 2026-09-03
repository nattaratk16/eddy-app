'use client';

/**
 * WorkloadDistributionChart — กราฟแท่ง "ภาระงานที่ต้องทำ" เทียบกับ "กำลังที่มีจริง" รายวัน
 * --------------------------------------------------------------
 * ยืมแนวคิดจากทฤษฎีการวางแผนกำลังการผลิต (Capacity Planning / Capacity Requirements Plan):
 * เทียบ required (แท่ง = เวลาที่ถูกจองไว้แล้ว) กับ capacity (เส้นประ = กรอบเวลาที่ใช้ได้จริง
 * ตาม dayStart-dayEnd ของผู้ใช้) ในแต่ละวัน - แท่งที่สูงเกินเส้นประ = วันนั้น "โอเวอร์โหลด"
 *
 * ข้อมูลคำนวณที่ lib/burnoutRisk.ts (getWorkloadSignals -> computeDailyRequiredLoad ใน
 * lib/workload.ts) ฝั่งเซิร์ฟเวอร์แล้วส่งมาเป็น prop ตรงๆ (ไม่ต้อง fetch เอง ต่างจาก
 * WorkloadTrendChart ของหน้ากลุ่มที่ใช้ซ้ำได้หลายที่ - อันนี้โชว์ครั้งเดียวตอนโหลดแดชบอร์ด)
 *
 * ของวันนี้ "กรอบเวลาที่ใช้ได้" จะถูกตัดให้เหลือแค่เวลาที่เหลือจากตอนนี้ (เหมือนที่อื่นทั้งแอป)
 * เส้นประเลยจะขยับต่ำลงเฉพาะวันนี้ - ไม่ใช่บั๊ก มีคำอธิบายกำกับไว้ใต้กราฟ
 * --------------------------------------------------------------
 */
import { useState } from 'react';
import clsx from 'clsx';
import type { DailyRequiredPoint } from '@/lib/workload';

const WEEKDAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
function dayLabel(dateStr: string): string {
  return WEEKDAY_SHORT[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
}

/** สีแท่งตามระดับความแน่นของวันนั้น - เกณฑ์เดียวกับ WorkloadPanel ของหน้ากลุ่ม (55%/85%) */
function barClassFor(pct: number): string {
  if (pct < 55) return 'fill-load-free';
  if (pct < 85) return 'fill-load-tight';
  return 'fill-load-full';
}

interface WorkloadDistributionChartProps {
  daily: DailyRequiredPoint[];
  className?: string;
}

const WIDTH = 640;
const HEIGHT = 200;
const PAD_X = 16;
const PAD_TOP = 14;
const PAD_BOTTOM = 34;
const PLOT_W = WIDTH - PAD_X * 2;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

export default function WorkloadDistributionChart({ daily, className }: WorkloadDistributionChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (daily.length === 0) {
    return <p className="py-10 text-center font-body text-sm text-ink-muted">ยังไม่มีข้อมูลให้คำนวณ</p>;
  }

  const n = daily.length;
  // สเกลแกน Y เป็น "ชั่วโมง" ใช้ร่วมกันทั้งแท่งและเส้นกำลัง - เผื่อหัว 15% กันแท่งสูงสุดชนขอบบนพอดี
  const maxMin = Math.max(60, ...daily.map((d) => Math.max(d.requiredMin, d.capacityMin))) * 1.15;
  const yAt = (min: number) => PAD_TOP + PLOT_H * (1 - Math.min(min, maxMin) / maxMin);
  const slotW = PLOT_W / n;
  const barW = Math.min(28, slotW * 0.5);
  const xCenter = (i: number) => PAD_X + slotW * (i + 0.5);

  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());

  return (
    <div className={className}>
      <div className="relative mt-2" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-label="กราฟเปรียบเทียบภาระงานที่ต้องทำกับกำลังที่มีจริงรายวัน"
        >
          {/* เส้นกริดอ้างอิง - บาง เส้นทึบ ถอยไปข้างหลัง (ต่างจากเส้นกำลังการผลิตที่เป็นเส้นประเน้น) */}
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={PAD_X} x2={WIDTH - PAD_X} y1={yAt(maxMin * f)} y2={yAt(maxMin * f)} className="stroke-ink-muted/15" strokeWidth={1} />
          ))}

          {/* แท่ง = เวลาที่ถูกจองไว้แล้ว (required) */}
          {daily.map((d, i) => {
            const x = xCenter(i) - barW / 2;
            const y = yAt(d.requiredMin);
            const h = Math.max(0, PAD_TOP + PLOT_H - y);
            const isToday = d.date === todayISO;
            return (
              <g key={d.date}>
                <rect x={x} y={y} width={barW} height={h} rx={3} className={clsx(barClassFor(d.pct), 'transition-opacity')} />
                {/* พื้นที่ชี้เมาส์ทั้งคอลัมน์ - ใหญ่กว่าตัวแท่งจริง ให้ชี้ง่าย */}
                <rect
                  x={PAD_X + slotW * i}
                  y={PAD_TOP}
                  width={slotW}
                  height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                />
                <text
                  x={xCenter(i)}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className={clsx('text-[11px]', isToday ? 'fill-eddy-600 font-semibold' : 'fill-ink-muted')}
                >
                  {dayLabel(d.date)}
                </text>
              </g>
            );
          })}

          {/* เส้นกำลังการผลิตที่มีจริง (capacity) - เส้นประ แยกจากเส้นกริดชัดเจน */}
          <polyline
            fill="none"
            className="stroke-ink-muted/50"
            strokeWidth={1.75}
            strokeDasharray="5 4"
            strokeLinecap="round"
            points={daily.map((d, i) => `${xCenter(i)},${yAt(d.capacityMin)}`).join(' ')}
          />
        </svg>

        {hoverIdx !== null && (
          <div
            className="pointer-events-none absolute z-20 w-max max-w-[200px] -translate-x-1/2 -translate-y-full rounded-clay-sm bg-ink px-3 py-2 text-left shadow-clay-sm"
            style={{ left: `${(xCenter(hoverIdx) / WIDTH) * 100}%`, top: `${(yAt(daily[hoverIdx].requiredMin) / HEIGHT) * 100 - 4}%` }}
          >
            <p className="font-display text-xs font-bold text-white">
              {dayLabel(daily[hoverIdx].date)} {daily[hoverIdx].date === todayISO ? '(วันนี้)' : ''}
            </p>
            <p className="font-body text-[11px] text-white/80">
              จองไว้แล้ว {(daily[hoverIdx].requiredMin / 60).toFixed(1)} ชม. จาก {(daily[hoverIdx].capacityMin / 60).toFixed(1)} ชม. ({daily[hoverIdx].pct}%)
            </p>
          </div>
        )}
      </div>

      {/* legend - สี = ความแน่นของวันนั้น, เส้นประ = กำลังที่มีจริง */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5 font-body text-xs text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-sm bg-load-free" /> ยังไหว
        </span>
        <span className="flex items-center gap-1.5 font-body text-xs text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-sm bg-load-tight" /> เริ่มแน่น
        </span>
        <span className="flex items-center gap-1.5 font-body text-xs text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-sm bg-load-full" /> แน่นมาก
        </span>
        <span className="flex items-center gap-1.5 font-body text-xs text-ink-soft">
          <svg width="14" height="8" className="flex-shrink-0">
            <line x1="0" y1="4" x2="14" y2="4" className="stroke-ink-muted/50" strokeWidth={1.75} strokeDasharray="4 3" />
          </svg>
          กำลังที่มีจริง
        </span>
      </div>
      <p className="mt-2 font-body text-[11px] text-ink-muted">
        วันนี้นับเฉพาะเวลาที่เหลือจากตอนนี้ - เส้นกำลังของวันนี้เลยต่ำกว่าวันอื่นตามจริง
      </p>
    </div>
  );
}
