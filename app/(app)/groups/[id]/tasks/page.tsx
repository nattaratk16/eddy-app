'use client';

/**
 * แท็บ "งานกลุ่ม"
 * หัวกลุ่ม + แท็บ อยู่ใน layout.tsx แล้ว หน้านี้ดูแลแค่เนื้อหา
 *
 * จัดใหม่จากเดิมที่เป็นรายการยาวเรียงต่อกันหมด:
 *   - แยกงานเป็น 4 กลุ่มตามสถานะ (รอคุณยืนยัน / ยังไม่ได้มอบหมาย / มอบหมายแล้ว / เสร็จแล้ว)
 *     เพราะสิ่งที่ต้องลงมือทำจริงๆ คือสองกลุ่มแรก
 *   - ฟอร์มเพิ่มงานย้ายไปอยู่ในปุ่ม "เพิ่มงาน" (เดิมกางค้างไว้กินพื้นที่ตลอด)
 *   - ภาระงานสมาชิกอยู่คอลัมน์ขวา เห็นได้ตลอดโดยไม่ต้องกดจัดตารางก่อน
 *   - เพิ่มงานตอนนี้แตกเป็นขั้นตอนย่อยด้วย AI ได้ ก่อนยืนยันเลือกได้ว่าจะมอบหมายเอง
 *     หรือปล่อยให้เอ็ดดี้จัดตาราง (ปุ่ม "ให้เอ็ดดี้จัดตาราง" เดิม ไม่แตะของที่มอบหมายเองแล้ว)
 *   - ตอนยืนยันงาน เลือก "เวลาอื่น" แทนเวลาที่เอ็ดดี้เสนอได้ ถ้าเวลานั้นไม่ชนปฏิทินตัวเอง
 *   - เจ้าของงาน (คนที่ถูกมอบหมายและ approve แล้ว) ติ๊กว่าเสร็จได้ คนอื่นเห็นแต่ติ๊กแทนไม่ได้
 */
import { useCallback, useEffect, useState, use } from 'react';
import { CalendarClock, Check, Clock, Plus, Sparkles, Trash2, UserCheck, X } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Reveal from '@/components/motion/Reveal';
import EddyMascot from '@/components/EddyMascot';
import WorkloadPanel, { type WorkloadRow } from '@/components/groups/WorkloadPanel';
import { notifyGroupUpdated } from '@/lib/groupEvents';
import type { GroupInfo, GroupMemberInfo, GroupTaskInfo } from '@/lib/types';

// คุมความสูงทุกช่องให้เท่ากัน (h-11) เพื่อให้ input/select/date อยู่ในแนวเดียวกันเป๊ะ
const fieldClass =
  'h-11 w-full rounded-clay-sm border border-eddy-200 bg-surface px-4 font-body text-sm text-ink transition-colors placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';
const fieldLabel = 'mb-1 block font-display text-xs font-semibold text-ink-soft';
const smallField =
  'h-8 rounded-clay-sm border border-eddy-200 bg-surface px-2 font-body text-xs text-ink focus:border-eddy-400 focus:outline-none';
const DURATIONS = [
  { v: '30', label: '30 นาที' },
  { v: '45', label: '45 นาที' },
  { v: '60', label: '1 ชั่วโมง' },
  { v: '90', label: '1.5 ชั่วโมง' },
  { v: '120', label: '2 ชั่วโมง' },
  { v: '180', label: '3 ชั่วโมง' },
];

const statusChip: Record<string, string> = {
  suggested: 'bg-pastel-yellow text-chip-ink',
  approved: 'bg-pastel-mint text-chip-ink',
  rejected: 'bg-pastel-pink text-chip-ink',
};
const statusText: Record<string, string> = {
  suggested: 'รอยืนยัน',
  approved: 'ลงปฏิทินแล้ว',
  rejected: 'ปฏิเสธแล้ว',
};

interface StepRow {
  title: string;
  estimatedMinutes: number;
  /** null = ปล่อยให้เอ็ดดี้จัดตาราง (กด "ให้เอ็ดดี้จัดตาราง" ทีหลัง) */
  assigneeUserId: string | null;
}

export default function GroupTasksPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [tasks, setTasks] = useState<GroupTaskInfo[]>([]);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [due, setDue] = useState('');
  const [adding, setAdding] = useState(false);

  // ---- แตกงานย่อยด้วย AI (ก่อนยืนยันเพิ่มจริง) ----
  const [steps, setSteps] = useState<StepRow[] | null>(null);
  const [breakingDown, setBreakingDown] = useState(false);
  const [confirmingSteps, setConfirmingSteps] = useState(false);

  const [distributing, setDistributing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  // ภาระงานหลังกระจายเสร็จ (ถ้ายังไม่กด = ให้ WorkloadPanel โหลดค่าปัจจุบันเอง)
  const [distributedWorkload, setDistributedWorkload] = useState<WorkloadRow[] | undefined>();
  const [workloadKey, setWorkloadKey] = useState(0);

  const acceptedMembers = (group?.members ?? []).filter((m) => m.status === 'accepted');

  const load = useCallback(async () => {
    const [tRes, gRes] = await Promise.all([fetch(`/api/groups/${params.id}/tasks`), fetch(`/api/groups/${params.id}`)]);
    if (!tRes.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setTasks((await tRes.json()).tasks ?? []);
    if (gRes.ok) setGroup((await gRes.json()).group);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  function openAddModal() {
    // ค่าเริ่มต้นชื่องาน = ชื่อกลุ่ม (เผื่องานนี้คือ "โปรเจกต์" ทั้งก้อนที่กำลังจะแตกย่อย) แก้ไขได้เสมอ
    if (!title.trim()) setTitle(group?.name ?? '');
    setAddOpen(true);
  }

  function closeAddModal() {
    setAddOpen(false);
    setSteps(null);
    setTitle('');
    setMinutes('60');
    setDue('');
  }

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
    closeAddModal();
    notifyGroupUpdated();
  }

  async function breakdown() {
    if (!title.trim() || breakingDown) return;
    setBreakingDown(true);
    const res = await fetch(`/api/groups/${params.id}/tasks/breakdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, dueDate: due || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setBreakingDown(false);
    if (!res.ok) {
      alert(data.error ?? 'แตกงานไม่สำเร็จ');
      return;
    }
    setSteps(
      (data.steps ?? []).map((s: { title: string; estimatedMinutes: number }) => ({ ...s, assigneeUserId: null })),
    );
  }

  function updateStep(i: number, patch: Partial<StepRow>) {
    setSteps((prev) => (prev ? prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) : prev));
  }
  function removeStep(i: number) {
    setSteps((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }
  function addStepRow() {
    setSteps((prev) => [...(prev ?? []), { title: '', estimatedMinutes: 60, assigneeUserId: null }]);
  }

  async function confirmSteps() {
    if (!steps || confirmingSteps) return;
    const rows = steps.filter((s) => s.title.trim());
    if (rows.length === 0) return;
    setConfirmingSteps(true);
    let created = 0;
    let assignFailed = 0;
    for (const s of rows) {
      const res = await fetch(`/api/groups/${params.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: s.title,
          estimatedMinutes: s.estimatedMinutes,
          dueDate: due || undefined,
          description: `จากการแตกงาน: "${title}"`,
        }),
      });
      if (!res.ok) continue;
      created++;
      if (s.assigneeUserId) {
        const taskId = (await res.json()).task.id;
        const aRes = await fetch(`/api/groups/${params.id}/tasks/${taskId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: s.assigneeUserId }),
        });
        if (!aRes.ok) assignFailed++;
      }
    }
    setConfirmingSteps(false);
    setResult(`เพิ่ม ${created} งานจากการแตกงาน${assignFailed > 0 ? ` (มอบหมายให้บางคนไม่สำเร็จ ${assignFailed} งาน - หาช่วงว่างไม่ทัน ลองมอบหมายเองอีกทีจากรายการ)` : ''}`);
    closeAddModal();
    load();
    notifyGroupUpdated();
  }

  async function respondAssignment(
    assignmentId: string,
    approve: boolean,
    override?: { date: string; startTime: string; endTime: string },
  ) {
    const res = await fetch(`/api/groups/${params.id}/assignments/${assignmentId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve, ...(override ? { override } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      load();
      // ยืนยันแล้วงานกลายเป็น event จริง -> ภาระงานเปลี่ยน ให้โหลดค่าใหม่แทนค่าจากตอนกระจาย
      setDistributedWorkload(undefined);
      setWorkloadKey((k) => k + 1);
    } else {
      alert(data.error ?? 'ทำรายการไม่สำเร็จ');
    }
  }

  async function assignTask(taskId: string, userId: string) {
    const res = await fetch(`/api/groups/${params.id}/tasks/${taskId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      load();
      setDistributedWorkload(undefined);
      setWorkloadKey((k) => k + 1);
    } else {
      alert(data.error ?? 'มอบหมายไม่สำเร็จ');
    }
  }

  async function toggleDone(taskId: string, done: boolean) {
    const res = await fetch(`/api/groups/${params.id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: data.task.done, completedAt: data.task.completedAt } : t)));
    } else {
      alert(data.error ?? 'อัปเดตไม่สำเร็จ');
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

  // แยกงานตามสิ่งที่ต้องลงมือทำก่อน (งานที่เสร็จแล้วแยกไปกลุ่มท้ายสุดเสมอ ไม่ปนกับที่ยังต้องตาม)
  const waitingMe = tasks.filter((t) => !t.done && t.assignment?.isMine && t.assignment.status === 'suggested');
  const unassigned = tasks.filter((t) => !t.done && (!t.assignment || t.assignment.status === 'rejected'));
  const doneTasks = tasks.filter((t) => t.done);
  const assigned = tasks.filter((t) => !t.done && !waitingMe.includes(t) && !unassigned.includes(t));

  const sections: { key: string; title: string; hint?: string; items: GroupTaskInfo[] }[] = [
    { key: 'me', title: 'รอคุณยืนยัน', hint: 'กดยืนยันแล้วงานจะไปโผล่ในปฏิทินส่วนตัวของคุณ', items: waitingMe },
    {
      key: 'todo',
      title: 'ยังไม่ได้มอบหมาย',
      hint: 'มอบหมายเองจากรายการด้านล่าง หรือกด "ให้เอ็ดดี้จัดตาราง" ให้จัดให้อัตโนมัติ',
      items: unassigned,
    },
    { key: 'assigned', title: 'มอบหมายแล้ว', items: assigned },
    { key: 'done', title: 'เสร็จแล้ว', items: doneTasks },
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
              onClick={openAddModal}
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
          <div className="mt-3 flex items-center gap-2.5 rounded-clay-sm bg-pastel-mint/50 px-4 py-2.5">
            <EddyMascot character="nova" mood="happy" size={32} float={false} />
            <p className="font-body text-sm text-ink">{result}</p>
          </div>
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
              onClick={openAddModal}
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
                        <TaskRow
                          task={t}
                          members={acceptedMembers}
                          onRemove={removeTask}
                          onRespond={respondAssignment}
                          onAssign={assignTask}
                          onToggleDone={toggleDone}
                        />
                      </Reveal>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </div>

      {/* Modal เพิ่มงาน - โหมดปกติ หรือโหมดตรวจสอบขั้นตอนหลังแตกงาน (steps !== null) */}
      <Modal
        open={addOpen}
        onClose={closeAddModal}
        title={steps ? 'ตรวจสอบขั้นตอนที่แตกได้' : 'เพิ่มงานกลุ่ม'}
        maxWidth={steps ? 'max-w-lg' : 'max-w-md'}
      >
        {!steps ? (
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
                onFocus={(e) => e.target.select()}
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
            <button
              type="button"
              onClick={breakdown}
              disabled={!title.trim() || breakingDown}
              className="flex items-center justify-center gap-1.5 rounded-clay-sm border-2 border-dashed border-eddy-200 px-3 py-2.5 font-display text-xs font-semibold text-eddy-600 transition-colors hover:bg-eddy-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={14} /> {breakingDown ? 'เอ็ดดี้กำลังแตกงาน...' : 'แตกงานย่อยด้วย AI'}
            </button>
            <div className="mt-1 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={closeAddModal}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={adding || !title.trim()}>
                <span className="flex items-center justify-center gap-1.5">
                  <Plus size={16} /> {adding ? 'กำลังเพิ่ม...' : 'เพิ่มงาน'}
                </span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-body text-xs text-ink-muted">
              แก้ไข ลบ หรือเพิ่มขั้นตอนได้ก่อนยืนยัน แล้วเลือกได้ว่าจะมอบหมายเองหรือให้เอ็ดดี้เลือกให้ทีหลัง
            </p>
            <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
              {steps.map((s, i) => (
                <div key={i} className="rounded-clay-sm bg-eddy-50 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={s.title}
                      onChange={(e) => updateStep(i, { title: e.target.value })}
                      placeholder="ชื่อขั้นตอน"
                      className="h-9 flex-1 rounded-clay-sm border border-eddy-200 bg-surface px-3 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none"
                    />
                    <button
                      onClick={() => removeStep(i)}
                      aria-label="ลบขั้นตอนนี้"
                      className="flex-shrink-0 rounded-full p-1 text-ink-muted transition-colors hover:bg-surface hover:text-eddy-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      step={5}
                      value={s.estimatedMinutes}
                      onChange={(e) => updateStep(i, { estimatedMinutes: Math.max(5, Math.min(1440, Number(e.target.value) || 60)) })}
                      className={clsx(smallField, 'w-20')}
                    />
                    <span className="font-body text-xs text-ink-muted">นาที</span>
                    <select
                      value={s.assigneeUserId ?? ''}
                      onChange={(e) => updateStep(i, { assigneeUserId: e.target.value || null })}
                      className={clsx(smallField, 'ml-auto flex-1')}
                    >
                      <option value="">ให้ AI เลือก</option>
                      {acceptedMembers.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.isMe ? `${m.name} (คุณ)` : m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addStepRow}
              className="flex items-center justify-center gap-1.5 rounded-clay-sm border-2 border-dashed border-eddy-200 px-3 py-2 font-display text-xs font-semibold text-eddy-600 transition-colors hover:bg-eddy-50"
            >
              <Plus size={14} /> เพิ่มขั้นตอน
            </button>
            <div className="mt-1 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setSteps(null)}>
                ย้อนกลับ
              </Button>
              <Button onClick={confirmSteps} disabled={confirmingSteps || steps.every((s) => !s.title.trim())}>
                <span className="flex items-center justify-center gap-1.5">
                  <Check size={16} /> {confirmingSteps ? 'กำลังเพิ่ม...' : `เพิ่ม ${steps.length} งาน`}
                </span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TaskRow({
  task,
  members,
  onRemove,
  onRespond,
  onAssign,
  onToggleDone,
}: {
  task: GroupTaskInfo;
  members: GroupMemberInfo[];
  onRemove: (id: string) => void;
  onRespond: (assignmentId: string, approve: boolean, override?: { date: string; startTime: string; endTime: string }) => void;
  onAssign: (taskId: string, userId: string) => void;
  onToggleDone: (taskId: string, done: boolean) => void;
}) {
  const a = task.assignment;
  const [pickingTime, setPickingTime] = useState(false);
  const [overrideDate, setOverrideDate] = useState(a?.date ?? '');
  const [overrideStart, setOverrideStart] = useState(a?.startTime ?? '');
  const [overrideEnd, setOverrideEnd] = useState(a?.endTime ?? '');

  // แถวนี้ผูก key ไว้กับ task.id ไม่ใช่ assignment.id (เพราะ task.id คงที่กว่า) เลย component
  // ไม่ remount เองตอน assignment ถูกแทนที่ด้วยอันใหม่ (เช่นกด "ให้เอ็ดดี้จัดตาราง" ซ้ำ) - ต้อง
  // sync ค่าฟอร์มตามข้อมูลใหม่เอง ไม่งั้นจะยืนยันเวลาเก่าที่เอ็ดดี้เสนอรอบก่อนไปแบบไม่รู้ตัว
  useEffect(() => {
    setOverrideDate(a?.date ?? '');
    setOverrideStart(a?.startTime ?? '');
    setOverrideEnd(a?.endTime ?? '');
  }, [a?.id, a?.date, a?.startTime, a?.endTime]);

  const overrideValid =
    !!overrideDate && !!overrideStart && !!overrideEnd && overrideStart < overrideEnd;

  return (
    <Card className={clsx('flex items-start gap-3 !p-4', task.done && 'bg-eddy-50/40')}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* ติ๊กเสร็จ - เฉพาะเจ้าของงานที่ลงปฏิทินแล้ว คนอื่นเห็นสถานะได้อย่างเดียว */}
          {a?.isMine && a.status === 'approved' && (
            <button
              onClick={() => onToggleDone(task.id, !task.done)}
              aria-label={task.done ? 'ยังไม่เสร็จ' : 'ติ๊กว่าเสร็จแล้ว'}
              className={clsx(
                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                task.done ? 'border-eddy-500 bg-eddy-500 text-white' : 'border-eddy-200 text-transparent hover:border-eddy-400',
              )}
            >
              <Check size={12} />
            </button>
          )}
          <p className={clsx('font-body text-sm font-semibold text-ink', task.done && 'text-ink-muted line-through')}>
            {task.title}
          </p>
        </div>
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
                  className="flex items-center gap-1 rounded-full bg-inverse px-2.5 py-1 font-display text-[11px] font-semibold text-white transition-colors hover:bg-black"
                >
                  <Check size={12} /> ยืนยันลงปฏิทิน
                </button>
                <button
                  onClick={() => setPickingTime((v) => !v)}
                  className="flex items-center gap-1 rounded-full border border-eddy-200 px-2.5 py-1 font-display text-[11px] font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-eddy-700"
                >
                  <CalendarClock size={12} /> เลือกเวลาอื่น
                </button>
                <button
                  onClick={() => onRespond(a.id, false)}
                  aria-label="ปฏิเสธงานนี้"
                  className="flex items-center justify-center rounded-full border border-eddy-200 p-1 text-ink-muted transition-colors hover:bg-surface hover:text-eddy-700"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {/* เลือกเวลาที่สะดวกเอง แทนที่เวลาที่เอ็ดดี้เสนอมา (ต้องไม่ชนปฏิทินตัวเองและไม่เกินกำหนดส่ง) */}
            {a.isMine && a.status === 'suggested' && pickingTime && (
              <div className="mt-1 flex w-full flex-wrap items-end gap-2 border-t border-eddy-100 pt-2">
                <div>
                  <label className="mb-0.5 block font-body text-[10px] text-ink-muted">วันที่</label>
                  <input
                    type="date"
                    value={overrideDate}
                    max={task.dueDate ?? undefined}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className={smallField}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block font-body text-[10px] text-ink-muted">เริ่ม</label>
                  <input type="time" value={overrideStart} onChange={(e) => setOverrideStart(e.target.value)} className={smallField} />
                </div>
                <div>
                  <label className="mb-0.5 block font-body text-[10px] text-ink-muted">ถึง</label>
                  <input type="time" value={overrideEnd} onChange={(e) => setOverrideEnd(e.target.value)} className={smallField} />
                </div>
                <button
                  disabled={!overrideValid}
                  onClick={() => {
                    onRespond(a.id, true, { date: overrideDate, startTime: overrideStart, endTime: overrideEnd });
                    setPickingTime(false);
                  }}
                  className="flex h-8 items-center gap-1 rounded-full bg-eddy-500 px-3 font-display text-[11px] font-semibold text-white transition-colors hover:bg-eddy-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={12} /> ยืนยันเวลานี้
                </button>
              </div>
            )}

            {a.isMine && a.status === 'approved' && (
              <button
                onClick={() => onRespond(a.id, false)}
                className="ml-auto flex items-center gap-1 rounded-full border border-eddy-200 px-2.5 py-1 font-display text-[11px] font-semibold text-ink-soft transition-colors hover:bg-surface"
              >
                <X size={12} /> เอาออกจากปฏิทิน
              </button>
            )}
          </div>
        )}

        {/* มอบหมายเอง - เฉพาะงานที่ยังไม่มีคนรับ หรือถูกปฏิเสธไป (กันชนกับที่กำลังรอคนอื่นยืนยันอยู่) */}
        {(!a || a.status === 'rejected') && members.length > 0 && (
          <div className="mt-2">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) onAssign(task.id, e.target.value);
              }}
              className={clsx(smallField, 'w-full sm:w-auto')}
            >
              <option value="" disabled>
                มอบหมายให้...
              </option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.isMe ? `${m.name} (คุณ)` : m.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button
        onClick={() => onRemove(task.id)}
        aria-label={`ลบงาน ${task.title}`}
        className="flex-shrink-0 rounded-full p-1.5 text-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark-muted transition-colors hover:bg-pastel-pink/40 hover:text-chip-ink"
      >
        <Trash2 size={15} />
      </button>
    </Card>
  );
}
