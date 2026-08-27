'use client';

/**
 * WorkloadPanel
 * --------------------------------------------------------------
 * แถบภาระงานของสมาชิก (Workload Score) ใช้ทั้งหน้าภาพรวมกลุ่มและหน้างานกลุ่ม
 *
 * รับข้อมูลจาก GET /api/groups/[id]/workload (โหลดเองตอนเปิดหน้า)
 * หรือรับ rows ที่ได้จากการกระจายงานมาแสดงแทนก็ได้ (จะมี "รอบนี้ได้เพิ่ม" ติดมาด้วย)
 * --------------------------------------------------------------
 */
import { useCallback, useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import clsx from 'clsx';

export interface WorkloadRow {
  userId: string;
  name: string;
  isMe?: boolean;
  committedMinutes: number;
  freeMinutes: number;
  assignedMinutes: number;
  score: number | null; // null = ไม่เหลือเวลาว่างเลย
}

/** 90 -> "1 ชม. 30 น." */
export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} น.`;
  return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} น.`;
}

interface WorkloadPanelProps {
  groupId: string;
  /** ถ้าส่งมา = ใช้ค่านี้แทนการโหลดเอง (เช่น ผลลัพธ์ที่เพิ่งกระจายงานเสร็จ) */
  rows?: WorkloadRow[];
  /** เปลี่ยนค่านี้เพื่อสั่งให้โหลดใหม่ (เช่น หลังกระจายงาน/ยืนยันงาน) */
  refreshKey?: number;
  className?: string;
}

export default function WorkloadPanel({ groupId, rows, refreshKey = 0, className }: WorkloadPanelProps) {
  const [loaded, setLoaded] = useState<WorkloadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/workload`);
    if (res.ok) {
      const data = await res.json();
      setLoaded(data.workload ?? []);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (rows) return; // ใช้ค่าที่ส่งมา ไม่ต้องโหลด
    load();
  }, [load, rows, refreshKey]);

  const data = rows ?? loaded;
  const sorted = [...data].sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity));

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
          <Gauge size={15} className="text-eddy-500" /> ภาระงานของสมาชิก
        </h3>
        <span className="font-body text-[11px] text-ink-muted">7 วันข้างหน้า</span>
      </div>
      <p className="mt-0.5 font-body text-[11px] text-ink-muted">
        คะแนน = งานที่มีอยู่แล้ว ÷ เวลาว่าง (ยิ่งต่ำยิ่งรับงานเพิ่มได้)
      </p>

      {loading && !rows ? (
        <p className="py-4 text-center font-body text-xs text-ink-muted">กำลังคำนวณ...</p>
      ) : sorted.length === 0 ? (
        <p className="py-4 text-center font-body text-xs text-ink-muted">ยังไม่มีสมาชิกให้คำนวณ</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {sorted.map((m) => {
            const capacity = m.committedMinutes + m.freeMinutes;
            const pct = capacity > 0 ? Math.round((m.committedMinutes / capacity) * 100) : 100;
            // แน่นเกิน 80% ของเวลาที่มี = เตือนด้วยสีส้ม
            const tight = pct >= 80;
            return (
              <li key={m.userId}>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-body text-xs font-semibold text-ink">
                    {m.name}
                    {m.isMe && <span className="ml-1 font-normal text-ink-muted">(คุณ)</span>}
                  </span>
                  <span
                    className={clsx(
                      'flex-shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] font-bold',
                      tight ? 'bg-pastel-peach text-eddy-700' : 'bg-pastel-mint text-eddy-700',
                    )}
                  >
                    {m.score === null ? 'เต็ม' : m.score.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-eddy-50">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      tight ? 'bg-gradient-to-r from-amber-300 to-orange-400' : 'bg-gradient-to-r from-eddy-400 to-accent-400',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 font-body text-[11px] text-ink-muted">
                  งาน {formatHours(m.committedMinutes)} · ว่าง {formatHours(m.freeMinutes)}
                  {m.assignedMinutes > 0 ? ` · รอบนี้ได้เพิ่ม ${formatHours(m.assignedMinutes)}` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
