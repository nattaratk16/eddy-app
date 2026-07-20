'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Sparkles, Trash2, Clock, CalendarClock, UserCheck, Check, X } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Reveal from '@/components/motion/Reveal';
import type { GroupTaskInfo } from '@/lib/types';

// คุมความสูงทุกช่องให้เท่ากัน (h-11) เพื่อให้ input/select/date/ปุ่ม อยู่ในแนวเดียวกันเป๊ะ
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

export default function GroupTasksPage({ params }: { params: { id: string } }) {
  const [tasks, setTasks] = useState<GroupTaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [due, setDue] = useState('');
  const [adding, setAdding] = useState(false);

  const [distributing, setDistributing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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
  }

  async function respondAssignment(assignmentId: string, approve: boolean) {
    const res = await fetch(`/api/groups/${params.id}/assignments/${assignmentId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve }),
    });
    if (res.ok) load();
  }

  async function removeTask(taskId: string) {
    if (!confirm('ลบงานนี้?')) return;
    const res = await fetch(`/api/groups/${params.id}/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== taskId));
    else {
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
    if (data.assigned === 0 && data.unassigned === 0) setResult(data.message ?? 'ไม่มีงานที่ต้องจัด');
    else
      setResult(
        `เอ็ดดี้จัดให้ ${data.assigned} งาน${data.unassigned ? ` · หาเวลาว่างไม่พอ ${data.unassigned} งาน` : ''}${data.usedAI ? '' : ' (ใช้การคำนวณพื้นฐาน)'}`,
      );
    load();
  }

  if (notFound)
    return (
      <div className="px-4 py-16 text-center md:px-10">
        <p className="font-display text-lg font-bold text-ink">ไม่พบกลุ่มนี้</p>
        <Link href="/groups" className="mt-3 inline-block font-body text-sm font-semibold text-eddy-600">← กลับไปหน้ากลุ่ม</Link>
      </div>
    );

  const statusChip: Record<string, string> = {
    suggested: 'bg-pastel-yellow text-eddy-700',
    approved: 'bg-pastel-mint text-eddy-700',
    rejected: 'bg-pastel-pink text-eddy-700',
  };
  const statusText: Record<string, string> = { suggested: 'รอยืนยัน', approved: 'ลงปฏิทินแล้ว', rejected: 'ปฏิเสธ' };

  return (
    <div className="px-4 pt-8 md:px-10">
      <Link href={`/groups/${params.id}`} className="mb-4 inline-flex items-center gap-1 font-body text-sm font-semibold text-ink-soft transition-colors hover:text-ink">
        <ArrowLeft size={16} /> กลับไปกลุ่ม
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">งานกลุ่ม</h1>
          <p className="font-body text-sm text-ink-muted">เพิ่มงานที่ต้องช่วยกันทำ แล้วให้เอ็ดดี้หาเวลาว่างจัดให้แต่ละคน</p>
        </div>
        <Button onClick={distribute} disabled={distributing || tasks.length === 0}>
          <span className="flex items-center gap-1.5">
            <Sparkles size={16} /> {distributing ? 'เอ็ดดี้กำลังจัด...' : 'ให้เอ็ดดี้จัดตาราง'}
          </span>
        </Button>
      </div>

      {result && (
        <div className="mt-4 flex items-center gap-2 rounded-clay border border-eddy-100 bg-pastel-mint/40 px-4 py-3 font-body text-sm text-ink">
          <Sparkles size={16} className="flex-shrink-0 text-eddy-600" /> {result}
        </div>
      )}

      {/* ฟอร์มเพิ่มงาน */}
      <Card className="mt-5">
        <h2 className="font-display text-base font-bold text-ink">เพิ่มงานใหม่</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTask();
          }}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className={fieldLabel} htmlFor="gt-title">ชื่องาน</label>
            <input
              id="gt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ทำสไลด์นำเสนอ"
              className={fieldClass}
            />
          </div>
          <div className="w-full sm:w-36">
            <label className={fieldLabel} htmlFor="gt-minutes">ใช้เวลา</label>
            <select id="gt-minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={fieldClass}>
              {DURATIONS.map((d) => (
                <option key={d.v} value={d.v}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-44">
            <label className={fieldLabel} htmlFor="gt-due">กำหนดส่ง (ไม่บังคับ)</label>
            <input id="gt-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={fieldClass} />
          </div>
          <Button type="submit" disabled={adding} className="!h-11 !py-0">
            <span className="flex items-center justify-center gap-1.5"><Plus size={16} /> เพิ่ม</span>
          </Button>
        </form>
      </Card>

      {/* รายการงาน */}
      <div className="mt-5 flex flex-col gap-3">
        {loading ? (
          <p className="py-10 text-center font-body text-sm text-ink-muted">กำลังโหลด...</p>
        ) : tasks.length === 0 ? (
          <Card className="py-12 text-center font-body text-sm text-ink-muted">ยังไม่มีงานกลุ่ม เพิ่มงานแรกด้านบนได้เลย</Card>
        ) : (
          tasks.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.04}>
              <Card className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm font-semibold text-ink">{t.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs text-ink-muted">
                    <span className="flex items-center gap-1"><Clock size={12} /> {t.estimatedMinutes} นาที</span>
                    {t.dueDate && <span className="flex items-center gap-1"><CalendarClock size={12} /> ส่ง {t.dueDate}</span>}
                  </div>
                  {t.assignment && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-clay-sm bg-eddy-50 px-3 py-2">
                      <UserCheck size={14} className="text-eddy-600" />
                      <span className="font-body text-xs text-ink">
                        {t.assignment.isMine ? 'คุณ' : t.assignment.assignedToName} · {t.assignment.date} {t.assignment.startTime}-{t.assignment.endTime} น.
                      </span>
                      <span className={`rounded-full px-2 py-0.5 font-body text-[10px] font-semibold ${statusChip[t.assignment.status]}`}>
                        {statusText[t.assignment.status]}
                      </span>
                      {t.assignment.isMine && t.assignment.status === 'suggested' && (
                        <span className="ml-auto flex items-center gap-1.5">
                          <button
                            onClick={() => respondAssignment(t.assignment!.id, true)}
                            className="flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 font-display text-[11px] font-semibold text-white transition-colors hover:bg-black"
                          >
                            <Check size={12} /> ยืนยันลงปฏิทิน
                          </button>
                          <button
                            onClick={() => respondAssignment(t.assignment!.id, false)}
                            aria-label="ปฏิเสธ"
                            className="flex items-center justify-center rounded-full border border-eddy-200 p-1 text-ink-muted transition-colors hover:bg-white hover:text-eddy-700"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      )}
                      {t.assignment.isMine && t.assignment.status === 'approved' && (
                        <button
                          onClick={() => respondAssignment(t.assignment!.id, false)}
                          className="ml-auto flex items-center gap-1 rounded-full border border-eddy-200 px-2.5 py-1 font-display text-[11px] font-semibold text-ink-soft transition-colors hover:bg-white"
                        >
                          <X size={12} /> เอาออกจากปฏิทิน
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeTask(t.id)}
                  aria-label="ลบงาน"
                  className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-pastel-pink/40 hover:text-eddy-700"
                >
                  <Trash2 size={15} />
                </button>
              </Card>
            </Reveal>
          ))
        )}
      </div>
    </div>
  );
}
