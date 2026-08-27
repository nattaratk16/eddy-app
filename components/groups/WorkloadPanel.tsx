'use client';

/**
 * WorkloadPanel — กราฟแท่งภาระงานของสมาชิก (Workload Score)
 * --------------------------------------------------------------
 * ใช้ทั้งแท็บภาพรวมกลุ่มและแท็บงานกลุ่ม
 * ข้อมูลมาจาก GET /api/groups/[id]/workload หรือรับ rows ที่เพิ่งกระจายงานเสร็จมาแสดงแทน
 *
 * การอ่านกราฟ:
 *   ความยาวแท่ง = % ของเวลาที่มีทั้งหมดที่ถูกงานจองไปแล้ว (0-100% จึงเทียบกันได้ตรงๆ)
 *                 ไม่ได้ใช้ค่า score ตรงๆ เพราะ score = งาน ÷ ว่าง ไม่มีเพดาน
 *                 (คนที่ว่างเหลือน้อยมากจะพุ่งไปหลายสิบ ทำให้แท่งคนอื่นแบนหมด)
 *   สี          = ระดับความแน่น 3 ขั้น เขียว -> ส้ม -> แดง พร้อมป้ายชื่อระดับกำกับ
 *                 (สีอย่างเดียวไม่พอสำหรับคนตาบอดสี จึงมีทั้งความยาวแท่งและตัวหนังสือ)
 *
 * สีทั้งสามผ่าน validator ของ dataviz skill ครบทุกข้อ - ดูหมายเหตุใน tailwind.config.js
 * ก่อนจะเพิ่มเฉดกลาง
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
  bookedMinutes?: number;
  pendingMinutes?: number;
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

/** ระดับความแน่นจาก % เวลาที่ถูกจองไปแล้ว */
const BANDS = [
  { key: 'free', max: 55, label: 'ยังว่าง', bar: 'bg-load-free', dot: 'bg-load-free' },
  { key: 'tight', max: 85, label: 'เริ่มแน่น', bar: 'bg-load-tight', dot: 'bg-load-tight' },
  { key: 'full', max: Infinity, label: 'แน่นมาก', bar: 'bg-load-full', dot: 'bg-load-full' },
] as const;

function bandOf(pct: number) {
  return BANDS.find((b) => pct < b.max) ?? BANDS[BANDS.length - 1];
}

interface WorkloadPanelProps {
  groupId: string;
  /** ถ้าส่งมา = ใช้ค่านี้แทนการโหลดเอง (เช่น ผลลัพธ์ที่เพิ่งกระจายงานเสร็จ) */
  rows?: WorkloadRow[];
  /** เปลี่ยนค่านี้เพื่อสั่งให้โหลดใหม่ (เช่น หลังยืนยันงาน) */
  refreshKey?: number;
  className?: string;
}

export default function WorkloadPanel({ groupId, rows, refreshKey = 0, className }: WorkloadPanelProps) {
  const [loaded, setLoaded] = useState<WorkloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/workload`);
    if (res.ok) setLoaded((await res.json()).workload ?? []);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (rows) return; // ใช้ค่าที่ส่งมา ไม่ต้องโหลด
    load();
  }, [load, rows, refreshKey]);

  const data = rows ?? loaded;
  // เรียงจากคนที่แน่นสุดลงมา - คนที่ต้องช่วยแบ่งงานให้อยู่บนสุด
  const sorted = [...data].sort((a, b) => (b.score ?? Infinity) - (a.score ?? Infinity));

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
          <Gauge size={15} className="text-eddy-500" /> ภาระงานของสมาชิก
        </h3>
        <span className="font-body text-[11px] text-ink-muted">7 วันข้างหน้า</span>
      </div>
      <p className="mt-0.5 font-body text-[11px] text-ink-muted">
        แท่ง = เวลาที่มีงานจองไว้แล้ว เทียบกับเวลาที่มีทั้งหมด
      </p>

      {loading && !rows ? (
        <p className="py-6 text-center font-body text-xs text-ink-muted">กำลังคำนวณ...</p>
      ) : sorted.length === 0 ? (
        <p className="py-6 text-center font-body text-xs text-ink-muted">ยังไม่มีสมาชิกให้คำนวณ</p>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-3.5">
            {sorted.map((m) => {
              const capacity = m.committedMinutes + m.freeMinutes;
              const pct = capacity > 0 ? Math.round((m.committedMinutes / capacity) * 100) : 100;
              const band = bandOf(pct);
              const open = openId === m.userId;
              return (
                <li
                  key={m.userId}
                  className="relative"
                  onMouseEnter={() => setOpenId(m.userId)}
                  onMouseLeave={() => setOpenId((cur) => (cur === m.userId ? null : cur))}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate font-body text-xs font-semibold text-ink">
                      {m.name}
                      {m.isMe && <span className="ml-1 font-normal text-ink-muted">(คุณ)</span>}
                    </span>
                    <span className="flex flex-shrink-0 items-baseline gap-1.5">
                      <span className="font-body text-[11px] text-ink-muted">{band.label}</span>
                      <span className="font-display text-xs font-bold text-ink">{pct}%</span>
                    </span>
                  </div>

                  {/* แท่ง: รางเต็ม = เวลาที่มีทั้งหมด, ส่วนที่ทึบ = ถูกงานจองไปแล้ว */}
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-eddy-50">
                    <div
                      className={clsx('h-full rounded-full transition-[width] duration-500 ease-out', band.bar)}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>

                  <p className="mt-1 font-body text-[11px] text-ink-muted">
                    งาน {formatHours(m.committedMinutes)} · ว่าง {formatHours(m.freeMinutes)} · คะแนน{' '}
                    {m.score === null ? 'เต็ม' : m.score.toFixed(2)}
                    {m.assignedMinutes > 0 ? ` · รอบนี้ +${formatHours(m.assignedMinutes)}` : ''}
                  </p>

                  {/* รายละเอียดตอนชี้เมาส์: แยกว่าเป็นเวลาที่ลงปฏิทินแล้วเท่าไร งานที่ยังไม่ได้ลงเท่าไร */}
                  {open && (m.bookedMinutes !== undefined || m.pendingMinutes !== undefined) && (
                    <div className="absolute -top-1 right-0 z-10 w-max max-w-[240px] -translate-y-full rounded-clay-sm bg-ink px-3 py-2 shadow-clay-sm">
                      <p className="font-display text-[11px] font-bold text-white">{m.name}</p>
                      <p className="mt-0.5 font-body text-[11px] text-white/80">
                        อยู่ในปฏิทินแล้ว {formatHours(m.bookedMinutes ?? 0)}
                      </p>
                      <p className="font-body text-[11px] text-white/80">
                        งานค้างที่ยังไม่ได้ลงปฏิทิน {formatHours(m.pendingMinutes ?? 0)}
                      </p>
                      <p className="mt-1 font-body text-[10px] text-white/60">
                        คะแนน = งานที่มี ÷ เวลาว่าง = {m.score === null ? 'ไม่เหลือเวลาว่าง' : m.score.toFixed(2)}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* คำอธิบายสี - สีอย่างเดียวไม่พอ ต้องมีชื่อระดับกำกับด้วย */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-eddy-100 pt-3">
            {BANDS.map((b, i) => (
              <span key={b.key} className="flex items-center gap-1 font-body text-[10px] text-ink-muted">
                <span className={clsx('h-2 w-2 rounded-full', b.dot)} />
                {b.label}
                <span className="text-ink-muted/70">
                  {i === 0 ? '<55%' : i === 1 ? '55-84%' : '85%+'}
                </span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
