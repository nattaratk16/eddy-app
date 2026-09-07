'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, ChevronDown, ChevronRight, Flame, CalendarClock,
  X, Check, ListChecks, AlertTriangle, Lock, Wand2, CheckCircle2, Pencil,
} from 'lucide-react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import ScheduleTaskModal, { type ScheduleRow } from '@/components/ScheduleTaskModal';
import EditTaskModal, { type TaskEditPatch } from '@/components/EditTaskModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import CompletedTasksModal from '@/components/CompletedTasksModal';
import EddyMascot from '@/components/EddyMascot';
import EmptyState from '@/components/EmptyState';
import SortableSubtaskList, { type SubtaskPlanPatch } from '@/components/SortableSubtaskList';
import { compareTasks } from '@/lib/priorityScore';
import type { Subtask, Task, TaskPriority } from '@/lib/types';

const priorityOptions: { value: TaskPriority; label: string; chipClass: string }[] = [
  { value: 'high', label: 'สำคัญมาก', chipClass: 'bg-pastel-pink text-chip-ink' },
  { value: 'medium', label: 'ปานกลาง', chipClass: 'bg-pastel-yellow text-chip-ink' },
  { value: 'low', label: 'ทั่วไป', chipClass: 'bg-pastel-mint text-chip-ink' },
];

// ผลลัพธ์จาก POST /api/tasks/schedule (เอ็ดดี้หาช่องว่างในปฏิทินแล้วเสนอเวลาให้)
interface SchedulePlanItem {
  taskId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  durationMin: number;
  dueDate: string | null;
}
interface ScheduleSkipped {
  taskId: string;
  title: string;
  reason: string;
}
interface SchedulePlan {
  scheduled: SchedulePlanItem[];
  skipped: ScheduleSkipped[];
  message?: string;
}

/** วันที่วันนี้ตามเวลาไทย "YYYY-MM-DD" - ต้องตรงกับฝั่งเซิร์ฟเวอร์ (lib/thaiTime.ts) */
function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

/**
 * ปุ่มไอคอนประจำแถว
 * ทำเป็นตัวเดียวใช้ซ้ำ เพื่อให้ขนาด/ระยะห่าง/สี hover เหมือนกันหมดทุกปุ่ม
 * ไม่ต้องก๊อป class ยาวๆ ซ้ำ แล้วเผลอทำให้ปุ่มไม่เท่ากัน
 */
function RowAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  active = false,
  busy = false,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  busy?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx(
        'grid h-8 w-8 place-items-center rounded-full transition-colors disabled:opacity-40',
        active
          ? 'bg-pastel-lilac text-chip-ink hover:bg-pastel-lilac/70'
          : tone === 'danger'
            ? 'text-ink-muted hover:bg-pastel-pink/70 hover:text-chip-ink'
            : 'text-ink-muted hover:bg-eddy-100 hover:text-eddy-700'
      )}
    >
      <Icon size={15} className={clsx(busy && 'animate-pulse')} />
    </button>
  );
}

/**
 * สรุปว่าลบงานนี้แล้วอะไรจะหายไปด้วย
 * บอกให้ครบก่อนกดยืนยัน เพราะการลบงานจะลบ event ในปฏิทินตามไปด้วย
 * ซึ่งผู้ใช้อาจไม่ทันคิดว่าเกี่ยวข้องกัน
 */
function deleteImpact(task?: Task): string[] {
  if (!task) return [];
  const out: string[] = [];
  const subs = task.subtasks ?? [];
  if (subs.length > 0) out.push(`ขั้นตอนย่อย ${subs.length} ข้อ`);
  const events = (task.scheduled ? 1 : 0) + subs.filter((sub) => sub.onCalendar).length;
  if (events > 0) out.push(`กิจกรรมในปฏิทิน ${events} รายการ`);
  return out;
}

/** จำนวนวันที่เลยกำหนดส่งมาแล้ว (อย่างน้อย 1) */
function daysOverdue(dueDate: string): number {
  const diff = Date.parse(`${todayISO()}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`);
  return Math.max(1, Math.round(diff / 86400000));
}

/** "2026-08-28" -> "พฤ. 28 ส.ค." */
function formatThaiDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function TodoPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userName = session?.user?.name || session?.user?.email || 'เพื่อน';
  const [tasks, setTasks] = useState<Task[]>([]);
  // งานที่เสร็จแล้วออกจากลิสต์หลักไปอยู่ในป๊อปอัปแทน (ลิสต์หลักเหลือแต่งานที่ยังต้องทำ)
  const [showDone, setShowDone] = useState(false);
  // จำนวนงานที่เสร็จแล้วทั้งหมด (ไม่ใช่แค่ที่โหลดมา) - งานที่เสร็จแล้วไม่ถูกส่งมาใน GET /api/tasks อีกต่อไป
  // (ดูทีละเดือนแยกต่างหากผ่าน CompletedTasksModal) เลขนี้ไว้โชว์ที่ป้ายตัวเลขบนปุ่มเท่านั้น
  const [doneCount, setDoneCount] = useState(0);
  // จำนวนที่เสร็จ "เดือนนี้" เท่านั้น - ใช้กับการ์ดสรุปความคืบหน้าด้านล่าง ให้ตัวเลขตัดตามเดือน
  // เหมือนกล่อง "เสร็จแล้ว" ทุกประการ พอขึ้นเดือนใหม่ค่านี้จะรีเซ็ตเองตามที่เซิร์ฟเวอร์คำนวณให้
  const [doneCountThisMonth, setDoneCountThisMonth] = useState(0);
  // เพิ่มค่านี้ทุกครั้งที่ restore/delete งานที่เสร็จแล้วสำเร็จ ให้ CompletedTasksModal รู้ว่าต้องโหลดใหม่
  const [doneRefreshSignal, setDoneRefreshSignal] = useState(0);
  // กล่องเลือกเวลาก่อนลงปฏิทิน (เปิดจากปุ่ม "ลงปฏิทิน" ประจำแถว)
  const [scheduleTaskId, setScheduleTaskId] = useState<string | null>(null);
  // กล่องแก้ไขงาน (ชื่อ / ความสำคัญ / วันที่เริ่ม / กำหนดส่ง / เวลาโดยประมาณ)
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  // งานที่รอยืนยันก่อนลบ (ลบแล้วเอากลับไม่ได้ และลบ event ในปฏิทินตามไปด้วย)
  // เก็บ "งานทั้งชิ้น" ไม่ใช่แค่ id เพราะงานที่เสร็จแล้วไม่ได้อยู่ใน state tasks อีกต่อไป
  // (มันอยู่ใน CompletedTasksModal แยกต่างหาก) หา tasks.find(id) ไม่เจอถ้าลบมาจากกล่องนั้น
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  // โหมดเลือกงาน: ติ๊กเองว่าจะให้เอ็ดดี้จัดงานไหนบ้าง (ไม่ใช้ก็ = จัดทุกงานที่ค้าง)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [showDetails, setShowDetails] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState('');
  // ข้อ 6: ช่องวันที่เริ่ม ค่าเริ่มต้นคือวันที่ผู้ใช้เพิ่มงาน (= วันนี้)
  const [newStartDate, setNewStartDate] = useState(todayISO());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({});
  const [breakingDown, setBreakingDown] = useState<Record<string, boolean>>({});
  const [breakdownError, setBreakdownError] = useState<Record<string, string>>({});
  // จัดงานลงปฏิทินอัตโนมัติ: เสนอก่อน (dryRun) แล้วให้ผู้ใช้กดยืนยัน
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<SchedulePlan | null>(null);
  // งานที่ติ๊กเลือกไว้ในการ์ดข้อเสนอ (ค่าเริ่มต้น = เลือกทั้งหมด แต่ผู้ใช้เอาออกทีละงานได้)
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [committingPlan, setCommittingPlan] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  // การ์ดข้อเสนอมี 2 แบบ: 'all' = ผู้ใช้กดเอง, 'undated' = เอ็ดดี้เสนอเองเพราะเห็นว่ามีเวลาว่าง (ข้อ 5)
  const [planKind, setPlanKind] = useState<'all' | 'undated'>('all');
  // ข้อ 4: เตือนตอนพยายามปิดงานที่ขั้นตอนย่อยยังไม่ครบ
  const [blockedTaskId, setBlockedTaskId] = useState<string | null>(null);
  // ข้อ 4: ผู้ใช้รับทราบการเตือน "งานที่ถูกลืม" แล้ว (เก็บในหน่วยความจำหน้านี้พอ)
  const [forgottenAcked, setForgottenAcked] = useState(false);
  const [breakdownNotice, setBreakdownNotice] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      const loaded: Task[] = data.tasks ?? [];
      setTasks(loaded);
      setDoneCount(data.doneCount ?? 0);
      setDoneCountThisMonth(data.doneCountThisMonth ?? 0);

      // ข้อ 5: งานที่ยังไม่ได้กำหนดวัน มักถูกดองไว้เรื่อยๆ
      // ถ้ามีงานแบบนั้นค้างอยู่ ให้เอ็ดดี้ลองหาช่องว่างมาเสนอตั้งแต่เปิดหน้า (ยังไม่บันทึกอะไร)
      const hasUndated = loaded.some((t) => !t.done && !t.dueDate && !t.scheduled);
      if (!hasUndated) return;
      try {
        const sugRes = await fetch('/api/tasks/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dryRun: true, onlyUndated: true }),
        });
        const sug = await sugRes.json();
        const proposals: SchedulePlanItem[] = sug.scheduled ?? [];
        if (sugRes.ok && proposals.length > 0) {
          setPlanKind('undated');
          setPlan({ scheduled: proposals, skipped: sug.skipped ?? [] });
          setSelectedPlanIds(new Set(proposals.map((pr) => pr.taskId)));
        }
      } catch {
        // ข้อเสนอเป็นของแถม - เงียบไว้ ไม่ต้องรบกวนผู้ใช้ถ้าเรียกไม่สำเร็จ
      }
    })();
  }, []);

  // ลำดับล็อกไว้: ใกล้กำหนดส่งก่อน แล้วค่อยความสำคัญ (ดู compareTasks ใน lib/priorityScore.ts)
  // ไม่มีปุ่มสลับแล้ว เพื่อให้ผู้ใช้เดาลำดับได้เสมอว่าอะไรอยู่บนสุด
  const visibleTasks = useMemo(() => tasks.filter((t) => !t.done).sort(compareTasks), [tasks]);

  // งานบนสุดของลิสต์ = งานที่ควรทำก่อน (ลำดับล็อกแล้ว จึงเป็นตัวแรกเสมอ)
  const topTaskId = visibleTasks[0]?.id ?? null;

  // ป้ายเดือนปัจจุบันสำหรับการ์ดสรุปความคืบหน้า (ตัดตามเดือนแบบเดียวกับกล่อง "เสร็จแล้ว")
  const thisMonthLabel = new Date().toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  });

  // ข้อความให้กำลังใจของการ์ดสรุปความคืบหน้า - ไล่ตามสัดส่วนจริง ไม่ใช่ข้อความตายตัว
  // (เดิม "สู้ๆนะ ใกล้จะครบแล้ว!" ขึ้นเหมือนกันหมดไม่ว่าจะทำไป 1% หรือ 90% - ผิดตอนเพิ่งเริ่ม)
  const monthTotal = doneCountThisMonth + tasks.length;
  const monthPct = monthTotal > 0 ? Math.round((doneCountThisMonth / monthTotal) * 100) : 0;
  // ไม่มีงานค้างเลย = ควรฉลองเสมอ ไม่ว่าจะทำไปกี่ชิ้นเดือนนี้ก็ตาม
  // (เดิมต้องมี doneCountThisMonth > 0 ด้วย ทำให้ผู้ใช้ที่เพิ่งขึ้นเดือนใหม่และไม่มีงานค้างเลย
  //  ไม่ได้เห็นข้อความฉลองทั้งที่ไม่มีอะไรต้องทำแล้วจริงๆ)
  const allClear = tasks.length === 0;
  const progressMessage = allClear
    ? 'เคลียร์งานหมดแล้ว เก่งมาก! 🎉'
    : monthPct >= 70
      ? 'ใกล้จะครบแล้ว สู้อีกนิดเดียว!'
      : monthPct >= 30
        ? 'ไปได้สวย ทำต่อเลย!'
        : doneCountThisMonth === 0
          ? 'เริ่มต้นเดือนนี้กันเลย!'
          : 'เริ่มมาแล้ว ค่อยๆ ทำไปนะ';

  async function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const next = !task.done;
    const subtasks = task.subtasks ?? [];

    // ข้อ 4: งานที่มีขั้นตอนย่อย ต้องติ๊กย่อยครบทุกข้อก่อนถึงจะปิดงานได้
    // (ติ๊กออกยังทำได้ตลอด - ใช้ตอนเผลอกดผิด)
    if (next && subtasks.length > 0 && subtasks.some((sub) => !sub.done)) {
      setBlockedTaskId(id);
      setExpandedIds((prev) => new Set(prev).add(id)); // กางให้เห็นว่าเหลือข้อไหน
      return;
    }
    setBlockedTaskId(null);

    // งานที่เสร็จแล้วไม่ได้อยู่ใน tasks (state นี้เป็นงานที่ยังไม่เสร็จเท่านั้นตาม contract ของ
    // GET /api/tasks) จึง "เอาออกจากลิสต์" แทนการแก้ done ในที่เดิม ไม่งั้นจะเหลือรายการค้าง
    // ที่ done:true ปนอยู่ใน tasks ทำให้ตัวเลข tasks.length ในการ์ดสรุปเพี้ยน (นับซ้ำเป็นงานค้าง)
    if (next) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setDoneCount((n) => n + 1);
      setDoneCountThisMonth((n) => n + 1);
    } else {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: next } : t)));
    }
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: next }),
      });
      // เซิร์ฟเวอร์ปฏิเสธ (เช่นมีขั้นตอนย่อยเพิ่มมาจากอีกแท็บ) -> ย้อนสถานะกลับ
      if (!res.ok) {
        if (next) {
          setTasks((prev) => [{ ...task, done: false }, ...prev]);
          setDoneCount((n) => Math.max(0, n - 1));
          setDoneCountThisMonth((n) => Math.max(0, n - 1));
        } else {
          setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !next } : t)));
        }
        setBlockedTaskId(id);
      }
    } catch {
      // เน็ตหลุด: ถ้าไม่ย้อนกลับ งานจะดูเหมือนเสร็จแล้วทั้งที่ไม่ได้บันทึกอะไรเลย
      if (next) {
        setTasks((prev) => [{ ...task, done: false }, ...prev]);
        setDoneCount((n) => Math.max(0, n - 1));
        setDoneCountThisMonth((n) => Math.max(0, n - 1));
      } else {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !next } : t)));
      }
      setScheduleError('บันทึกไม่สำเร็จ (เชื่อมต่อไม่ได้) — สถานะถูกย้อนกลับแล้ว');
    }
  }

  function toggleSelected(taskId: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedTaskIds(new Set());
  }

  /** จัดเฉพาะงานที่ติ๊กเลือกไว้ */
  async function scheduleSelected() {
    if (selectedTaskIds.size === 0) return;
    await previewSchedule([...selectedTaskIds]);
    exitSelectMode();
  }

  /** บันทึกการแก้ไขงานจากกล่อง "แก้ไขงาน" */
  async function saveTaskEdit(taskId: string, patch: TaskEditPatch): Promise<string | null> {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ';
      // ใช้ค่าที่เซิร์ฟเวอร์ตอบกลับ แต่คง subtasks เดิมไว้ (PATCH ไม่ได้ส่ง subtasks กลับมา)
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...data.task, subtasks: t.subtasks } : t))
      );
      return null;
    } catch {
      return 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ';
    }
  }

  /** เลื่อนกำหนดส่งของงานที่เลยมาแล้วให้เป็นวันนี้ (ใช้ในการ์ดเตือนงานที่ถูกลืม) */
  async function postponeToToday(id: string) {
    const iso = todayISO();
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, dueDate: iso } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: iso }),
    });
  }

  // ลบงาน - รับ "งานทั้งชิ้น" เพราะต้องรู้ว่ามาจากลิสต์ที่ยังไม่เสร็จ (tasks) หรือมาจาก
  // กล่องงานที่เสร็จแล้ว (CompletedTasksModal ซึ่งเก็บ state แยกของตัวเอง) จะได้อัปเดตที่ถูกจุด
  async function deleteTaskConfirmed(task: Task) {
    if (task.done) {
      // มาจากกล่องงานที่เสร็จแล้ว: บอกให้กล่องนั้นโหลดเดือนที่ค้างอยู่ใหม่
      setDoneRefreshSignal((n) => n + 1);
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    }
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    if (task.done) {
      // งานที่ลบอาจเสร็จมาจากเดือนไหนก็ได้ (กล่องเลื่อนดูย้อนหลังได้) - ไม่เดาเองว่าจะลด
      // doneCountThisMonth ไหม เพราะไม่รู้ว่างานนั้นเสร็จเดือนนี้จริงหรือเปล่า ดึงเลขจริงจากเซิร์ฟเวอร์แทน
      const refreshed = await fetch('/api/tasks');
      const data = await refreshed.json().catch(() => null);
      if (typeof data?.doneCount === 'number') setDoneCount(data.doneCount);
      if (typeof data?.doneCountThisMonth === 'number') setDoneCountThisMonth(data.doneCountThisMonth);
    }
    // หน้าอื่นที่เรนเดอร์ฝั่งเซิร์ฟเวอร์ (แดชบอร์ด) ถูก Router Cache เก็บไว้ราว 30 วิ
    // ถ้าไม่สั่งรีเฟรช ผู้ใช้จะเห็นกิจกรรมของงานที่ลบไปแล้วค้างอยู่
    router.refresh();
  }

  /** เอากลับมาทำต่อ - เรียกจากกล่องงานที่เสร็จแล้ว (CompletedTasksModal) */
  async function restoreTask(task: Task) {
    setDoneCount((n) => Math.max(0, n - 1));
    setDoneRefreshSignal((n) => n + 1);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: false }),
    });
    if (!res.ok) return;
    // PATCH /api/tasks/[id] ไม่ส่ง subtasks กลับมา (serialize คนละชุดกับ GET) - ถ้าต่อออบเจ็กต์
    // ที่ตอบมาเข้า tasks ตรงๆ งานที่เพิ่งกู้กลับมาจะโชว์ 0 ขั้นตอนย่อยผิดๆ จนกว่าจะโหลดหน้าใหม่
    // โหลดลิสต์ทั้งชุดใหม่แทน ช้ากว่านิดหน่อยแต่ข้อมูลครบถูกต้องแน่นอน
    const refreshed = await fetch('/api/tasks');
    const data = await refreshed.json().catch(() => null);
    if (data?.tasks) setTasks(data.tasks);
    // เซิร์ฟเวอร์เป็นตัวเลขที่ถูกต้องจริง ใช้ทับค่าที่ลดไปเองไว้ก่อนหน้านี้ กัน drift
    // (ไม่แตะ doneCountThisMonth แบบ optimistic เลย เพราะงานที่กู้คืนอาจเสร็จมาจากเดือนไหนก็ได้
    // - รอเลขจริงจากที่นี่อย่างเดียวง่ายกว่าและถูกต้องกว่าการเดา)
    if (typeof data?.doneCount === 'number') setDoneCount(data.doneCount);
    if (typeof data?.doneCountThisMonth === 'number') setDoneCountThisMonth(data.doneCountThisMonth);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle('');
    const dueDate = newDueDate || undefined;
    // เวลาส่งไม่บังคับ และมีความหมายเฉพาะเมื่อมีวันกำหนดส่ง
    const dueTime = newDueDate && newDueTime ? newDueTime : undefined;
    // ข้อ 6: ไม่ได้แตะช่องวันที่เริ่ม = ใช้วันนี้ (วันที่กดเพิ่ม)
    const startDate = newStartDate || todayISO();
    const estimatedMinutes = newEstimatedMinutes ? Number(newEstimatedMinutes) : undefined;
    setNewDueDate('');
    setNewDueTime('');
    setNewStartDate(todayISO());
    setNewEstimatedMinutes('');
    setShowDetails(false);

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority: newPriority, dueDate, dueTime, startDate, estimatedMinutes }),
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

  /**
   * ย้ายงานออกจาก tasks (ลิสต์ที่ยังไม่เสร็จ) ไปนับเป็นเสร็จแล้ว
   * ใช้ทุกจุดที่ auto-complete ทำให้งานหลักปิดเอง (ติ๊ก/ลบขั้นตอนย่อยจนครบ)
   * ต้อง "เอาออกจาก tasks" ไม่ใช่แค่แก้ done ในที่เดิม เพราะ tasks ตาม contract ของ
   * GET /api/tasks ตอนนี้มีแต่งานที่ยังไม่เสร็จเท่านั้น ปล่อยรายการ done:true ค้างไว้
   * จะทำให้การ์ดสรุปความคืบหน้านับ tasks.length ผิด (นับงานที่เสร็จแล้วเป็นงานค้าง)
   */
  function markTaskCompletedLocally(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setDoneCount((n) => n + 1);
    setDoneCountThisMonth((n) => n + 1);
  }

  async function toggleSubtask(taskId: string, subtask: Subtask) {
    updateTaskSubtasks(taskId, (subtasks) =>
      subtasks.map((s) => (s.id === subtask.id ? { ...s, done: !s.done } : s))
    );
    setBlockedTaskId(null);
    try {
      const res = await fetch(`/api/subtasks/${subtask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !subtask.done }),
      });
      const data = await res.json().catch(() => ({}));
      // ติ๊กย่อยครบ = เซิร์ฟเวอร์ปิดงานหลักให้เอง -> ย้ายไปกลุ่ม "เสร็จแล้ว" ทันที
      if (data?.taskDone === true) {
        markTaskCompletedLocally(taskId);
      }
      // taskDone === false (เผลอติ๊กออกทีหลังจนงานที่ปิดไปแล้วต้องเปิดกลับ) แทบไม่เกิดขึ้นจริง
      // เพราะแถวของงานที่เสร็จแล้วไม่ถูกเรนเดอร์ในลิสต์นี้อยู่แล้ว (ปุ่มติ๊กขั้นตอนย่อยกดไม่ถึง)
      // ปล่อยเป็น no-op ปลอดภัยไว้ ถ้าเกิดจริงจะเห็นถูกต้องหลังโหลดหน้าใหม่
    } catch {
      // เน็ตหลุด -> ย้อนการติ๊กกลับ ไม่ให้เห็นว่าเสร็จทั้งที่ยังไม่ได้บันทึก
      updateTaskSubtasks(taskId, (subs) =>
        subs.map((x) => (x.id === subtask.id ? { ...x, done: subtask.done } : x))
      );
      setScheduleError('บันทึกไม่สำเร็จ (เชื่อมต่อไม่ได้) — สถานะถูกย้อนกลับแล้ว');
    }
  }

  /** ผู้ใช้ปรับวัน/เวลาของขั้นตอนย่อยที่เอ็ดดี้เสนอมา (ข้อ 2) */
  async function updateSubtaskPlan(taskId: string, subtaskId: string, plan: SubtaskPlanPatch) {
    updateTaskSubtasks(taskId, (subtasks) =>
      subtasks.map((s) =>
        s.id === subtaskId
          ? {
              ...s,
              plannedDate: plan.plannedDate ?? undefined,
              startTime: plan.startTime ?? undefined,
              endTime: plan.endTime ?? undefined,
            }
          : s
      )
    );
    const res = await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    // เซิร์ฟเวอร์ย้าย event ในปฏิทินให้แล้ว - เอาสถานะจริงกลับมาแสดง
    const data = await res.json().catch(() => ({}));
    if (data?.subtask) {
      updateTaskSubtasks(taskId, (subs) => subs.map((sub) => (sub.id === subtaskId ? data.subtask : sub)));
    }
  }

  async function deleteSubtask(taskId: string, subtaskId: string) {
    updateTaskSubtasks(taskId, (subtasks) => subtasks.filter((s) => s.id !== subtaskId));
    const res = await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    // ลบข้อที่ค้างออก อาจทำให้ที่เหลือครบพอดี -> งานหลักปิดเอง
    if (data?.taskDone === true) {
      markTaskCompletedLocally(taskId);
    }
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
    setBreakdownNotice((prev) => ({ ...prev, [taskId]: '' }));
    try {
      const res = await fetch(`/api/tasks/${taskId}/breakdown`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setBreakdownError((prev) => ({ ...prev, [taskId]: data.error ?? 'แตกงานไม่สำเร็จ ลองใหม่อีกครั้งนะ' }));
        return;
      }
      updateTaskSubtasks(taskId, (subtasks) => [...subtasks, ...data.subtasks]);
      // งานเพิ่งมีขั้นตอนย่อย -> ถือว่ายังไม่เสร็จจนกว่าจะติ๊กครบ (ข้อ 4)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: false } : t)));
      setExpandedIds((prev) => new Set(prev).add(taskId));
      if (data.message) setBreakdownNotice((prev) => ({ ...prev, [taskId]: data.message }));
    } catch {
      setBreakdownError((prev) => ({ ...prev, [taskId]: 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ' }));
    } finally {
      setBreakingDown((prev) => ({ ...prev, [taskId]: false }));
    }
  }


  // ---- จัดงานลงปฏิทินอัตโนมัติ (เฟส To-do AI) ----------------------------
  // ขั้นที่ 1: ขอ "ข้อเสนอ" จากเซิร์ฟเวอร์ก่อน (dryRun) ยังไม่บันทึกอะไร
  async function previewSchedule(taskIds?: string[]) {
    setPlanning(true);
    setPlanKind('all');
    setScheduleError('');
    setScheduleNotice('');
    try {
      // ส่ง taskIds เฉพาะตอนผู้ใช้เลือกเอง - ไม่ส่ง = ให้เอ็ดดี้เอางานค้างทั้งหมด
      const res = await fetch('/api/tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, ...(taskIds && taskIds.length > 0 ? { taskIds } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScheduleError(data.error ?? 'จัดงานลงปฏิทินไม่สำเร็จ ลองใหม่อีกครั้งนะ');
        return;
      }
      if ((data.scheduled ?? []).length === 0 && (data.skipped ?? []).length === 0) {
        setScheduleNotice(data.message ?? 'ไม่มีงานที่ต้องจัดลงปฏิทิน');
        return;
      }
      const proposals: SchedulePlanItem[] = data.scheduled ?? [];
      setPlan({ scheduled: proposals, skipped: data.skipped ?? [] });
      setSelectedPlanIds(new Set(proposals.map((p) => p.taskId)));
    } catch {
      setScheduleError('เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    } finally {
      setPlanning(false);
    }
  }

  function togglePlanItem(taskId: string) {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  // ขั้นที่ 2: ผู้ใช้กดยืนยัน -> บันทึกเฉพาะงานที่ติ๊กไว้ (สร้าง event ในปฏิทิน + ผูกกับงาน)
  async function confirmSchedule() {
    if (!plan || committingPlan) return;
    const chosen = plan.scheduled.filter((p) => selectedPlanIds.has(p.taskId));
    if (chosen.length === 0) return;
    setCommittingPlan(true);
    setScheduleError('');
    try {
      // ส่งเฉพาะงานที่เลือก - เซิร์ฟเวอร์จะจัดเวลาใหม่ให้เฉพาะชุดนี้ (งานที่เอาออกจะไม่กินช่องเวลา)
      const res = await fetch('/api/tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: chosen.map((p) => p.taskId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScheduleError(data.error ?? 'บันทึกลงปฏิทินไม่สำเร็จ ลองใหม่อีกครั้งนะ');
        return;
      }
      // ดึงงานใหม่ทั้งหมดเพื่อให้ป้ายเวลาที่จัดไว้ตรงกับที่บันทึกจริง
      const refreshed = await fetch('/api/tasks');
      const refreshedData = await refreshed.json();
      setTasks(refreshedData.tasks ?? []);
      const leftOut = plan.scheduled.length - chosen.length;
      setPlan(null);
      setSelectedPlanIds(new Set());
      setScheduleNotice(
        `จัดลงปฏิทินให้แล้ว ${(data.scheduled ?? []).length} งาน` +
          (leftOut > 0 ? ` · เว้นไว้ ${leftOut} งาน (กด "ให้ EDDY จัดลงปฏิทินให้" อีกครั้งได้ทีหลัง)` : '')
      );
    } catch {
      setScheduleError('เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    } finally {
      setCommittingPlan(false);
    }
  }

  /** กล่องเลือกเวลา: ขอให้เอ็ดดี้หาช่วงว่างมาเติมให้ (ยังไม่บันทึก) */
  async function autoFillSchedule(task: Task): Promise<ScheduleRow[] | null> {
    const subs = (task.subtasks ?? []).filter((sub) => !sub.done);
    try {
      // มีขั้นตอนย่อย -> หาเวลาให้ทีละขั้น (ใช้ได้แม้งานไม่มีกำหนดส่ง)
      if (subs.length > 0) {
        const res = await fetch(`/api/tasks/${task.id}/subtasks/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replan: true }),
        });
        const data = await res.json();
        if (!res.ok) return null;
        return (data.proposals ?? [])
          .filter((p: { plannedDate: string | null }) => p.plannedDate)
          .map((p: { subtaskId: string; title: string; plannedDate: string; startTime: string; endTime: string }) => ({
            subtaskId: p.subtaskId,
            title: p.title,
            date: p.plannedDate,
            startTime: p.startTime,
            endTime: p.endTime,
          }));
      }

      // ไม่มีขั้นตอนย่อย -> ขอข้อเสนอของงานหลัก
      const res = await fetch('/api/tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, taskIds: [task.id] }),
      });
      const data = await res.json();
      const first = (data.scheduled ?? [])[0];
      if (!res.ok || !first) return null;
      return [{ subtaskId: null, title: task.title, date: first.date, startTime: first.startTime, endTime: first.endTime }];
    } catch {
      return null;
    }
  }

  /** กล่องเลือกเวลา: ผู้ใช้กดยืนยัน -> บันทึกตามเวลาที่เลือกไว้จริง */
  async function commitSchedule(taskId: string, rows: ScheduleRow[]): Promise<string | null> {
    try {
      // แถวของขั้นตอนย่อย: PATCH ทีละข้อ (เซิร์ฟเวอร์จะสร้าง/ย้าย event ให้เอง)
      const subtaskRows = rows.filter((r) => r.subtaskId);
      for (const r of subtaskRows) {
        const res = await fetch(`/api/subtasks/${r.subtaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plannedDate: r.date, startTime: r.startTime, endTime: r.endTime }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          return d.error ?? 'บันทึกขั้นตอนย่อยไม่สำเร็จ';
        }
      }

      // แถวของงานหลัก: ส่งเวลาที่เลือกไปให้ /api/tasks/schedule ใช้ตรงๆ
      const taskRow = rows.find((r) => !r.subtaskId);
      if (taskRow) {
        const res = await fetch('/api/tasks/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskIds: [taskId],
            at: { date: taskRow.date, startTime: taskRow.startTime, endTime: taskRow.endTime },
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) return d.error ?? 'ลงปฏิทินไม่สำเร็จ';
        // เส้นนี้ตอบ 200 พร้อม scheduled ว่าง ได้ด้วย (เช่นงานถูกลงปฏิทินไปแล้วจากอีกแท็บ)
        // ถ้าไม่เช็ค จะขึ้นว่าสำเร็จแล้วปิดกล่องทั้งที่ไม่มีอะไรถูกบันทึก
        if ((d.scheduled ?? []).length === 0) {
          return (d.skipped ?? [])[0]?.reason ?? 'ลงปฏิทินไม่สำเร็จ — งานนี้อาจถูกจัดไปแล้ว ลองรีเฟรชหน้าดูนะ';
        }
      }

      // ดึงข้อมูลใหม่ให้ป้ายเวลาตรงกับที่บันทึกจริง
      const refreshed = await fetch('/api/tasks');
      setTasks((await refreshed.json()).tasks ?? []);
      setScheduleNotice(
        subtaskRows.length > 0 ? `ลงปฏิทินให้ ${subtaskRows.length} ขั้นตอนแล้ว` : 'ลงปฏิทินให้แล้ว'
      );
      return null;
    } catch {
      return 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ';
    }
  }

  /** เอาขั้นตอนย่อยทั้งหมดออกจากปฏิทิน */
  async function unscheduleSubtasks(taskId: string) {
    updateTaskSubtasks(taskId, (subs) => subs.map((sub) => ({ ...sub, onCalendar: false })));
    const res = await fetch(`/api/tasks/${taskId}/subtasks/schedule`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (data?.message) setScheduleNotice(data.message);
  }

  // เอางานออกจากปฏิทิน (ลบ event ที่เอ็ดดี้สร้างไว้)
  async function unscheduleTask(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, scheduled: undefined } : t)));
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unschedule: true }),
    });
  }

  // ---- ข้อ 4: งานที่เลยกำหนดส่งแล้วยังไม่ถูกติ๊ก ----
  // เงื่อนไขตาม requirement: "ไม่มีข้อย่อย + มีเดดไลน์ + เลยเดดไลน์ + ยังไม่ติ๊ก"
  // เตือนผู้ใช้ก่อน (การ์ดด้านบน) แล้วค่อยติดป้าย "งานที่ถูกลืม" ให้รายการนั้น
  const today = todayISO();
  const forgottenTasks = useMemo(
    () =>
      tasks.filter(
        (t) => !t.done && (t.subtasks?.length ?? 0) === 0 && t.dueDate !== undefined && t.dueDate < today
      ),
    [tasks, today]
  );
  const forgottenIds = useMemo(() => new Set(forgottenTasks.map((t) => t.id)), [forgottenTasks]);
  // งานที่เลยกำหนดส่งแล้วและยังไม่เสร็จ (รวมงานที่มีขั้นตอนย่อยด้วย ต่างจาก forgottenTasks)
  const overdueIds = useMemo(
    () => new Set(tasks.filter((t) => !t.done && t.dueDate !== undefined && t.dueDate < today).map((t) => t.id)),
    [tasks, today]
  );

  return (
    <div className="px-4 md:px-10">
      <Topbar userName={userName} />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-h3 text-ink">สิ่งที่ต้องทำ</h2>
              {/* บอกกติกาการเรียงไว้ตรงๆ เพราะไม่มีปุ่มสลับให้กดแล้ว */}
              <p className="mt-0.5 font-body text-[11px] text-ink-muted">
                {selectMode
                  ? `ติ๊กงานที่อยากให้เอ็ดดี้หาเวลาว่างให้ · เลือกแล้ว ${selectedTaskIds.size} งาน`
                  : 'เรียงตามกำหนดส่งก่อน แล้วจึงตามความสำคัญ'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectMode ? (
                <>
                  <button
                    onClick={scheduleSelected}
                    disabled={planning || selectedTaskIds.size === 0}
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    <CalendarClock size={14} />
                    {planning ? 'กำลังหาเวลาว่าง...' : `ให้ EDDY จัดให้ (${selectedTaskIds.size})`}
                  </button>
                  <button
                    onClick={() =>
                      setSelectedTaskIds(
                        selectedTaskIds.size === visibleTasks.length
                          ? new Set()
                          : new Set(visibleTasks.map((t) => t.id))
                      )
                    }
                    className="rounded-full bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted transition-all hover:bg-eddy-100"
                  >
                    {selectedTaskIds.size === visibleTasks.length ? 'ล้างการเลือก' : 'เลือกทั้งหมด'}
                  </button>
                  <button
                    onClick={exitSelectMode}
                    className="rounded-full bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted transition-all hover:bg-eddy-100"
                  >
                    ยกเลิก
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => previewSchedule()}
                    disabled={planning || visibleTasks.length === 0}
                    title="เอ็ดดี้จะดูช่องว่างจริงในปฏิทิน แล้วเสนอเวลาให้ก่อน ยังไม่บันทึกจนกว่าจะกดยืนยัน"
                    className="flex items-center gap-1.5 rounded-full bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted transition-all hover:bg-eddy-100 disabled:opacity-50"
                  >
                    <CalendarClock size={14} /> {planning ? 'กำลังหาเวลาว่าง...' : 'ให้ EDDY จัดลงปฏิทินให้'}
                  </button>
                  <button
                    onClick={() => setSelectMode(true)}
                    disabled={visibleTasks.length === 0}
                    title="ติ๊กเลือกเองว่าจะให้เอ็ดดี้จัดงานไหนบ้าง"
                    className="flex items-center gap-1.5 rounded-full bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted transition-all hover:bg-eddy-100 disabled:opacity-50"
                  >
                    <ListChecks size={14} /> เลือกงานเอง
                  </button>
                  <button
                    onClick={() => setShowDone(true)}
                    disabled={doneCount === 0}
                    className="flex items-center gap-1.5 rounded-full bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted transition-all hover:bg-eddy-100 disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> เสร็จแล้ว
                    {doneCount > 0 && (
                      <span className="rounded-full bg-eddy-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {doneCount}
                      </span>
                    )}
                  </button>
                </>
              )}
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
                className="flex items-center justify-center gap-1 rounded-clay-sm bg-gradient-to-r from-eddy-500 to-accent-500 px-6 py-3 font-display text-body font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <Plus size={16} /> เพิ่ม
              </button>
            </div>

            {showDetails ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <label className="mb-1 block font-body text-xs text-ink-muted" htmlFor="new-start-date">
                    วันที่เริ่ม
                  </label>
                  <input
                    id="new-start-date"
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full rounded-clay-sm bg-eddy-50 px-3 py-2 font-body text-sm text-ink shadow-clay-inset focus:outline-none"
                  />
                  <p className="mt-1 font-body text-[11px] text-ink-muted">ค่าเริ่มต้นคือวันนี้ — เอ็ดดี้ใช้เป็นวันเริ่มกระจายขั้นตอนย่อย</p>
                </div>
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
                  {/* เวลาส่งใส่ได้เฉพาะเมื่อมีวันกำหนดส่ง ไม่ใส่ = หมุดขึ้นเป็นกิจกรรมทั้งวัน */}
                  <div className="mt-2">
                    <label className="mb-1 block font-body text-xs text-ink-muted" htmlFor="new-due-time">
                      เวลาส่ง (ไม่บังคับ)
                    </label>
                    <input
                      id="new-due-time"
                      type="time"
                      value={newDueTime}
                      onChange={(e) => setNewDueTime(e.target.value)}
                      disabled={!newDueDate}
                      className="w-full rounded-clay-sm bg-eddy-50 px-3 py-2 font-body text-sm text-ink shadow-clay-inset focus:outline-none disabled:opacity-40"
                    />
                    <p className="mt-1 font-body text-[11px] text-ink-muted">
                      {newDueDate ? 'ไม่ใส่ = ขึ้นปฏิทินเป็นกิจกรรมทั้งวัน' : 'ใส่วันกำหนดส่งก่อน'}
                    </p>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block font-body text-xs text-ink-muted" htmlFor="new-estimated-minutes">
                    เวลาโดยประมาณ (นาที)
                  </label>
                  <input
                    id="new-estimated-minutes"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={5}
                    value={newEstimatedMinutes}
                    onChange={(e) => setNewEstimatedMinutes(e.target.value)}
                    placeholder="เช่น 60"
                    className="w-full rounded-clay-sm bg-eddy-50 px-3 py-2 font-body text-sm text-ink shadow-clay-inset focus:outline-none"
                  />
                  <p className="mt-1 font-body text-[11px] text-ink-muted">ไม่บังคับ - ใช้คำนวณตอนเอ็ดดี้จัดงานลงปฏิทินให้</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="self-start font-body text-xs font-semibold text-eddy-600 hover:underline"
              >
                + เพิ่มรายละเอียด (วันที่เริ่ม / กำหนดส่ง / เวลาส่ง / เวลาโดยประมาณ)
              </button>
            )}
          </form>

          {/* ผลการจัดงานลงปฏิทิน: ข้อความสั้นๆ / ข้อผิดพลาด */}
          {scheduleNotice && (
            <p className="mt-3 rounded-clay-sm bg-pastel-mint/60 px-4 py-2 font-body text-xs text-ink dark:bg-pastel-mint-dark/20 dark:text-pastel-mint-dark">{scheduleNotice}</p>
          )}
          {scheduleError && (
            <p className="mt-3 rounded-clay-sm bg-pastel-pink/60 px-4 py-2 font-body text-xs text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">{scheduleError}</p>
          )}

          {/* ข้อ 4: เตือนก่อนว่ามีงานเลยกำหนดส่งแล้วยังไม่ถูกติ๊ก - ถ้าปล่อยไว้จะถือเป็น "งานที่ถูกลืม" */}
          {forgottenTasks.length > 0 && !forgottenAcked && (
            <div className="mt-4 rounded-clay-sm border border-pastel-peach bg-pastel-peach/40 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-eddy-700" />
                <div className="flex-1">
                  <p className="font-display text-body font-semibold text-ink">
                    มี {forgottenTasks.length} งานที่เลยกำหนดแล้วแต่ยังไม่ได้ติ๊กว่าเสร็จ
                  </p>
                  <p className="mt-0.5 font-body text-xs text-ink-soft">
                    ถ้ายังไม่ได้ทำจริงๆ เอ็ดดี้จะทำเครื่องหมายให้เป็น &ldquo;งานที่ถูกลืม&rdquo; — หรือจะเลื่อนกำหนดส่งมาเป็นวันนี้ก็ได้
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {forgottenTasks.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-body text-sm text-ink">{t.title}</span>
                        <span className="font-body text-[11px] font-semibold text-eddy-700">
                          เลยกำหนดแล้ว {daysOverdue(t.dueDate!)} วัน
                        </span>
                        <button
                          type="button"
                          onClick={() => postponeToToday(t.id)}
                          className="rounded-full bg-surface px-2.5 py-1 font-display text-[11px] font-semibold text-eddy-700 hover:bg-eddy-50"
                        >
                          เลื่อนเป็นวันนี้
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleTask(t.id)}
                          className="rounded-full bg-eddy-500 px-2.5 py-1 font-display text-[11px] font-semibold text-white hover:brightness-110"
                        >
                          ทำเสร็จแล้ว
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setForgottenAcked(true)}
                    className="mt-2 font-body text-[11px] font-semibold text-ink-muted hover:underline"
                  >
                    รับทราบ — ปล่อยเป็นงานที่ถูกลืมไว้ก่อน
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ตัวอย่างตารางที่เอ็ดดี้เสนอ - ต้องกดยืนยันก่อนถึงจะลงปฏิทินจริง */}
          {plan && (
            <div className="mt-4 rounded-clay-sm border border-eddy-200 bg-surface p-4">
              <div className="flex items-start gap-2">
                <EddyMascot character="nova" mood="think" size={32} float={false} />
                <div className="flex-1">
                  <p className="font-display text-body font-semibold text-ink">
                    {planKind === 'undated'
                      ? 'เอ็ดดี้เห็นว่าคุณพอมีเวลาว่างนะ'
                      : 'เอ็ดดี้หาช่องว่างในปฏิทินให้แล้ว'}
                  </p>
                  <p className="font-body text-xs text-ink-muted">
                    {planKind === 'undated'
                      ? 'งานพวกนี้ยังไม่ได้กำหนดวัน — ถ้าอยากเคลียร์ให้จบ นี่คือช่วงเวลาที่พอจะแทรกได้'
                      : 'เลือกได้ว่าจะเอางานไหนลงปฏิทินบ้าง — ติ๊กออกงานที่ยังไม่อยากจัดได้เลย'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPlan(null)}
                  aria-label="ปิดข้อเสนอ"
                  className="flex-shrink-0 text-ink-muted hover:text-eddy-600"
                >
                  <X size={16} />
                </button>
              </div>

              {plan.scheduled.length > 0 && (
                <>
                  {/* อธิบายกติกาสั้นๆ ตรงจุดที่ผู้ใช้เห็นผลลัพธ์ จะได้เข้าใจว่าทำไมได้วันนี้ */}
                  <p className="mt-2 rounded-clay-sm bg-eddy-50 px-3 py-2 font-body text-[11px] text-ink-soft">
                    เอ็ดดี้ดูปฏิทินจริงของคุณ (กิจกรรม + Loop ชีวิต) แล้วเลี่ยงช่วงที่ไม่ว่าง ·
                    งานที่<b className="font-semibold text-ink">มีกำหนดส่ง</b>จะลงในวันกำหนดส่ง ·
                    งานที่<b className="font-semibold text-ink">ไม่มีกำหนดส่ง</b>จะลงช่องว่างที่ใกล้ที่สุด ·
                    เรียงคิวตามลำดับเดียวกับในลิสต์
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="font-body text-xs text-ink-soft">
                      เลือกไว้ {selectedPlanIds.size} จาก {plan.scheduled.length} งาน
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPlanIds(
                          selectedPlanIds.size === plan.scheduled.length
                            ? new Set()
                            : new Set(plan.scheduled.map((p) => p.taskId))
                        )
                      }
                      className="font-body text-xs font-semibold text-eddy-600 hover:underline"
                    >
                      {selectedPlanIds.size === plan.scheduled.length ? 'ล้างการเลือก' : 'เลือกทั้งหมด'}
                    </button>
                  </div>
                  <ul className="mt-2 flex flex-col gap-2">
                    {plan.scheduled.map((item) => {
                      const checked = selectedPlanIds.has(item.taskId);
                      return (
                        <li
                          key={item.taskId}
                          className={clsx(
                            'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-clay-sm px-3 py-2 transition-colors',
                            checked ? 'bg-eddy-50' : 'bg-eddy-50/40'
                          )}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`เลือกจัด "${item.title}" ลงปฏิทิน`}
                            onClick={() => togglePlanItem(item.taskId)}
                            className={clsx(
                              'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                              checked ? 'border-eddy-500 bg-eddy-500 text-white' : 'border-eddy-300 bg-surface'
                            )}
                          >
                            {checked && <Check size={12} strokeWidth={3} />}
                          </button>
                          <span
                            className={clsx(
                              'min-w-0 flex-1 truncate font-body text-sm',
                              checked ? 'text-ink' : 'text-ink-muted line-through'
                            )}
                          >
                            {item.title}
                          </span>
                          <span
                            className={clsx(
                              'flex items-center gap-1 font-display text-xs font-semibold',
                              checked ? 'text-eddy-700' : 'text-ink-muted'
                            )}
                          >
                            <CalendarClock size={12} />
                            {formatThaiDay(item.date)} {item.startTime}-{item.endTime}
                          </span>
                          <span className="font-body text-[11px] text-ink-muted">
                            {item.durationMin} นาที{item.dueDate ? ` · ส่ง ${formatThaiDay(item.dueDate)}` : ''}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {selectedPlanIds.size > 0 && selectedPlanIds.size < plan.scheduled.length && (
                    <p className="mt-2 font-body text-[11px] text-ink-muted">
                      เอางานออกแล้วช่องเวลาจะว่างขึ้น — เอ็ดดี้จะจัดเวลาใหม่ให้เฉพาะงานที่เลือกตอนกดยืนยัน
                    </p>
                  )}
                </>
              )}

              {plan.skipped.length > 0 && (
                <div className="mt-3 rounded-clay-sm bg-pastel-peach/50 px-3 py-2">
                  <p className="font-display text-xs font-semibold text-ink">ยังจัดให้ไม่ได้ {plan.skipped.length} งาน</p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {plan.skipped.map((item) => (
                      <li key={item.taskId} className="font-body text-[11px] text-ink-soft">
                        {item.title} — {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.scheduled.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={confirmSchedule}
                    disabled={committingPlan || selectedPlanIds.size === 0}
                    className="flex items-center gap-1 rounded-clay-sm bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 disabled:opacity-60"
                  >
                    <CalendarClock size={14} />{' '}
                    {committingPlan ? 'กำลังบันทึก...' : `ยืนยันลงปฏิทิน (${selectedPlanIds.size})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlan(null)}
                    className="rounded-clay-sm bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted hover:bg-eddy-100"
                  >
                    ไว้ก่อน
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Task list */}
          <div className="mt-5 flex flex-col gap-3">
            {visibleTasks.length === 0 && (
              <EmptyState
                mood={doneCount > 0 ? 'celebrate' : 'happy'}
                title={doneCount > 0 && tasks.length === 0 ? 'เคลียร์งานหมดแล้ว เก่งมาก!' : 'ยังไม่มีสิ่งที่ต้องทำ — เพิ่มงานแรกได้เลย'}
              />
            )}
            {visibleTasks.map((task) => {
              const priority = priorityOptions.find((p) => p.value === task.priority)!;
              const subtasks = task.subtasks ?? [];
              const subDone = subtasks.filter((s) => s.done).length;
              // ขั้นตอนที่กำลังทำอยู่ = งานย่อยที่ยังไม่เสร็จตัวแรก (เรียงตามลำดับที่ผู้ใช้จัดไว้)
              const currentStepIndex = subtasks.findIndex((sub) => !sub.done);
              const currentStep = currentStepIndex >= 0 ? subtasks[currentStepIndex] : null;
              const expanded = expandedIds.has(task.id);
              const isTopTask = !task.done && task.id === topTaskId;
              // ข้อ 4: มีขั้นตอนย่อยแต่ยังติ๊กไม่ครบ = ปิดงานยังไม่ได้
              const lockedBySubtasks = !task.done && subtasks.length > 0 && subDone < subtasks.length;
              const isForgotten = forgottenIds.has(task.id);
              const isOverdue = overdueIds.has(task.id);
              // ขั้นตอนย่อยที่ยังไม่เสร็จ = ตัวที่ต้องลงปฏิทิน
              const openSubs = subtasks.filter((sub) => !sub.done);
              const hasSubtasks = openSubs.length > 0;
              // ลงปฏิทินครบแล้วหรือยัง (งานมีขั้นตอน = ดูจากขั้นตอน, ไม่มี = ดูจาก event ของงานหลัก)
              const fullyScheduled = hasSubtasks
                ? openSubs.every((sub) => sub.onCalendar)
                : !!task.scheduled;
              const isSelected = selectedTaskIds.has(task.id);
              return (
                <div
                  key={task.id}
                  className={clsx(
                    'rounded-clay-sm px-4 py-3 transition-colors',
                    selectMode && isSelected ? 'bg-eddy-100 ring-2 ring-eddy-300' : 'bg-eddy-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(task.id)}
                      aria-label={
                        expanded
                          ? 'ย่อรายการย่อย'
                          : subtasks.length > 0
                            ? `ดูขั้นตอนย่อย ${subtasks.length} ข้อ`
                            : 'เพิ่มขั้นตอนย่อยเอง'
                      }
                      className="flex-shrink-0 text-ink-muted hover:text-eddy-600"
                    >
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {/* โหมดเลือกงาน: ช่องติ๊กแยกจากปุ่ม "ทำเสร็จแล้ว" ชัดเจน ไม่ให้กดสลับกัน */}
                    {selectMode && (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-label={`เลือก "${task.title}" ให้เอ็ดดี้จัดลงปฏิทิน`}
                        onClick={() => toggleSelected(task.id)}
                        className={clsx(
                          'grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border-2 transition-colors',
                          isSelected ? 'border-eddy-500 bg-eddy-500 text-white' : 'border-eddy-300 bg-surface'
                        )}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </button>
                    )}
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label={
                        lockedBySubtasks ? `ต้องติ๊กขั้นตอนย่อยให้ครบก่อน (เหลือ ${subtasks.length - subDone} ข้อ)` : 'ติ๊กว่าทำเสร็จแล้ว'
                      }
                      title={lockedBySubtasks ? 'ต้องติ๊กขั้นตอนย่อยให้ครบก่อน' : undefined}
                      className={clsx(
                        'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        task.done
                          ? 'border-eddy-500 bg-eddy-500'
                          : lockedBySubtasks
                            ? 'border-eddy-200 bg-eddy-50 text-eddy-400'
                            : 'border-eddy-300 bg-surface'
                      )}
                    >
                      {lockedBySubtasks && <Lock size={11} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isTopTask && (
                          <span className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-pastel-peach px-2 py-0.5 font-display text-[10px] font-bold text-chip-ink">
                            <Flame size={11} /> ควรทำก่อน
                          </span>
                        )}
                        {isOverdue && (
                          <span className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-pastel-pink px-2 py-0.5 font-display text-[10px] font-bold text-chip-ink">
                            <AlertTriangle size={11} /> เลยกำหนดแล้ว
                          </span>
                        )}
                        {isForgotten && forgottenAcked && (
                          <span className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-eddy-100 px-2 py-0.5 font-display text-[10px] font-bold text-ink-muted">
                            งานที่ถูกลืม
                          </span>
                        )}
                        <p className={clsx('truncate font-body text-body', task.done ? 'text-ink-muted line-through' : 'text-ink')}>
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
                        {task.startDate && <span>เริ่ม {formatThaiDay(task.startDate)}</span>}
                        {task.dueDate && (
                          <span className={clsx(isOverdue && 'font-semibold text-eddy-700')}>
                            กำหนดส่ง {formatThaiDay(task.dueDate)}
                            {task.dueTime ? ` ${task.dueTime} น.` : ''}
                            {isOverdue && ` · เลยมา ${daysOverdue(task.dueDate)} วัน`}
                          </span>
                        )}
                        {task.scheduled && (
                          <span className="flex items-center gap-1 rounded-full bg-pastel-lilac px-2 py-0.5 font-display text-[10px] font-semibold text-chip-ink">
                            <CalendarClock size={10} />
                            {formatThaiDay(task.scheduled.date)}
                            {task.scheduled.startTime ? ` ${task.scheduled.startTime}` : ''}
                            {task.scheduled.endTime ? `-${task.scheduled.endTime}` : ''}
                            <button
                              type="button"
                              onClick={() => unscheduleTask(task.id)}
                              aria-label="เอาออกจากปฏิทิน"
                              className="ml-0.5 text-eddy-700/70 hover:text-eddy-700"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        )}
                      </div>
                      {subtasks.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-surface">
                            <div
                              className="h-full rounded-full bg-eddy-400 transition-all"
                              style={{ width: `${(subDone / subtasks.length) * 100}%` }}
                            />
                          </div>
                          {/* งานที่ลงปฏิทินแล้ว: บอกด้วยว่าตอนนี้เดินมาถึงขั้นตอนย่อยไหน */}
                          {task.scheduled &&
                            (currentStep ? (
                              <span className="flex min-w-0 items-center gap-1 font-body text-[11px] text-ink-soft">
                                <ListChecks size={11} className="flex-shrink-0 text-eddy-500" />
                                <span className="flex-shrink-0 font-semibold text-eddy-700">
                                  ขั้นที่ {currentStepIndex + 1}/{subtasks.length}
                                </span>
                                <span className="truncate">{currentStep.title}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-body text-[11px] font-semibold text-eddy-700">
                                <ListChecks size={11} className="flex-shrink-0 text-eddy-500" />
                                ทำครบทุกขั้นแล้ว
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                    {/* ป้ายความสำคัญ: จุดสีเล็กๆ พอ ไม่ต้องเป็นชิปใหญ่แย่งสายตาจากชื่องาน */}
                    <span
                      title={`ความสำคัญ: ${priority.label}`}
                      className={clsx(
                        'hidden flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-semibold sm:flex',
                        priority.chipClass
                      )}
                    >
                      {priority.label}
                    </span>

                    {/* ทุกการกระทำอยู่นอกเมนูหมด กดทีเดียวถึง
                        ปุ่มลบมีเส้นคั่นกับกลุ่มอื่นและ hover เป็นสีเตือน */}
                    <div className="flex flex-shrink-0 items-center gap-0.5 rounded-full border border-eddy-100 bg-surface/80 p-0.5">
                      <RowAction
                        icon={Pencil}
                        label="แก้ไขงาน (ชื่อ · ความสำคัญ · วันที่)"
                        onClick={() => setEditTaskId(task.id)}
                      />
                      <RowAction
                        icon={Wand2}
                        label={
                          breakingDown[task.id]
                            ? 'กำลังแยกงาน...'
                            : subtasks.length > 0
                              ? 'ให้เอ็ดดี้แตกขั้นตอนเพิ่ม'
                              : 'ให้เอ็ดดี้แยกงานเป็นขั้นตอนย่อย'
                        }
                        busy={breakingDown[task.id]}
                        disabled={breakingDown[task.id]}
                        onClick={() => breakdownTaskForId(task.id)}
                      />
                      <RowAction
                        icon={CalendarClock}
                        label={
                          fullyScheduled
                            ? 'อยู่ในปฏิทินแล้ว — กดเพื่อเอาออก'
                            : hasSubtasks
                              ? `เลือกเวลาลงปฏิทินให้ ${openSubs.length} ขั้นตอน`
                              : 'เลือกวัน-เวลาลงปฏิทิน'
                        }
                        active={fullyScheduled}
                        disabled={planning}
                        onClick={() =>
                          fullyScheduled
                            ? hasSubtasks
                              ? unscheduleSubtasks(task.id)
                              : unscheduleTask(task.id)
                            : setScheduleTaskId(task.id)
                        }
                      />
                      <span className="mx-0.5 h-4 w-px bg-eddy-100" />
                      <RowAction
                        icon={Trash2}
                        label={`ลบงาน "${task.title}"`}
                        tone="danger"
                        onClick={() => setDeleteTarget(task)}
                      />
                    </div>
                  </div>

                  {/* ข้อ 4: บอกเหตุผลตรงจุดที่ผู้ใช้กด ว่าทำไมยังปิดงานไม่ได้ */}
                  {blockedTaskId === task.id && lockedBySubtasks && (
                    <p className="ml-9 mt-2 flex items-center gap-1.5 rounded-clay-sm bg-pastel-yellow/60 px-3 py-1.5 font-body text-[11px] text-ink dark:bg-pastel-yellow-dark/20 dark:text-pastel-yellow-dark">
                      <Lock size={11} className="flex-shrink-0" />
                      ยังเหลือขั้นตอนย่อยอีก {subtasks.length - subDone} ข้อ — ติ๊กให้ครบก่อนงานนี้ถึงจะย้ายไป &ldquo;เสร็จแล้ว&rdquo;
                    </p>
                  )}
                  {breakdownNotice[task.id] && (
                    <p className="ml-9 mt-2 rounded-clay-sm bg-pastel-mint/50 px-3 py-1.5 font-body text-[11px] text-ink dark:bg-pastel-mint-dark/20 dark:text-pastel-mint-dark">
                      {breakdownNotice[task.id]}
                    </p>
                  )}
                  {breakdownError[task.id] && subtasks.length > 0 && (
                    <p className="ml-9 mt-2 rounded-clay-sm bg-pastel-pink/60 px-3 py-1.5 font-body text-[11px] text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">
                      {breakdownError[task.id]}
                    </p>
                  )}

                  {expanded && (
                    <div className="ml-9 mt-3 flex flex-col gap-2 border-l-2 border-eddy-100 pl-4">
                      {subtasks.length > 0 && (
                        <SortableSubtaskList
                          subtasks={subtasks}
                          onToggle={(s) => toggleSubtask(task.id, s)}
                          onDelete={(subtaskId) => deleteSubtask(task.id, subtaskId)}
                          onReorder={(orderedIds) => reorderSubtasks(task.id, orderedIds)}
                          onPlanChange={(subtaskId, plan) => updateSubtaskPlan(task.id, subtaskId, plan)}
                        />
                      )}

                      {subtasks.length === 0 && (
                        <div className="flex items-center gap-2 rounded-clay-sm bg-pastel-mint/50 px-3 py-2">
                          <EddyMascot mood="think" size={28} float={false} />
                          <p className="flex-1 font-body text-xs text-ink">
                            ยังไม่มีขั้นตอนย่อย — กดปุ่มไม้กายสิทธิ์ที่แถวด้านบน แล้วเอ็ดดี้จะซอยขั้นตอนให้
                            {task.dueDate ? ' พร้อมกระจายวันให้ถึงกำหนดส่ง' : ''}
                          </p>
                        </div>
                      )}
                      {breakdownError[task.id] && subtasks.length === 0 && (
                        <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-1.5 font-body text-[11px] text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">
                          {breakdownError[task.id]}
                        </p>
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
                          className="flex-1 rounded-clay-sm bg-surface px-3 py-1.5 font-body text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-eddy-300"
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
          {/*
            การ์ดนี้ตัดตามเดือนเหมือนกล่อง "เสร็จแล้ว" ทุกประการ:
              - ตัวเศษ (doneCountThisMonth) มาจาก Task.completedAt ที่อยู่ในเดือนปัจจุบันเท่านั้น
              - พอขึ้นเดือนใหม่ ตัวเลขนี้จะรีเซ็ตเองตามที่เซิร์ฟเวอร์คำนวณให้ (ไม่ต้องเดา/ล้างเองฝั่ง client)
              - ตัวส่วนใช้ tasks.length (งานค้างปัจจุบัน) เพราะงานที่ยังไม่เสร็จไม่มีแนวคิด "เดือน" ผูกอยู่
          */}
          <EddyMascot mood={allClear ? 'celebrate' : 'happy'} size={88} />
          {/* แยกป้ายเดือนเป็นบรรทัดเล็กด้านบน (สไตล์เดียวกับป้าย "โฟกัสวันนี้" ในแดชบอร์ด)
              ไม่ยัดชื่อเดือนกับตัวเลขไว้ประโยคเดียวกันเหมือนเดิม อ่านง่ายขึ้นเยอะ */}
          <p className="mt-3 font-body text-caption font-semibold uppercase tracking-[0.06em] text-eddy-600">
            {thisMonthLabel}
          </p>
          <p className="mt-1 font-display text-h3 text-ink">
            ทำเสร็จแล้ว {doneCountThisMonth} จาก {monthTotal} งาน
          </p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-eddy-50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 transition-all"
              style={{ width: `${monthPct}%` }}
            />
          </div>
          <p className="mt-3 font-body text-sm text-ink-muted">{progressMessage}</p>
        </Card>
      </section>

      {/* งานที่เสร็จแล้วถูกย้ายออกจากลิสต์หลักมาอยู่ที่นี่ - ดูทีละเดือน กู้คืน/ลบได้ */}
      <CompletedTasksModal
        open={showDone}
        onClose={() => setShowDone(false)}
        refreshSignal={doneRefreshSignal}
        onRestore={restoreTask}
        onRequestDelete={setDeleteTarget}
      />

      {/* กล่องเลือกวัน-เวลาก่อนลงปฏิทิน (ใช้ได้ทั้งงานเดี่ยวและงานที่มีขั้นตอนย่อย) */}
      <ScheduleTaskModal
        open={scheduleTaskId !== null}
        task={tasks.find((t) => t.id === scheduleTaskId) ?? null}
        onClose={() => setScheduleTaskId(null)}
        onAutoFill={autoFillSchedule}
        onConfirm={(rows) => commitSchedule(scheduleTaskId!, rows)}
      />

      {/* กล่องแก้ไขงาน */}
      <EditTaskModal
        open={editTaskId !== null}
        task={tasks.find((t) => t.id === editTaskId) ?? null}
        onClose={() => setEditTaskId(null)}
        onSave={saveTaskEdit}
      />

      {/* กล่องยืนยันก่อนลบ - วางท้ายสุดเพื่อให้ซ้อนอยู่เหนือป๊อปอัปงานที่เสร็จแล้ว
          รับ "งานทั้งชิ้น" ตรงๆ (deleteTarget) แทนการ find จาก tasks เพราะงานที่เสร็จแล้ว
          ไม่ได้อยู่ใน tasks อีกต่อไป (แยกไปอยู่ใน CompletedTasksModal) จะ find ไม่เจอ */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="ลบงานนี้?"
        message={`"${deleteTarget?.title ?? ''}" จะถูกลบถาวร เอากลับไม่ได้`}
        details={deleteImpact(deleteTarget ?? undefined)}
        confirmLabel="ลบเลย"
        onConfirm={() => deleteTaskConfirmed(deleteTarget!)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
