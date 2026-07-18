'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Flame } from 'lucide-react';
import clsx from 'clsx';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import EddyMascot from '@/components/EddyMascot';
import SortableSubtaskList from '@/components/SortableSubtaskList';
import { computePriorityScore } from '@/lib/priorityScore';
import type { Subtask, Task, TaskPriority } from '@/lib/types';

const priorityOptions: { value: TaskPriority; label: string; chipClass: string }[] = [
  { value: 'high', label: 'สำคัญมาก', chipClass: 'bg-pastel-pink text-eddy-700' },
  { value: 'medium', label: 'ปานกลาง', chipClass: 'bg-pastel-yellow text-eddy-700' },
  { value: 'low', label: 'ทั่วไป', chipClass: 'bg-pastel-mint text-eddy-700' },
];

type Filter = 'all' | 'active' | 'done';

export default function TodoPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.email || 'เพื่อน';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [aiSort, setAiSort] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [showDetails, setShowDetails] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({});
  const [breakingDown, setBreakingDown] = useState<Record<string, boolean>>({});
  const [breakdownError, setBreakdownError] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks ?? []);
    })();
  }, []);

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  const visibleTasks = useMemo(() => {
    if (!aiSort) return filteredTasks;
    return [...filteredTasks].sort((a, b) => computePriorityScore(b) - computePriorityScore(a));
  }, [filteredTasks, aiSort]);

  // งานที่ยังไม่เสร็จซึ่งควรทำก่อนสุดตาม Priority Score (ใช้แสดงป้าย "ควรทำก่อน" ตอนเปิดโหมด AI sort)
  const topTaskId = useMemo(() => {
    const undone = tasks.filter((t) => !t.done);
    if (undone.length === 0) return null;
    return undone.reduce((best, t) => (computePriorityScore(t) > computePriorityScore(best) ? t : best)).id;
  }, [tasks]);

  async function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !task.done }),
    });
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle('');
    const dueDate = newDueDate || undefined;
    const estimatedMinutes = newEstimatedMinutes ? Number(newEstimatedMinutes) : undefined;
    setNewDueDate('');
    setNewEstimatedMinutes('');
    setShowDetails(false);

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority: newPriority, dueDate, estimatedMinutes }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setTasks((prev) => [data.task, ...prev]);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateTaskSubtasks(taskId: string, updater: (subtasks: Subtask[]) => Subtask[]) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, subtasks: updater(t.subtasks ?? []) } : t))
    );
  }

  async function toggleSubtask(taskId: string, subtask: Subtask) {
    updateTaskSubtasks(taskId, (subtasks) =>
      subtasks.map((s) => (s.id === subtask.id ? { ...s, done: !s.done } : s))
    );
    await fetch(`/api/subtasks/${subtask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !subtask.done }),
    });
  }

  async function deleteSubtask(taskId: string, subtaskId: string) {
    updateTaskSubtasks(taskId, (subtasks) => subtasks.filter((s) => s.id !== subtaskId));
    await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
  }

  async function reorderSubtasks(taskId: string, orderedIds: string[]) {
    updateTaskSubtasks(taskId, (subtasks) => {
      const byId = new Map(subtasks.map((s) => [s.id, s]));
      return orderedIds.map((id) => byId.get(id)!).filter(Boolean);
    });
    await fetch(`/api/tasks/${taskId}/subtasks/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtaskIds: orderedIds }),
    });
  }

  async function addSubtask(taskId: string) {
    const title = (subtaskDrafts[taskId] ?? '').trim();
    if (!title) return;
    setSubtaskDrafts((prev) => ({ ...prev, [taskId]: '' }));

    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (!res.ok) return;
    updateTaskSubtasks(taskId, (subtasks) => [...subtasks, data.subtask]);
  }

  async function breakdownTaskForId(taskId: string) {
    setBreakingDown((prev) => ({ ...prev, [taskId]: true }));
    setBreakdownError((prev) => ({ ...prev, [taskId]: '' }));
    try {
      const res = await fetch(`/api/tasks/${taskId}/breakdown`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setBreakdownError((prev) => ({ ...prev, [taskId]: data.error ?? 'แตกงานไม่สำเร็จ ลองใหม่อีกครั้งนะ' }));
        return;
      }
      updateTaskSubtasks(taskId, (subtasks) => [...subtasks, ...data.subtasks]);
    } catch {
      setBreakdownError((prev) => ({ ...prev, [taskId]: 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ' }));
    } finally {
      setBreakingDown((prev) => ({ ...prev, [taskId]: false }));
    }
  }

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="px-4 md:px-10">
      <Topbar userName={userName} />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-ink">สิ่งที่ต้องทำ</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAiSort((s) => !s)}
                className={clsx(
                  'flex items-center gap-1 rounded-clay-sm px-3 py-1.5 font-display text-xs font-semibold transition-colors',
                  aiSort ? 'bg-eddy-500 text-white' : 'bg-eddy-50 text-ink-muted hover:bg-eddy-100'
                )}
              >
                <Sparkles size={13} /> เรียงตาม AI แนะนำ
              </button>
              <div className="flex gap-1 rounded-clay-sm bg-eddy-50 p-1">
                {(['all', 'active', 'done'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={clsx(
                      'rounded-clay-sm px-3 py-1.5 font-display text-xs font-semibold transition-colors',
                      filter === f ? 'bg-eddy-500 text-white' : 'text-ink-muted'
                    )}
                  >
                    {f === 'all' ? 'ทั้งหมด' : f === 'active' ? 'ยังไม่เสร็จ' : 'เสร็จแล้ว'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Add task form */}
          <form onSubmit={addTask} className="mt-5 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="เพิ่มสิ่งที่ต้องทำ..."
                className="flex-1 rounded-clay-sm bg-eddy-50 px-4 py-3 font-body text-sm text-ink shadow-clay-inset placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-eddy-300"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="rounded-clay-sm bg-eddy-50 px-4 py-3 font-body text-sm text-ink shadow-clay-inset focus:outline-none"
              >
                {priorityOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="flex items-center justify-center gap-1 rounded-clay-sm bg-eddy-500 px-5 py-3 font-display text-sm font-semibold text-white"
              >
                <Plus size={16} /> เพิ่ม
              </button>
            </div>

            {showDetails ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <label className="mb-1 block font-body text-xs text-ink-muted" htmlFor="new-due-date">
                    กำหนดส่ง (ไม่บังคับ)
                  </label>
                  <input
                    id="new-due-date"
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full rounded-clay-sm bg-eddy-50 px-3 py-2 font-body text-sm text-ink shadow-clay-inset focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block font-body text-xs text-ink-muted" htmlFor="new-estimate">
                    ใช้เวลาโดยประมาณ (นาที, ไม่บังคับ)
                  </label>
                  <input
                    id="new-estimate"
                    type="number"
                    min={1}
                    value={newEstimatedMinutes}
                    onChange={(e) => setNewEstimatedMinutes(e.target.value)}
                    placeholder="เช่น 30"
                    className="w-full rounded-clay-sm bg-eddy-50 px-3 py-2 font-body text-sm text-ink shadow-clay-inset placeholder:text-ink-muted focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="self-start font-body text-xs font-semibold text-eddy-600 hover:underline"
              >
                + เพิ่มรายละเอียด (กำหนดส่ง / เวลาโดยประมาณ)
              </button>
            )}
          </form>

          {/* Task list */}
          <div className="mt-5 flex flex-col gap-3">
            {visibleTasks.length === 0 && (
              <p className="py-6 text-center font-body text-sm text-ink-muted">
                ไม่มีรายการในหมวดนี้
              </p>
            )}
            {visibleTasks.map((task) => {
              const priority = priorityOptions.find((p) => p.value === task.priority)!;
              const subtasks = task.subtasks ?? [];
              const subDone = subtasks.filter((s) => s.done).length;
              const expanded = expandedIds.has(task.id);
              const isTopTask = aiSort && !task.done && task.id === topTaskId;
              return (
                <div key={task.id} className="rounded-clay-sm bg-eddy-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(task.id)}
                      aria-label={expanded ? 'ย่อรายการย่อย' : 'ขยายรายการย่อย'}
                      className="flex-shrink-0 text-ink-muted hover:text-eddy-600"
                    >
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label="ติ๊กว่าทำเสร็จแล้ว"
                      className={clsx(
                        'h-6 w-6 flex-shrink-0 rounded-full border-2 transition-colors',
                        task.done ? 'border-eddy-500 bg-eddy-500' : 'border-eddy-300 bg-white'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isTopTask && (
                          <span className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-pastel-peach px-2 py-0.5 font-display text-[10px] font-bold text-eddy-700">
                            <Flame size={11} /> ควรทำก่อน
                          </span>
                        )}
                        <p className={clsx('truncate font-body text-sm', task.done ? 'text-ink-muted line-through' : 'text-ink')}>
                          {task.title}
                        </p>
                        {subtasks.length > 0 && (
                          <span className="flex-shrink-0 font-body text-xs text-ink-muted">
                            {subDone}/{subtasks.length}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 font-body text-xs text-ink-muted">
                        {task.category && <span>{task.category}</span>}
                        {task.dueDate && <span>กำหนดส่ง {task.dueDate}</span>}
                        {task.estimatedMinutes && <span>~{task.estimatedMinutes} นาที</span>}
                      </div>
                      {subtasks.length > 0 && (
                        <div className="mt-1.5 h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-eddy-400 transition-all"
                            style={{ width: `${(subDone / subtasks.length) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <span className={clsx('flex-shrink-0 rounded-full px-3 py-1 font-body text-xs font-semibold', priority.chipClass)}>
                      {priority.label}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      aria-label="ลบรายการ"
                      className="flex-shrink-0 text-ink-muted hover:text-eddy-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {expanded && (
                    <div className="ml-9 mt-3 flex flex-col gap-2 border-l-2 border-eddy-100 pl-4">
                      {subtasks.length > 0 && (
                        <SortableSubtaskList
                          subtasks={subtasks}
                          onToggle={(s) => toggleSubtask(task.id, s)}
                          onDelete={(subtaskId) => deleteSubtask(task.id, subtaskId)}
                          onReorder={(orderedIds) => reorderSubtasks(task.id, orderedIds)}
                        />
                      )}

                      {subtasks.length === 0 && (
                        <div className="flex items-center gap-2 rounded-clay-sm bg-pastel-mint/50 px-3 py-2">
                          <EddyMascot mood="think" size={28} float={false} />
                          <div className="flex-1">
                            <p className="font-body text-xs text-ink">ให้เอ็ดดี้ช่วยแตกงานนี้เป็นขั้นตอนย่อยไหม?</p>
                            {breakdownError[task.id] && (
                              <p className="mt-0.5 font-body text-[11px] text-eddy-700">{breakdownError[task.id]}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => breakdownTaskForId(task.id)}
                            disabled={breakingDown[task.id]}
                            className="flex flex-shrink-0 items-center gap-1 rounded-clay-sm bg-eddy-500 px-2.5 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-60"
                          >
                            <Sparkles size={12} /> {breakingDown[task.id] ? 'กำลังแตกงาน...' : 'แตกงานให้'}
                          </button>
                        </div>
                      )}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          addSubtask(task.id);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          value={subtaskDrafts[task.id] ?? ''}
                          onChange={(e) => setSubtaskDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))}
                          placeholder="+ เพิ่มรายการย่อย"
                          className="flex-1 rounded-clay-sm bg-white px-3 py-1.5 font-body text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-eddy-300"
                        />
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Progress summary */}
        <Card tone="white" className="flex flex-col items-center text-center">
          <EddyMascot mood={doneCount === tasks.length && tasks.length > 0 ? 'celebrate' : 'happy'} size={88} />
          <p className="mt-3 font-display text-base font-bold text-ink">
            ทำเสร็จแล้ว {doneCount} จาก {tasks.length}
          </p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-eddy-50">
            <div
              className="h-full rounded-full bg-eddy-500 transition-all"
              style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-3 font-body text-sm text-ink-muted">
            {doneCount === tasks.length && tasks.length > 0
              ? 'เก่งมาก! ทำครบทุกอย่างแล้ว 🎉'
              : 'สู้ๆนะ ใกล้จะครบแล้ว!'}
          </p>
        </Card>
      </section>
    </div>
  );
}
