'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import EddyMascot from '@/components/EddyMascot';
import type { Task } from '@/lib/types';

interface CompletedTasksModalProps {
  open: boolean;
  onClose: () => void;
  /** เอากลับมาทำต่อ - ให้หน้าหลักจัดการ PATCH + คืนงานสู่ลิสต์ที่ยังไม่เสร็จเอง */
  onRestore: (task: Task) => void;
  /** ขอลบ - ให้หน้าหลักเปิดกล่องยืนยันด้วยข้อมูลงานนี้ (ไม่ได้ลบตรงนี้ทันที) */
  onRequestDelete: (task: Task) => void;
  /**
   * เพิ่มค่านี้ทุกครั้งที่หน้าหลัก restore/delete งานสำเร็จ -> กล่องนี้จะโหลดเดือนที่ค้างอยู่ใหม่
   * ใช้ signal แทนการพยายามตัด state ในนี้ตรงๆ จากภายนอก เพราะกล่องนี้เป็นเจ้าของ state ของตัวเอง
   */
  refreshSignal: number;
}

/** "2026-08-28" -> "พฤ. 28 ส.ค." */
function formatThaiDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
}

function currentMonthBangkok(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()).slice(0, 7);
}

/** "2026-09" -> "กันยายน 2569" */
function formatThaiMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('th-TH', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/**
 * งานที่เสร็จแล้ว - ดูทีละเดือน แทนที่จะเป็นลิสต์ยาวสะสมทั้งประวัติ
 * โหลดจาก /api/tasks/done?month=YYYY-MM ใหม่ทุกครั้งที่เปิดกล่องหรือเปลี่ยนเดือน
 */
export default function CompletedTasksModal({
  open,
  onClose,
  onRestore,
  onRequestDelete,
  refreshSignal,
}: CompletedTasksModalProps) {
  const [month, setMonth] = useState(currentMonthBangkok());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // เปิดกล่องใหม่ทุกครั้ง = กลับไปเดือนปัจจุบันเสมอ ไม่ค้างเดือนที่เคยดูรอบก่อน
  useEffect(() => {
    if (open) setMonth(currentMonthBangkok());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const res = await fetch(`/api/tasks/done?month=${month}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? 'โหลดไม่สำเร็จ ลองใหม่อีกครั้งนะ');
          setTasks([]);
          return;
        }
        setTasks(data.tasks ?? []);
      } catch {
        if (!cancelled) setError('เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, month, refreshSignal]);

  const isCurrentMonth = month === currentMonthBangkok();

  return (
    <Modal open={open} onClose={onClose} title="งานที่เสร็จแล้ว" maxWidth="max-w-lg">
      {/* แถบเลื่อนเดือน */}
      <div className="flex items-center justify-between gap-2 rounded-clay-sm bg-eddy-50 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          aria-label="เดือนก่อนหน้า"
          className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-eddy-100 hover:text-eddy-700"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-display text-sm font-semibold text-ink">{formatThaiMonth(month)}</span>
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={isCurrentMonth}
          aria-label="เดือนถัดไป"
          title={isCurrentMonth ? 'ยังไปเดือนหน้าไม่ได้ (ยังไม่ถึง)' : undefined}
          className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-eddy-100 hover:text-eddy-700 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3">
        {loading ? (
          <p className="py-6 text-center font-body text-sm text-ink-muted">กำลังโหลด...</p>
        ) : error ? (
          <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-xs text-eddy-700">{error}</p>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <EddyMascot mood="happy" size={56} float={false} />
            <p className="font-body text-sm text-ink-muted">
              {isCurrentMonth ? 'เดือนนี้ยังไม่มีงานที่เสร็จ' : `ไม่มีงานที่เสร็จในเดือน${formatThaiMonth(month)}`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => {
              const subs = task.subtasks ?? [];
              return (
                <div key={task.id} className="flex items-center gap-3 rounded-clay-sm bg-eddy-50 px-3 py-2.5">
                  <CheckCircle2 size={18} className="flex-shrink-0 text-eddy-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm text-ink-muted line-through">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-x-2 font-body text-[11px] text-ink-muted">
                      {task.dueDate && <span>กำหนดส่ง {formatThaiDay(task.dueDate)}</span>}
                      {subs.length > 0 && <span>{subs.length} ขั้นตอน</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestore(task)}
                    aria-label="เอากลับมาเป็นงานที่ยังไม่เสร็จ"
                    title="เอากลับมาทำต่อ"
                    className="flex flex-shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 font-display text-[11px] font-semibold text-eddy-700 hover:bg-eddy-100"
                  >
                    <RotateCcw size={12} /> เอากลับมา
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDelete(task)}
                    aria-label={`ลบงาน "${task.title}"`}
                    className="flex-shrink-0 text-ink-muted hover:text-eddy-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
