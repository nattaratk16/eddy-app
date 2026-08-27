'use client';

/**
 * แท็บ "งานกลุ่ม"
 * หัวกลุ่ม + แท็บ อยู่ใน layout.tsx แล้ว หน้านี้ดูแลแค่เนื้อหา
 *
 * จัดใหม่จากเดิมที่เป็นรายการยาวเรียงต่อกันหมด:
 *   - แยกงานเป็น 3 กลุ่มตามสถานะ (รอคุณยืนยัน / ยังไม่ได้มอบหมาย / มอบหมายแล้ว)
 *     เพราะสิ่งที่ต้องลงมือทำจริงๆ คือสองกลุ่มแรก
 *   - ฟอร์มเพิ่มงานย้ายไปอยู่ในปุ่ม "เพิ่มงาน" (เดิมกางค้างไว้กินพื้นที่ตลอด)
 *   - ภาระงานสมาชิกอยู่คอลัมน์ขวา เห็นได้ตลอดโดยไม่ต้องกดจัดตารางก่อน
 */
import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Check, Clock, Plus, Sparkles, Trash2, UserCheck, X } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Reveal from '@/components/motion/Reveal';
import WorkloadPanel, { type WorkloadRow } from '@/components/groups/WorkloadPanel';
import { notifyGroupUpdated } from '@/lib/groupEvents';
import type { GroupTaskInfo } from '@/lib/types';

// คุมความสูงทุกช่องให้เท่ากัน (h-11) เพื่อให้ input/select/date อยู่ในแนวเดียวกันเป๊ะ
const fieldClass =
  'h-11 w-full rounded-clay-sm border border-eddy-200 bg-white px-4 font-body text-sm text-ink transition-colors placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';
const fieldLabel = 'mb-1 block font-display text-xs font-semibold text-ink-soft';
const DURATIONS = [
  { v: '30', label: '30 นาที' },
  { v: '45', label: '45 นาที' },
  { v: '60', label: '1 ชั่วโมง' },
  { v: '90', label: '1.5 ชั่วโมง' },
  { v: '120', label: '2 ชั่วโมง' },
  { v: '180', label: '3 ชั่วโมง' },
];

const statusChip: Record<string, string> = {
  suggested: 'bg-pastel-yellow text-eddy-700',
  approved: 'bg-pastel-mint text-eddy-700',
  rejected: 'bg-pastel-pink text-eddy-700',
};
const statusText: Record<string, string> = {
  suggested: 'รอยืนยัน',
  approved: 'ลงปฏิทินแล้ว',
  rejected: 'ปฏิเสธแล้ว',
};

export default function GroupTasksPage({ params }: { params: { id: string } }) {
  const [tasks, setTasks] = useState<GroupTaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [due, setDue] = useState('');
  const [adding, setAdding] = useState(false);

  const [distributing, setDistributing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  // ภาระงานหลังกระจายเสร็จ (ถ้ายังไม่กด = ให้ WorkloadPanel โหลดค่าปัจจุบันเอง)
  const [distributedWorkload, setDistributedWorkload] = useState<WorkloadRow[] | undefined>();
  const [workloadKey, setWorkloadKey] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${params.id}/tasks`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addTask() {
    if (!title.trim() || adding) return;
    setAdding(true);
    const res = await fetch(`/api/groups/${params.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, estimatedMinutes: Number(minutes) || 60, dueDate: due || undefined }),
    });
    setAdding(false);
    if (!res.ok) return;
    const data = await res.json();
    setTasks((prev) => [...prev, data.task]);
    setTitle('');
    setMinutes('60');
    setDue('');
    setAddOpen(false);
    notifyGroupUpdated();
  }

  async function respondAssignment(assignmentId: string, approve: boolean) {
    const res = await fetch(`/api/groups/${params.id}/assignments/${assignmentId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve }),
    });
    if (res.ok) {
      load();
      // ยืนยันแล้วงานกลายเป็น event จริง -> ภาระงานเปลี่ยน ให้โหลดค่าใหม่แทนค่าจากตอนกระจาย
      setDistributedWorkload(undefined);
      setWorkloadKey((k) => k + 1);
    }
  }

  async function removeTask(taskId: string) {
    if (!confirm('ลบงานนี้?')) return;
    const res = await fetch(`/api/groups/${params.id}/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      notifyGroupUpdated();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? 'ลบไม่สำเร็จ');
    }
  }

  async function distribute() {
    setDistributing(true);
    setResult(null);
    const res = await fetch(`/api/groups/${params.id}/distribute`, { method: 'POST' });
    const data = await res.json();
    setDistributing(false);
    if (!res.ok) return setResult(data.error ?? 'จัดตารางไม่สำเร็จ');
    setDistributedWorkload(data.workload ?? undefined);
    if (data.assigned === 0 && data.unassigned === 0) setResult(data.message ?? 'ไม่มีงานที่ต้องจัด');
    else
      setResult(
        `เอ็ดดี้จัดให้ ${data.assigned} งาน${data.unassigned ? ` · หาเวลาว่างไม่พอ ${data.unassigned} งาน` : ''}${
          data.usedAI ? '' : ' (ใช้การคำนวณพื้นฐาน)'
        }`,
      );
    load();
  }

  if (notFound) return <p className="py-10 text-center font-body text-sm text-ink-muted">ไม่พบงานของกลุ่มนี้</p>;

  // แยกงานตามสิ่งที่ต้องลงมือทำก่อน
  const waitingMe = tasks.filter((t) => t.assignment?.isMine && t.assignment.status === 'suggested');
  const unassigned = tasks.filter((t) => !t.assignment || t.assignment.status === 'rejected');
  const assigned = tasks.filter((t) => !waitingMe.includes(t) && !unassigned.includes(t));

  const sections: { key: string; title: string; hint?: string; items: GroupTaskInfo[] }[] = [
    { key: 'me', title: 'รอคุณยืนยัน', hint: 'กดยืนยันแล้วงานจะไปโผล่ในปฏิทินส่วนตัวของคุณ', items: waitingMe },
    {
      key: 'todo',
      title: 'ยังไม่ได้มอบหมาย',
      hint: 'กด "ให้เอ็ดดี้จัดตาราง" เพื่อหาคนที่ว่างและเวลาที่ไม่ชนกัน',
      items: unassigned,
    },
    { key: 'done', title: 'มอบหมายแล้ว', items: assigned },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="min-w-0">
        {/* แถบเครื่องมือ */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-body text-sm text-ink-muted">
            เพิ่มงานที่ต้องช่วยกันทำ แล้วให้เอ็ดดี้หาเวลาว่างจัดให้แต่ละคน
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-soft transition-colors hover:bg-eddy-100"
            >
              <Plus size={15} /> เพิ่มงาน
            </button>
            <Button
              onClick={distribute}
              disabled={distributing || tasks.length === 0}
              className="!rounded-full !px-4 !py-2"
            >
              <span className="flex items-center gap-1.5 font-display text-caption">
                <Sparkles size={15} /> {distributing ? 'เอ็ดดี้กำลังจัด...' : 'ให้เอ็ดดี้จัดตาราง'}
              </span>
            </Button>
          </div>
        </div>

        {result && (
          <p className="mt-3 flex items-center gap-2 rounded-clay-sm bg-pastel-mint/50 px-4 py-2.5 font-body text-sm text-ink">
            <Sparkles size={15} className="flex-shrink-0 text-eddy-600" /> {result}
          </p>
        )}

        {/* ภาระงานสมาชิก - ดูก่อนกดจัดตาราง แล้วดูอีกทีว่าหลังจัดแล้วเปลี่ยนไปยังไง */}
        <Card className="mt-4">
          <WorkloadPanel groupId={params.id} rows={distributedWorkload} refreshKey={workloadKey} />
        </Card>

        {/* รายการงานแยกตามสถานะ */}
        {loading ? (
          <p className="py-10 text-center font-body text-sm text-ink-muted">กำลังโหลด...</p>
        ) : tasks.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center gap-2 py-12 text-center">
            <p className="font-display text-base font-bold text-ink">ยังไม่มีงานกลุ่ม</p>
            <p className="max-w-xs font-body text-sm text-ink-muted">
              เพิ่มงานที่ต้องช่วยกันทำ แล้วเอ็ดดี้จะหาเวลาว่างที่ตรงกันของสมาชิกให้เอง
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="mt-1 flex items-center gap-1.5 rounded-clay-sm bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110"
            >
              <Plus size={15} /> เพิ่มงานแรก
            </button>
          </Card>
        ) : (
          <div className="mt-4 flex flex-col gap-6">
            {sections
              .filter((s) => s.items.length > 0)
              .map((section) => (
                <section key={section.key}>
                  <div className="flex items-baseline gap-2">
                    <h2 className="font-display text-sm font-bold text-ink">{section.title}</h2>
                    <span className="font-body text-xs text-ink-muted">{section.items.length} งาน</span>
                  </div>
                  {section.hint && <p className="mt-0.5 font-body text-[11px] text-ink-muted">{section.hint}</p>}

                  <div className="mt-2 flex flex-col gap-2">
                    {section.items.map((t, i) => (
                      <Reveal key={t.id} delay={i * 0.03}>
                        <TaskRow task={t} onRemove={removeTask} onRespond={respondAssignment} />
                      </Reveal>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </div>

      {/* Modal เพิ่มงาน */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="เพิ่มงานกลุ่ม" maxWidth="max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTask();
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <label className={fieldLabel} htmlFor="gt-title">
              ชื่องาน
            </label>
            <input
              id="gt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ทำสไลด์นำเสนอ"
              autoFocus
              className={fieldClass}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={fieldLabel} htmlFor="gt-minutes">
                ใช้เวลา
              </label>
              <select id="gt-minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={fieldClass}>
                {DURATIONS.map((d) => (
                  <option key={d.v} value={d.v}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className={fieldLabel} htmlFor="gt-due">
                กำหนดส่ง (ไม่บังคับ)
              </label>
              <input id="gt-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={fieldClass} />
            </div>
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={adding || !title.trim()}>
              <span className="flex items-center justify-center gap-1.5">
                <Plus size={16} /> {adding ? 'กำลังเพิ่ม...' : 'เพิ่มงาน'}
              </span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TaskRow({
  task,
  onRemove,
  onRespond,
}: {
  task: GroupTaskInfo;
  onRemove: (id: string) => void;
  onRespond: (assignmentId: string, approve: boolean) => void;
}) {
  const a = task.assignment;
  return (
    <Card className="flex items-start gap-3 !p-4">
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm font-semibold text-ink">{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs text-ink-muted">
          <span className="flex items-center gap-1">
            <Clock size={12} /> {task.estimatedMinutes} นาที
          </span>
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <CalendarClock size={12} /> ส่ง {task.dueDate}
            </span>
          )}
        </div>

        {a && a.status !== 'rejected' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-clay-sm bg-eddy-50 px-3 py-2">
            <UserCheck size={14} className="flex-shrink-0 text-eddy-600" />
            <span className="font-body text-xs text-ink">
              {a.isMine ? 'คุณ' : a.assignedToName} · {a.date} {a.startTime}-{a.endTime} น.
            </span>
            <span className={clsx('rounded-full px-2 py-0.5 font-body text-[10px] font-semibold', statusChip[a.status])}>
              {statusText[a.status]}
            </span>

            {a.isMine && a.status === 'suggested' && (
              <span className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => onRespond(a.id, true)}
                  className="flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 font-display text-[11px] font-semibold text-white transition-colors hover:bg-black"
                >
                  <Check size={12} /> ยืนยันลงปฏิทิน
                </button>
                <button
                  onClick={() => onRespond(a.id, false)}
                  aria-label="ปฏิเสธงานนี้"
                  className="flex items-center justify-center rounded-full border border-eddy-200 p-1 text-ink-muted transition-colors hover:bg-white hover:text-eddy-700"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {a.isMine && a.status === 'approved' && (
              <button
                onClick={() => onRespond(a.id, false)}
                className="ml-auto flex items-center gap-1 rounded-full border border-eddy-200 px-2.5 py-1 font-display text-[11px] font-semibold text-ink-soft transition-colors hover:bg-white"
              >
                <X size={12} /> เอาออกจากปฏิทิน
              </button>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => onRemove(task.id)}
        aria-label={`ลบงาน ${task.title}`}
        className="flex-shrink-0 rounded-full p-1.5 text-ink-muted transition-colors hover:bg-pastel-pink/40 hover:text-eddy-700"
      >
        <Trash2 size={15} />
      </button>
    </Card>
  );
}
