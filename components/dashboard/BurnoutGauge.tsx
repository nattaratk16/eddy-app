'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { BurnoutBandKey } from '@/lib/burnoutRisk';

// มาตรวัดครึ่งวงกลม (semi-circle gauge) แทนแท่งมิเตอร์แนวนอน + ตัวเลขเดิม - ให้ความรู้สึก
// "แดชบอร์ดจริงจัง" มากกว่า และเติมพื้นที่แนวตั้งของการ์ดได้เป็นธรรมชาติ ไม่ต้องพึ่ง items-stretch
// วาดด้วย SVG path โค้งครึ่งวงกลมรัศมี 70 แล้วเลื่อน stroke-dashoffset ตามคะแนน (ธีมเดียวกับ
// donut ring ที่ใช้ทั่วแอปนี้ - แค่เปลี่ยนจากวงกลมเต็มเป็นครึ่งวง)
const R = 70;
const ARC_LENGTH = Math.PI * R; // ความยาวส่วนโค้งครึ่งวงกลม ~219.9
const ARC_PATH = `M 30 100 A ${R} ${R} 0 0 1 170 100`;

const BAND_STROKE: Record<BurnoutBandKey, string> = {
  low: 'stroke-load-free',
  medium: 'stroke-load-tight',
  high: 'stroke-load-full',
};
const BAND_CHIP: Record<BurnoutBandKey, string> = {
  low: 'bg-pastel-mint text-chip-ink',
  medium: 'bg-pastel-yellow text-chip-ink',
  high: 'bg-pastel-pink text-chip-ink',
};

interface BurnoutGaugeProps {
  score: number;
  band: BurnoutBandKey;
  label: string;
}

export default function BurnoutGauge({ score, band, label }: BurnoutGaugeProps) {
  const offset = ARC_LENGTH * (1 - Math.min(100, Math.max(0, score)) / 100);

  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 108" className="w-full overflow-visible">
        {/* รางพื้นหลัง */}
        <path d={ARC_PATH} fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-eddy-50" />
        {/* ส่วนเติมตามคะแนน - เคลื่อนไหวตอนโหลดหน้า */}
        <motion.path
          d={ARC_PATH}
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          className={BAND_STROKE[band]}
          initial={{ strokeDashoffset: ARC_LENGTH }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-x-0 top-[60%] flex -translate-y-1/2 flex-col items-center gap-1.5">
        <span className="font-display text-h1 leading-none text-ink">{score}</span>
        <span className={clsx('rounded-full px-2.5 py-0.5 font-display text-caption font-semibold', BAND_CHIP[band])}>{label}</span>
      </div>
    </div>
  );
}
