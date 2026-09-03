'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Sparkles, Wand2 } from 'lucide-react';
import clsx from 'clsx';
import Modal from '@/components/Modal';
import type { Subtask, Task } from '@/lib/types';

/** หนึ่งแถวในกล่อง = งานหลัก (ไม่มีขั้นตอนย่อย) หรือขั้นตอนย่อยหนึ่งข้อ */
export interface ScheduleRow {
  /** null = แถวของงานหลักเอง */
  subtaskId: string | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface ScheduleTaskModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  /** บันทึกจริง - คืน error message ถ้าไม่สำเร็จ */
  onConfirm: (rows: ScheduleRow[]) => Promise<string | null>;
  /** ขอให้เอ็ดดี้หาเวลาว่างมาเติมให้ (คืน null ถ้าไม่สำเร็จ) */
  onAutoFill: (task: Task) => Promise<ScheduleRow[] | null>;
}

const DEFAULT_START = '09:00';

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

/** สร้างแถวเริ่มต้นจากค่าที่มีอยู่แล้ว (ยังไม่มีก็เดาให้พอเริ่มแก้ได้) */
function initialRows(task: Task): ScheduleRow[] {
  const subs: Subtask[] = (task.subtasks ?? []).filter((s) => !s.done);
  // งานที่เลยกำหนดมาแล้ว ห้ามตั้งค่าเริ่มต้นเป็นวันในอดีต ไม่งั้นกดยืนยันแล้วได้ event ย้อนหลัง
  // (ฝั่งเซิร์ฟเวอร์เชื่อเวลาที่ผู้ใช้ส่งมาตรงๆ จึงต้องกันตั้งแต่ค่าเริ่มต้นที่นี่)
  const today = todayISO();
  const preferred = task.dueDate ?? task.startDate ?? today;
  const fallbackDate = preferred < today ? today : preferred;

  if (subs.length > 0) {
    return subs.map((s) => {
      const start = s.startTime ?? DEFAULT_START;
      return {
        subtaskId: s.id,
        title: s.title,
        date: s.plannedDate ?? fallbackDate,
        startTime: start,
        endTime: s.endTime ?? addMinutes(start, s.estimatedMinutes ?? 60),
      };
    });
  }

  const start = task.scheduled?.startTime ?? DEFAULT_START;
  return [
    {
      subtaskId: null,
      title: task.title,
      date: task.scheduled?.date ?? fallbackDate,
      startTime: start,
      endTime: task.scheduled?.endTime ?? addMinutes(start, task.estimatedMinutes ?? 60),
    },
  ];
}

export default function ScheduleTaskModal({ open, task, onClose, onConfirm, onAutoFill }: ScheduleTaskModalProps) {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState('');

  // เปิดกล่องใหม่ทุกครั้ง = เริ่มจากค่าล่าสุดของงานนั้น
  useEffect(() => {
    if (open && task) {
      setRows(initialRows(task));
      setError('');
    }
  }, [open, task]);

  if (!task) return null;

  const isSubtaskMode = rows.length > 0 && rows[0].subtaskId !== null;

  function patchRow(index: number, patch: Partial<ScheduleRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function autoFill() {
    if (!task) return;
    setFilling(true);
    setError('');
    const filled = await onAutoFill(task);
    if (filled && filled.length > 0) {
      // เติมเฉพาะแถวที่หาเวลาให้ได้ ที่เหลือคงค่าเดิมไว้
      setRows((prev) =>
        prev.map((r) => {
          const found = filled.find((f) => f.subtaskId === r.subtaskId);
          return found ? { ...r, date: found.date, startTime: found.startTime, endTime: found.endTime } : r;
        })
      );
    } else {
      setError('ตอนนี้เอ็ดดี้หาช่วงเวลาว่างให้ไม่ได้ ลองกำหนดเองได้เลย');
    }
    setFilling(false);
  }

  async function confirm() {
    // ตรวจก่อนส่ง: ต้องมีวันครบ และเวลาจบต้องหลังเวลาเริ่ม
    const bad = rows.find((r) => !r.date || !r.startTime || !r.endTime || r.endTime <= r.startTime);
    if (bad) {
      setError(
        !bad.date || !bad.startTime || !bad.endTime
          ? `"${bad.title}" ยังกรอกวัน/เวลาไม่ครบ`
          : `"${bad.title}" เวลาจบต้องอยู่หลังเวลาเริ่ม`
      );
      return;
    }
    setSaving(true);
    setError('');
    const err = await onConfirm(rows);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="ลงปฏิทิน" maxWidth="max-w-xl">
      <div className="flex items-start gap-2 rounded-clay-sm bg-eddy-50 px-3 py-2">
        <CalendarClock size={16} className="mt-0.5 flex-shrink-0 text-eddy-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-body font-semibold text-ink">{task.title}</p>
          <p className="font-body text-[11px] text-ink-muted">
            {isSubtaskMode
              ? `เลือกวัน-เวลาของแต่ละขั้นตอน (${rows.length} ขั้น) แล้วกดลงปฏิทิน`
              : 'เลือกวัน-เวลาที่จะลงปฏิทิน'}
            {task.dueDate ? ` · กำหนดส่ง ${task.dueDate}` : ''}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={autoFill}
        disabled={filling || saving}
        className="mt-3 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 disabled:opacity-60"
      >
        <Sparkles size={14} /> {filling ? 'กำลังหาเวลาว่าง...' : 'ให้เอ็ดดี้หาเวลาว่างให้'}
      </button>

      <div className="mt-3 flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={row.subtaskId ?? 'task'} className="rounded-clay-sm bg-eddy-50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              {isSubtaskMode && (
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white font-display text-[10px] font-bold text-eddy-700">
                  {i + 1}
                </span>
              )}
              <p className="min-w-0 flex-1 truncate font-body text-sm text-ink">{row.title}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <input
                type="date"
                value={row.date}
                onChange={(e) => patchRow(i, { date: e.target.value })}
                aria-label={`วันที่ของ ${row.title}`}
                className="rounded bg-white px-2 py-1.5 font-body text-xs text-ink shadow-clay-inset focus:outline-none focus:ring-1 focus:ring-eddy-300"
              />
              <input
                type="time"
                value={row.startTime}
                onChange={(e) => {
                  // ขยับเวลาเริ่ม -> เลื่อนเวลาจบตามให้ ความยาวเดิมคงไว้
                  const [oh, om] = row.startTime.split(':').map(Number);
                  const [eh, em] = row.endTime.split(':').map(Number);
                  const dur = Math.max(15, eh * 60 + em - (oh * 60 + om));
                  patchRow(i, { startTime: e.target.value, endTime: addMinutes(e.target.value, dur) });
                }}
                aria-label={`เวลาเริ่มของ ${row.title}`}
                className="rounded bg-white px-2 py-1.5 font-body text-xs text-ink shadow-clay-inset focus:outline-none focus:ring-1 focus:ring-eddy-300"
              />
              <span className="font-body text-xs text-ink-muted">-</span>
              <input
                type="time"
                value={row.endTime}
                onChange={(e) => patchRow(i, { endTime: e.target.value })}
                aria-label={`เวลาจบของ ${row.title}`}
                className={clsx(
                  'rounded bg-white px-2 py-1.5 font-body text-xs shadow-clay-inset focus:outline-none focus:ring-1',
                  row.endTime <= row.startTime ? 'text-eddy-700 ring-1 ring-pastel-pink' : 'text-ink focus:ring-eddy-300'
                )}
              />
              {task.dueDate && row.date > task.dueDate && (
                <span className="font-body text-[11px] font-semibold text-eddy-700">เลยกำหนดส่ง</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-xs text-eddy-700">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={saving || filling || rows.length === 0}
          className="flex items-center gap-1.5 rounded-clay-sm bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 disabled:opacity-60"
        >
          <Wand2 size={14} /> {saving ? 'กำลังบันทึก...' : `ลงปฏิทิน (${rows.length})`}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-clay-sm bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted hover:bg-eddy-100"
        >
          ยกเลิก
        </button>
      </div>
    </Modal>
  );
}
