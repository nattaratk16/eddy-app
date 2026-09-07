'use client';

/**
 * WorkloadPanel — กราฟแท่งแนวตั้งแสดงภาระงานของสมาชิก (Workload Score)
 * --------------------------------------------------------------
 * ใช้ทั้งแท็บภาพรวมกลุ่มและแท็บงานกลุ่ม
 * ข้อมูลมาจาก GET /api/groups/[id]/workload หรือรับ rows ที่เพิ่งกระจายงานเสร็จมาแสดงแทน
 *
 * การอ่านกราฟ:
 *   รางสีจาง = เวลาที่คนนั้นมีทั้งหมดในกรอบเวลาที่สะดวก (= 100%)
 *   แท่งทึบ  = ส่วนที่ถูกงานจองไปแล้ว - เต็มรางเมื่อไหร่คือไม่เหลือเวลาว่าง
 *             ใช้ % แทนค่า score ตรงๆ เพราะ score = งาน ÷ ว่าง ไม่มีเพดาน
 *             (คนที่ว่างเหลือน้อยมากจะพุ่งไปหลายสิบ แล้วแท่งคนอื่นจะแบนหมด)
 *   สี       = แยกตามประเภทงานที่ครองเวลานั้น - วิชาการ / ไม่ใช่วิชาการ / งานค้างยังไม่ลงปฏิทิน
 *             (ซ้อนกันเป็น stacked bar เรียงจากล่างขึ้นบน มีช่องไฟ 2px คั่นแต่ละส่วนตามหลัก
 *             dataviz skill - ดูรายละเอียดการคำนวณสัดส่วนที่ lib/categoryWorkload.ts)
 *             ข้อมูลชุดที่เพิ่งกระจายงานเสร็จ (rows prop จากหน้า tasks) ยังไม่มีสัดส่วนนี้
 *             (งานกลุ่มไม่ผูกกับหมวดหมู่) เลยใช้สีตามระดับความแน่น (เขียว/ส้ม/แดง) แทนแบบเดิม
 *
 * สีทั้งหมดผ่าน validator ของ dataviz skill ครบทุกข้อ - ดูหมายเหตุใน tailwind.config.js
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
  /** เวลาที่ลงปฏิทินแล้วในหมวดวิชาการ (นาที) - undefined = ยังไม่มีข้อมูล (เช่น ผลลัพธ์เพิ่งกระจายงาน) */
  academicMinutes?: number;
  nonAcademicMinutes?: number;
  score: number | null; // null = ไม่เหลือเวลาว่างเลย
}

/** 90 -> "1 ชม. 30 น." */
export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} น.`;
  return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} น.`;
}

/** ระดับความแน่นจาก % เวลาที่ถูกจองไปแล้ว - ใช้เป็นข้อความกำกับใต้ชื่อเสมอ + สีแท่งตอนไม่มีข้อมูลแยกหมวด */
const BANDS = [
  { key: 'free', max: 55, label: 'ยังว่าง', range: 'ต่ำกว่า 55%', bar: 'bg-load-free' },
  { key: 'tight', max: 85, label: 'เริ่มแน่น', range: '55-84%', bar: 'bg-load-tight' },
  { key: 'full', max: Infinity, label: 'แน่นมาก', range: '85% ขึ้นไป', bar: 'bg-load-full' },
] as const;

function bandOf(pct: number) {
  return BANDS.find((b) => pct < b.max) ?? BANDS[BANDS.length - 1];
}

/** สามชั้นของแท่ง เรียงจากล่างขึ้นบน (flex-col-reverse ใน markup ใช้สีเดียวกับ swatch ตรงๆ) */
const KIND_SEGMENTS = [
  { key: 'academic', label: 'วิชาการ', swatch: 'bg-kind-academic' },
  { key: 'nonAcademic', label: 'ไม่ใช่วิชาการ', swatch: 'bg-kind-nonAcademic' },
  { key: 'pending', label: 'งานค้างยังไม่ลงปฏิทิน', swatch: 'bg-ink-muted/50' },
] as const;

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
  // เรียงจากคนที่แน่นสุดไปหาคนที่ว่างสุด - อ่านซ้ายไปขวาแล้วเห็นทันทีว่าใครควรได้งานเพิ่ม
  const sorted = [...data].sort((a, b) => (b.score ?? Infinity) - (a.score ?? Infinity));
  // มีสัดส่วนวิชาการ/ไม่ใช่วิชาการให้โชว์ไหม (ชุดที่เพิ่งกระจายงานเสร็จยังไม่มี เพราะงานกลุ่มไม่ผูกหมวดหมู่)
  const hasKindData = sorted.length > 0 && sorted.every((m) => typeof m.academicMinutes === 'number');

  return (
    <div className={className}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="flex items-center gap-1.5 font-display text-base font-bold text-ink">
            <Gauge size={17} className="text-eddy-500" /> ภาระงานของสมาชิก
          </h3>
          <p className="mt-0.5 font-body text-xs text-ink-muted">
            ความสูงของแท่ง = เวลาที่มีงานจองไว้แล้ว เทียบกับเวลาที่มีทั้งหมดใน 7 วันข้างหน้า
          </p>
        </div>
        {/* คำอธิบายสี - สีอย่างเดียวไม่ควรเป็นตัวบอกความหมายตัวเดียว */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {hasKindData
            ? KIND_SEGMENTS.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 font-body text-xs text-ink-soft">
                  <span className={clsx('h-2.5 w-2.5 rounded-sm', s.swatch)} />
                  {s.label}
                </span>
              ))
            : BANDS.map((b) => (
                <span key={b.key} className="flex items-center gap-1.5 font-body text-xs text-ink-soft">
                  <span className={clsx('h-2.5 w-2.5 rounded-sm', b.bar)} />
                  {b.label}
                  <span className="text-ink-muted">{b.range}</span>
                </span>
              ))}
        </div>
      </div>

      {loading && !rows ? (
        <p className="py-12 text-center font-body text-sm text-ink-muted">กำลังคำนวณ...</p>
      ) : sorted.length === 0 ? (
        <p className="py-12 text-center font-body text-sm text-ink-muted">ยังไม่มีสมาชิกให้คำนวณ</p>
      ) : (
        <div className="mt-5 overflow-x-auto pb-1">
          <div className="flex min-w-max items-stretch gap-4 sm:min-w-0">
            {sorted.map((m) => {
              const capacity = m.committedMinutes + m.freeMinutes;
              const pct = capacity > 0 ? Math.round((m.committedMinutes / capacity) * 100) : 100;
              const band = bandOf(pct);
              const barPct = pct > 0 ? Math.max(pct, 3) : 0;
              const academicMin = m.academicMinutes ?? 0;
              const nonAcademicMin = m.nonAcademicMinutes ?? 0;
              const pendingMin = m.pendingMinutes ?? 0;
              const open = openId === m.userId;
              return (
                <div
                  key={m.userId}
                  // จำกัดความกว้างแท่งไว้ ไม่งั้นกลุ่มเล็ก 2-3 คนแท่งจะกลายเป็นบล็อกใหญ่เต็มการ์ด
                  className="relative flex w-[92px] flex-shrink-0 flex-col items-center sm:w-auto sm:max-w-[116px] sm:flex-1"
                  onMouseEnter={() => setOpenId(m.userId)}
                  onMouseLeave={() => setOpenId((cur) => (cur === m.userId ? null : cur))}
                >
                  {/* ตัวเลขเหนือแท่ง */}
                  <span className="mb-1.5 font-display text-lg font-bold leading-none text-ink">{pct}%</span>

                  {/* ราง = เวลาที่มีทั้งหมด, แท่งทึบ = ที่ถูกจองไปแล้ว (ตัด overflow ให้มุมโค้งตามราง) */}
                  <div className="flex h-[190px] w-full items-end justify-center overflow-hidden rounded-clay-sm bg-eddy-50/80">
                    {hasKindData ? (
                      <div className="flex w-full flex-col-reverse gap-[2px]" style={{ height: `${barPct}%` }}>
                        {academicMin > 0 && (
                          <div className="w-full bg-kind-academic" style={{ flexGrow: academicMin, flexBasis: 0 }} />
                        )}
                        {nonAcademicMin > 0 && (
                          <div className="w-full bg-kind-nonAcademic" style={{ flexGrow: nonAcademicMin, flexBasis: 0 }} />
                        )}
                        {pendingMin > 0 && (
                          <div className="w-full bg-ink-muted/50" style={{ flexGrow: pendingMin, flexBasis: 0 }} />
                        )}
                      </div>
                    ) : (
                      <div
                        className={clsx('w-full transition-[height] duration-500 ease-out', band.bar)}
                        style={{ height: `${barPct}%` }}
                      />
                    )}
                  </div>

                  {/* ชื่อ + ระดับ */}
                  <p className="mt-2.5 w-full truncate text-center font-body text-sm font-semibold text-ink">
                    {m.name}
                  </p>
                  <p className="w-full truncate text-center font-body text-xs text-ink-muted">
                    {m.isMe ? 'คุณ · ' : ''}
                    {band.label}
                  </p>
                  <p className="mt-1 w-full truncate text-center font-body text-[11px] text-ink-muted">
                    ว่าง {formatHours(m.freeMinutes)}
                    {m.assignedMinutes > 0 ? ` · +${formatHours(m.assignedMinutes)}` : ''}
                  </p>

                  {/* รายละเอียดตอนชี้เมาส์ */}
                  {open && (
                    <div className="absolute -top-2 left-1/2 z-20 w-max max-w-[240px] -translate-x-1/2 -translate-y-full rounded-clay-sm bg-inverse px-3 py-2 text-left shadow-clay-sm">
                      <p className="font-display text-xs font-bold text-white">{m.name}</p>
                      {hasKindData && (
                        <>
                          <p className="mt-1 font-body text-[11px] text-white/80">วิชาการ {formatHours(academicMin)}</p>
                          <p className="font-body text-[11px] text-white/80">ไม่ใช่วิชาการ {formatHours(nonAcademicMin)}</p>
                        </>
                      )}
                      <p className={clsx('font-body text-[11px] text-white/80', hasKindData && 'mt-1')}>
                        งานค้างที่ยังไม่ได้ลงปฏิทิน {formatHours(m.pendingMinutes ?? 0)}
                      </p>
                      <p className="font-body text-[11px] text-white/80">เวลาว่างที่เหลือ {formatHours(m.freeMinutes)}</p>
                      <p className="mt-1.5 border-t border-white/15 pt-1.5 font-body text-[11px] text-white/60">
                        คะแนน = งานที่มี ÷ เวลาว่าง = {m.score === null ? 'ไม่เหลือเวลาว่าง' : m.score.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
