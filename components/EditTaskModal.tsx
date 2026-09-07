'use client';

import { useEffect, useState } from 'react';
import { Check, Info } from 'lucide-react';
import clsx from 'clsx';
import Modal from '@/components/Modal';
import type { Task, TaskPriority } from '@/lib/types';

/** ค่าที่แก้ได้จากกล่องนี้ (ส่งเฉพาะที่เปลี่ยนจริงไปให้ API) */
export interface TaskEditPatch {
  title?: string;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
}

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  /** บันทึก - คืนข้อความ error ถ้าไม่สำเร็จ */
  onSave: (taskId: string, patch: TaskEditPatch) => Promise<string | null>;
}

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'สำคัญมาก' },
  { value: 'medium', label: 'ปานกลาง' },
  { value: 'low', label: 'ทั่วไป' },
];

export default function EditTaskModal({ open, task, onClose, onSave }: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // เปิดกล่องใหม่ = โหลดค่าปัจจุบันของงานนั้นเข้ามา
  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setPriority(task.priority);
      setStartDate(task.startDate ?? '');
      setDueDate(task.dueDate ?? '');
      setDueTime(task.dueTime ?? '');
      setError('');
    }
  }, [open, task]);

  if (!task) return null;

  // เปลี่ยนกำหนดส่งทั้งที่มีขั้นตอนย่อยวางแผนไว้แล้ว -> เตือนว่าแผนเดิมไม่ขยับตาม
  const plannedSubs = (task.subtasks ?? []).filter((s) => s.plannedDate).length;
  const dueChanged = (task.dueDate ?? '') !== dueDate;

  async function save() {
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError('ชื่องานว่างไม่ได้');
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      setError('กำหนดส่งต้องไม่มาก่อนวันที่เริ่ม');
      return;
    }
    // ส่งเฉพาะช่องที่เปลี่ยนจริง จะได้ไม่เขียนทับค่าที่ไม่ได้ตั้งใจแก้
    const patch: TaskEditPatch = {};
    if (trimmed !== task.title) patch.title = trimmed;
    if (priority !== task.priority) patch.priority = priority;
    if ((task.startDate ?? '') !== startDate) patch.startDate = startDate || null;
    if ((task.dueDate ?? '') !== dueDate) patch.dueDate = dueDate || null;
    // ล้างวันกำหนดส่ง = ล้างเวลาส่งไปด้วย
    const nextDueTime = dueDate ? dueTime : '';
    if ((task.dueTime ?? '') !== nextDueTime) patch.dueTime = nextDueTime || null;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setError('');
    const err = await onSave(task.id, patch);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  }

  const inputClass =
    'w-full rounded-clay-sm bg-eddy-50 px-3 py-2 font-body text-sm text-ink shadow-clay-inset placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-eddy-300';

  return (
    <Modal open={open} onClose={onClose} title="แก้ไขงาน" maxWidth="max-w-md">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block font-body text-xs text-ink-muted" htmlFor="edit-title">
            ชื่องาน
          </label>
          <input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block font-body text-xs text-ink-muted" htmlFor="edit-priority">
            ความสำคัญ
          </label>
          <select
            id="edit-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className={inputClass}
          >
            {priorityOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label className="mb-1 block font-body text-xs text-ink-muted" htmlFor="edit-start">
              วันที่เริ่ม
            </label>
            <input id="edit-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block font-body text-xs text-ink-muted" htmlFor="edit-due">
              กำหนดส่ง
            </label>
            <input id="edit-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="mb-1 block font-body text-xs text-ink-muted" htmlFor="edit-due-time">
            เวลาส่ง (ไม่บังคับ)
          </label>
          <input
            id="edit-due-time"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={!dueDate}
            className={clsx(inputClass, 'disabled:opacity-40')}
          />
          <p className="mt-1 font-body text-[11px] text-ink-muted">
            {dueDate ? 'ไม่ใส่ = หมุดกำหนดส่งขึ้นปฏิทินเป็นกิจกรรมทั้งวัน' : 'ใส่วันกำหนดส่งก่อน'}
          </p>
        </div>

        {/* เปลี่ยนกำหนดส่งไม่ได้ย้ายแผนของขั้นตอนย่อยให้เอง - บอกไว้ก่อนจะได้ไม่เข้าใจผิด */}
        {dueChanged && plannedSubs > 0 && (
          <p className="flex items-start gap-1.5 rounded-clay-sm bg-pastel-yellow/60 px-3 py-2 font-body text-[11px] text-ink dark:bg-pastel-yellow-dark/20 dark:text-pastel-yellow-dark">
            <Info size={12} className="mt-0.5 flex-shrink-0" />
            งานนี้มีขั้นตอนย่อยที่วางวันไว้แล้ว {plannedSubs} ข้อ — เปลี่ยนกำหนดส่งแล้ววันของขั้นตอนจะยังอยู่ที่เดิม
            กด &ldquo;ให้ EDDY จัดลงปฏิทินให้&rdquo; ที่แถวงานเพื่อจัดใหม่ได้
          </p>
        )}

        {error && (
          <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-xs text-eddy-700">{error}</p>
        )}

        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-clay-sm bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 disabled:opacity-60"
          >
            <Check size={14} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-clay-sm bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted hover:bg-eddy-100"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </Modal>
  );
}
