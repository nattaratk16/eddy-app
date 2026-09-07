'use client';

import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarClock, Check, GripVertical, Pencil, X } from 'lucide-react';
import clsx from 'clsx';
import type { Subtask } from '@/lib/types';

/** แผนวัน/เวลาของงานย่อยที่ผู้ใช้แก้ได้ (ส่ง null เพื่อล้างค่า) */
export interface SubtaskPlanPatch {
  plannedDate: string | null;
  startTime: string | null;
  endTime: string | null;
}

interface SortableSubtaskListProps {
  subtasks: Subtask[];
  onToggle: (subtask: Subtask) => void;
  onDelete: (subtaskId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  /** บันทึกวัน/เวลาที่ผู้ใช้ปรับเอง - ไม่ส่งมา = ซ่อนปุ่มแก้ไขเวลา */
  onPlanChange?: (subtaskId: string, plan: SubtaskPlanPatch) => void;
}

/** "2026-09-05" -> "ศ. 5 ก.ย." */
function formatThaiDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function SortableSubtaskItem({
  subtask,
  onToggle,
  onDelete,
  onPlanChange,
}: {
  subtask: Subtask;
  onToggle: (subtask: Subtask) => void;
  onDelete: (subtaskId: string) => void;
  onPlanChange?: (subtaskId: string, plan: SubtaskPlanPatch) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id });
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(subtask.plannedDate ?? '');
  const [start, setStart] = useState(subtask.startTime ?? '');
  const [end, setEnd] = useState(subtask.endTime ?? '');

  // แถวนี้ไม่ถูก unmount เวลาข้อมูลรีเฟรช (key คงเดิม) ค่าในช่องกรอกจึงค้างของเก่าไว้
  // ถ้าเอ็ดดี้เพิ่งวางแผนใหม่ให้ แล้วผู้ใช้กดดินสอ-กดบันทึกโดยไม่แก้อะไร
  // ค่าเก่า (อาจเป็นค่าว่าง) จะถูกเขียนทับแผนใหม่ และ event ที่เพิ่งสร้างจะโดนลบ
  // จึงต้องดึงค่าล่าสุดมาใส่ทุกครั้งที่ "เปิดโหมดแก้ไข"
  function beginEdit() {
    setDate(subtask.plannedDate ?? '');
    setStart(subtask.startTime ?? '');
    setEnd(subtask.endTime ?? '');
    setEditing(true);
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function save() {
    onPlanChange?.(subtask.id, {
      plannedDate: date || null,
      startTime: start || null,
      endTime: end || null,
    });
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="ลากเพื่อจัดลำดับ"
          className="flex-shrink-0 touch-none text-ink-muted hover:text-eddy-600"
        >
          <GripVertical size={14} />
        </button>
        <button
          onClick={() => onToggle(subtask)}
          aria-label="ติ๊กรายการย่อยว่าทำเสร็จแล้ว"
          className={clsx(
            'h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors',
            subtask.done ? 'border-eddy-500 bg-eddy-500' : 'border-eddy-300 bg-surface'
          )}
        />
        <p className={clsx('min-w-0 flex-1 font-body text-sm', subtask.done ? 'text-ink-muted line-through' : 'text-ink')}>
          {subtask.title}
        </p>

        {/* ป้ายวัน/เวลาที่เอ็ดดี้วางแผนไว้ - กดเพื่อแก้ */}
        {!editing && subtask.plannedDate && (
          <span
            title={subtask.onCalendar ? 'อยู่ในปฏิทินแล้ว' : 'ยังไม่ได้ลงปฏิทิน'}
            className={clsx(
              'flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10px] font-semibold',
              subtask.done
                ? 'bg-eddy-50 text-ink-muted'
                : subtask.onCalendar
                  ? 'bg-pastel-lilac text-chip-ink'
                  : 'bg-eddy-50 text-ink-soft ring-1 ring-inset ring-eddy-200'
            )}
          >
            <CalendarClock size={10} />
            {formatThaiDay(subtask.plannedDate)}
            {subtask.startTime ? ` ${subtask.startTime}` : ''}
            {subtask.endTime ? `-${subtask.endTime}` : ''}
          </span>
        )}

        {onPlanChange && !editing && (
          <button
            type="button"
            onClick={beginEdit}
            aria-label={subtask.plannedDate ? 'แก้วัน/เวลาของขั้นตอนนี้' : 'กำหนดวัน/เวลาให้ขั้นตอนนี้'}
            title={subtask.plannedDate ? 'แก้วัน/เวลา' : 'กำหนดวัน/เวลา'}
            className="flex-shrink-0 text-ink-muted hover:text-eddy-600"
          >
            <Pencil size={12} />
          </button>
        )}

        <button
          onClick={() => onDelete(subtask.id)}
          aria-label="ลบรายการย่อย"
          className="flex-shrink-0 text-ink-muted hover:text-eddy-600"
        >
          <X size={14} />
        </button>
      </div>

      {/* แถวแก้ไขวัน/เวลา */}
      {editing && (
        <div className="ml-8 flex flex-wrap items-center gap-1.5 rounded-clay-sm bg-surface px-2 py-1.5">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="วันที่ทำขั้นตอนนี้"
            className="rounded bg-eddy-50 px-2 py-1 font-body text-[11px] text-ink focus:outline-none focus:ring-1 focus:ring-eddy-300"
          />
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-label="เวลาเริ่ม"
            className="rounded bg-eddy-50 px-2 py-1 font-body text-[11px] text-ink focus:outline-none focus:ring-1 focus:ring-eddy-300"
          />
          <span className="font-body text-[11px] text-ink-muted">-</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-label="เวลาจบ"
            className="rounded bg-eddy-50 px-2 py-1 font-body text-[11px] text-ink focus:outline-none focus:ring-1 focus:ring-eddy-300"
          />
          <button
            type="button"
            onClick={save}
            className="flex items-center gap-0.5 rounded-full bg-eddy-500 px-2.5 py-1 font-display text-[11px] font-semibold text-white hover:brightness-110"
          >
            <Check size={11} /> บันทึก
          </button>
          <button
            type="button"
            onClick={cancel}
            className="rounded-full bg-eddy-50 px-2.5 py-1 font-display text-[11px] font-semibold text-ink-muted hover:bg-eddy-100"
          >
            ยกเลิก
          </button>
        </div>
      )}
    </div>
  );
}

export default function SortableSubtaskList({
  subtasks,
  onToggle,
  onDelete,
  onReorder,
  onPlanChange,
}: SortableSubtaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = subtasks.findIndex((s) => s.id === active.id);
    const newIndex = subtasks.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(subtasks, oldIndex, newIndex);
    onReorder(reordered.map((s) => s.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={subtasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {subtasks.map((s) => (
            <SortableSubtaskItem
              key={s.id}
              subtask={s}
              onToggle={onToggle}
              onDelete={onDelete}
              onPlanChange={onPlanChange}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
