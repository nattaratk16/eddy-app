'use client';

/**
 * WorkloadInsightText — ประโยควิเคราะห์ภาระงาน/ความเสี่ยงหมดไฟ 1-2 ประโยค
 * --------------------------------------------------------------
 * รูปแบบเดียวกับสรุปภาพรวมสัปดาห์ในหน้าปฏิทิน (app/(app)/calendar/page.tsx):
 * ขึ้นข้อความจาก local fallback (buildWorkloadInsight) ทันทีแบบไม่ต้องรอ แล้วค่อยยิง
 * ไป POST /api/ai/workload-insight ขอ Gemini วิเคราะห์จริง สลับมาแทนถ้าได้คำตอบทัน
 * (เงียบไว้ถ้าเรียกไม่สำเร็จ - ใช้ประโยค local ต่อไปเฉยๆ ไม่มี error โผล่ให้เห็น)
 * --------------------------------------------------------------
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildWorkloadInsight } from '@/lib/aiMock';
import { computeBurnoutRisk, type BurnoutSignals } from '@/lib/burnoutRisk';

interface WorkloadInsightTextProps {
  signals: BurnoutSignals;
  className?: string;
}

export default function WorkloadInsightText({ signals, className }: WorkloadInsightTextProps) {
  const risk = useMemo(() => computeBurnoutRisk(signals), [signals]);
  const localInsight = useMemo(() => buildWorkloadInsight(risk), [risk]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    setAiInsight(null);
    const seq = ++requestSeq.current;
    (async () => {
      try {
        const res = await fetch('/api/ai/workload-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signals }),
        });
        const data = await res.json();
        if (seq === requestSeq.current && data.insight) setAiInsight(data.insight);
      } catch {
        // เงียบไว้ - ใช้ localInsight ต่อไป
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals]);

  return <p className={className}>{aiInsight ?? localInsight}</p>;
}
