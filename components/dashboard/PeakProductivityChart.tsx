'use client';

/**
 * PeakProductivityChart — เส้นโค้งความหนาแน่น (von Mises KDE) ของช่วงเวลาที่ทำงานเสร็จบ่อยที่สุด
 * --------------------------------------------------------------
 * ข้อมูลคำนวณที่ lib/peakProductivity.ts ฝั่งเซิร์ฟเวอร์แล้วส่งมาเป็น prop ตรงๆ
 * ใช้กราฟ Cartesian (แกน X = ชั่วโมง 0-24) แทนกราฟวงกลม - เขียนจาก SVG ล้วนง่ายกว่ามาก และ
 * เส้นโค้งสุ่มตัวอย่างครบทั้ง 0 และ 24 ชม. (คาบเดียวกัน f(0)=f(24)) ทำให้ปลายทั้งสองข้างของ
 * เส้นบรรจบกันพอดีโดยไม่ต้องทำอะไรพิเศษ แก้ปัญหา "เที่ยงคืนเป็นรอยต่อ" ไปในตัว
 * --------------------------------------------------------------
 */
import clsx from 'clsx';
import type { PeakProductivityResult } from '@/lib/peakProductivity';

interface PeakProductivityChartProps {
  result: PeakProductivityResult;
  className?: string;
}

const WIDTH = 640;
const HEIGHT = 190;
const PAD_X = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 34;
const PLOT_W = WIDTH - PAD_X * 2;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

function fmtHour(h: number): string {
  return `${String(Math.round(h) % 24).padStart(2, '0')}:00`;
}

export default function PeakProductivityChart({ result, className }: PeakProductivityChartProps) {
  if (!result.hasEnoughData) {
    return (
      <p className={clsx('py-10 text-center font-body text-sm text-ink-muted', className)}>
        ยังไม่มีข้อมูลพอ (ต้องมีงานที่ติ๊กเสร็จอย่างน้อย 5 ชิ้นในช่วง 90 วันที่ผ่านมา)
      </p>
    );
  }

  const maxDensity = Math.max(...result.curve.map((p) => p.density), 0.0001);
  const xAt = (hour: number) => PAD_X + (hour / 24) * PLOT_W;
  const yAt = (density: number) => PAD_TOP + PLOT_H * (1 - density / maxDensity);

  const linePoints = result.curve.map((p) => `${xAt(p.hour)},${yAt(p.density)}`).join(' ');
  const areaPath = `M ${xAt(0)},${yAt(0)} ${result.curve.map((p) => `L ${xAt(p.hour)},${yAt(p.density)}`).join(' ')} L ${xAt(24)},${yAt(0)} Z`;

  return (
    <div className={className}>
      <div className="relative mt-2" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-label="กราฟความหนาแน่นของช่วงเวลาที่ทำงานเสร็จบ่อยที่สุดในหนึ่งวัน"
        >
          {[0, 6, 12, 18, 24].map((h) => (
            <g key={h}>
              <line x1={xAt(h)} x2={xAt(h)} y1={PAD_TOP} y2={HEIGHT - PAD_BOTTOM} className="stroke-ink-muted/15" strokeWidth={1} />
              <text x={xAt(h)} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-muted text-[11px]">
                {h}
              </text>
            </g>
          ))}

          {result.peak && (
            <line
              x1={xAt(result.peak.hour)}
              x2={xAt(result.peak.hour)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              className="stroke-eddy-500/50"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}

          <path className="fill-eddy-500/10" stroke="none" d={areaPath} />
          <polyline fill="none" className="stroke-eddy-500" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={linePoints} />
        </svg>
      </div>

      {result.peak && (
        <p className="mt-3 font-body text-sm text-ink">
          ช่วงที่ทำงานเสร็จเยอะที่สุด:{' '}
          <span className="font-semibold text-eddy-600">
            {fmtHour(result.peak.from)} - {fmtHour(result.peak.to)} น.
          </span>
        </p>
      )}
      <p className="mt-1 font-body text-[11px] text-ink-muted">วิเคราะห์จากงานที่ติ๊กเสร็จ {result.sampleCount} ชิ้น ใน 90 วันที่ผ่านมา</p>
    </div>
  );
}
