'use client';

/**
 * WorkloadTrendChart — กราฟเส้น + พื้นที่ใต้เส้น (area) แสดงแนวโน้มภาระงาน "เฉลี่ยของทั้งกลุ่ม" รายวัน
 * --------------------------------------------------------------
 * แยกออกมาจาก WorkloadPanel ตั้งใจ: WorkloadPanel ตอบว่า "ใครหนักสุดตอนนี้" (รายคน)
 * ส่วนกราฟนี้ตอบว่า "วันไหนของสัปดาห์ที่กลุ่มนี้โดยรวมมักจะแน่นที่สุด" (ภาพรวมรายวัน)
 * เอาไว้ช่วยเลือกวันนัดประชุม/หลีกเลี่ยงวันที่ทุกคนน่าจะยุ่ง
 *
 * จุดแต่ละจุด = ค่าเฉลี่ยของ "% เวลาที่ถูกจองแล้ว" ต่อคนในวันนั้น (เฉพาะที่ลงปฏิทินแล้วจริง
 * ไม่รวมงานค้างที่ยังไม่ได้ลงปฏิทิน เพราะงานค้างไม่มีวันที่แน่นอน) คำนวณที่ lib/workload.ts
 * (computeDailyAverageLoad) แล้วส่งมาพร้อม GET /api/groups/[id]/workload เป็น field `trend`
 *
 * ซีรีส์เดียว เลยไม่ต้องมี legend (หัวข้อบอกอยู่แล้วว่ากราฟนี้คืออะไร) - ใช้สีแบรนด์หลักแทน
 * สีเชิงหมวดหมู่ เพราะไม่ได้แยกประเภทอะไร
 * --------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface DailyLoadPoint {
  date: string; // YYYY-MM-DD
  avgPct: number; // 0-100
}

const WEEKDAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function dayLabel(dateStr: string): string {
  return WEEKDAY_SHORT[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
}

interface WorkloadTrendChartProps {
  groupId: string;
  /** เปลี่ยนค่านี้เพื่อสั่งให้โหลดใหม่ */
  refreshKey?: number;
  className?: string;
}

// พิกัดคงที่ของ viewBox - responsive ด้วย aspect-ratio ของ wrapper ข้างนอก ไม่ใช่ขนาดจริงของ SVG
const WIDTH = 640;
const HEIGHT = 190;
const PAD_X = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 34;
const PLOT_W = WIDTH - PAD_X * 2;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

const xAt = (i: number, n: number) => PAD_X + (n <= 1 ? PLOT_W / 2 : (PLOT_W * i) / (n - 1));
const yAt = (pct: number) => PAD_TOP + PLOT_H * (1 - Math.max(0, Math.min(100, pct)) / 100);

export default function WorkloadTrendChart({ groupId, refreshKey = 0, className }: WorkloadTrendChartProps) {
  const [points, setPoints] = useState<DailyLoadPoint[] | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [todayISO, setTodayISO] = useState('');

  useEffect(() => {
    setTodayISO(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/groups/${groupId}/workload`);
      if (cancelled) return;
      if (res.ok) setPoints((await res.json()).trend ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, refreshKey]);

  const peak = points && points.length > 0 ? points.reduce((a, b) => (b.avgPct > a.avgPct ? b : a)) : null;
  const lightest = points && points.length > 0 ? points.reduce((a, b) => (b.avgPct < a.avgPct ? b : a)) : null;

  return (
    <div className={className}>
      <h3 className="flex items-center gap-1.5 font-display text-base font-bold text-ink">
        <TrendingUp size={17} className="text-eddy-500" /> แนวโน้มภาระงานเฉลี่ยของกลุ่ม
      </h3>
      <p className="mt-0.5 font-body text-xs text-ink-muted">
        ค่าเฉลี่ย % เวลาที่สมาชิกถูกจองไปแล้วในแต่ละวัน ของ 7 วันข้างหน้า - ดูว่าวันไหนกลุ่มนี้มักจะแน่นที่สุด
      </p>

      {points === null ? (
        <p className="py-10 text-center font-body text-sm text-ink-muted">กำลังคำนวณ...</p>
      ) : points.length === 0 ? (
        <p className="py-10 text-center font-body text-sm text-ink-muted">ยังไม่มีสมาชิกให้คำนวณ</p>
      ) : (
        <>
          <div className="relative mt-4" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="absolute inset-0 h-full w-full overflow-visible"
              role="img"
              aria-label="กราฟแนวโน้มภาระงานเฉลี่ยของกลุ่มรายวัน"
            >
              {/* เส้นกริดอ้างอิง 0/50/100% พร้อมตัวเลขกำกับ - บาง เส้นทึบ ถอยไปข้างหลัง */}
              {[0, 50, 100].map((g) => (
                <g key={g}>
                  <line x1={PAD_X} x2={WIDTH - PAD_X} y1={yAt(g)} y2={yAt(g)} className="stroke-ink-muted/20" strokeWidth={1} />
                  <text x={0} y={yAt(g) - 3} className="fill-ink-muted text-[9px]">
                    {g}%
                  </text>
                </g>
              ))}

              {/* พื้นที่ใต้เส้น - เฉดสีเดียวกับเส้นแต่จางมาก (~10% opacity) ให้เห็น "ปริมาณ" ชัดกว่าเส้นเปล่าๆ */}
              <path
                className="fill-eddy-500/10"
                stroke="none"
                d={`M ${xAt(0, points.length)},${yAt(0)} ${points
                  .map((p, i) => `L ${xAt(i, points.length)},${yAt(p.avgPct)}`)
                  .join(' ')} L ${xAt(points.length - 1, points.length)},${yAt(0)} Z`}
              />

              {/* เส้นแนวโน้ม - ซีรีส์เดียว ใช้สีแบรนด์หลัก */}
              <polyline
                fill="none"
                className="stroke-eddy-500"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points.map((p, i) => `${xAt(i, points.length)},${yAt(p.avgPct)}`).join(' ')}
              />

              {points.map((p, i) => {
                const x = xAt(i, points.length);
                const y = yAt(p.avgPct);
                const isToday = p.date === todayISO;
                return (
                  <g key={p.date}>
                    {/* จุดข้อมูล - วงแหวนขาวคั่นจากเส้น (surface ring) */}
                    <circle
                      cx={x}
                      cy={y}
                      r={4}
                      className={isToday ? 'fill-eddy-600' : 'fill-eddy-500'}
                      stroke="white"
                      strokeWidth={2}
                    />
                    {/* พื้นที่ชี้เมาส์ใหญ่กว่าจุดจริง - ให้ชี้ง่ายกว่าวงกลม 8px */}
                    <circle
                      cx={x}
                      cy={y}
                      r={16}
                      fill="transparent"
                      className="cursor-default"
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                    />
                    {/* แกน X: ตัวย่อวันในสัปดาห์ - ตัวหนา + สีแบรนด์ให้วันนี้ */}
                    <text
                      x={x}
                      y={HEIGHT - 8}
                      textAnchor="middle"
                      className={clsx('text-[11px]', isToday ? 'fill-eddy-600 font-semibold' : 'fill-ink-muted')}
                    >
                      {dayLabel(p.date)}
                    </text>
                  </g>
                );
              })}
            </svg>

            {hoverIdx !== null && (
              <div
                className="pointer-events-none absolute z-20 w-max -translate-x-1/2 -translate-y-full rounded-clay-sm bg-ink px-3 py-2 text-left shadow-clay-sm"
                style={{
                  left: `${(xAt(hoverIdx, points.length) / WIDTH) * 100}%`,
                  top: `${(yAt(points[hoverIdx].avgPct) / HEIGHT) * 100 - 4}%`,
                }}
              >
                <p className="font-display text-xs font-bold text-white">
                  {dayLabel(points[hoverIdx].date)} {points[hoverIdx].date === todayISO ? '(วันนี้)' : ''}
                </p>
                <p className="font-body text-[11px] text-white/80">ภาระงานเฉลี่ย {points[hoverIdx].avgPct}%</p>
              </div>
            )}
          </div>

          {/* สรุปสั้นๆ แทนการแปะตัวเลขไว้บนกราฟทุกจุด (อ่านง่ายกว่า ไม่ต้องเดาจากความสูงเส้น) */}
          {peak && lightest && peak.date !== lightest.date && (
            <p className="mt-3 font-body text-xs text-ink-muted">
              แน่นสุด <span className="font-semibold text-eddy-600">{dayLabel(peak.date)} {peak.avgPct}%</span> · ว่างสุด{' '}
              <span className="font-semibold text-ink-soft">{dayLabel(lightest.date)} {lightest.avgPct}%</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
