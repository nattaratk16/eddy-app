'use client';

import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import clsx from 'clsx';
import type { Subtask } from '@/lib/types';

interface SortableSubtaskListProps {
  subtasks: Subtask[];
  onToggle: (subtask: Subtask) => void;
  onDelete: (subtaskId: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

function SortableSubtaskItem({
  subtask,
  onToggle,
  onDelete,
}: {
  subtask: Subtask;
  onToggle: (subtask: Subtask) => void;
  onDelete: (subtaskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
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
          subtask.done ? 'border-eddy-500 bg-eddy-500' : 'border-eddy-300 bg-white'
        )}
      />
      <p className={clsx('flex-1 font-body text-sm', subtask.done ? 'text-ink-muted line-through' : 'text-ink')}>
        {subtask.title}
      </p>
      <button
        onClick={() => onDelete(subtask.id)}
        aria-label="ลบรายการย่อย"
        className="flex-shrink-0 text-ink-muted hover:text-eddy-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function SortableSubtaskList({ subtasks, onToggle, onDelete, onReorder }: SortableSubtaskListProps) {
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
            <SortableSubtaskItem key={s.id} subtask={s} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
