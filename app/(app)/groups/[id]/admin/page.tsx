'use client';

/**
 * แท็บ "จัดการกลุ่ม" - เฉพาะเจ้าของกลุ่มเห็น (ดู ownerOnly ใน layout.tsx)
 * --------------------------------------------------------------
 * "กฎง่ายๆ" ที่ใช้: ใครสร้างกลุ่มก็มีสิทธิ์มีหน้านี้ไปเลย (Group.ownerId ตัดสิน ไม่มีระบบสิทธิ์ใหม่)
 * ให้ฟีลเหมือน Google Classroom ที่เจ้าของกลุ่มเห็นภาพรวม + มอบหมายงานได้จากหน้าเดียว:
 *   - badge "โหลดเยอะสุดในกลุ่มนี้" + ปุ่มเฟืองตั้งค่ากลุ่มมุมบน (เปิด GroupSettingsModal เดิม)
 *   - สรุปจำนวนงาน (ทั้งหมด/เสร็จแล้ว/เลยกำหนด) + การ์ด "งานที่ต้องตามเร่งด่วน" (เลยกำหนด/ใกล้ครบ
 *     กำหนดใน 3 วัน)
 *   - กราฟภาระงานเต็มรูปแบบ (WorkloadPanel เดิม)
 *   - ปุ่ม "มอบหมายงาน" เปิด modal กรอกสั้นๆ (เรียก API เพิ่มงาน + มอบหมาย ที่มีอยู่แล้ว - ไม่ทำ AI
 *     แตกงาน/distribute ซ้ำ เพราะของพวกนั้นซับซ้อนและอยู่ที่ /groups/[id]/tasks อยู่แล้ว ลิงก์ไปจากหน้านี้แทน)
 *   - รายชื่อสมาชิก (reuse MemberRow เดียวกับหน้าภาพรวม) + โซนอันตรายลบกลุ่ม
 * --------------------------------------------------------------
 */
import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, CalendarClock, ChevronRight, ListChecks, Plus, Settings, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import WorkloadPanel, { type WorkloadRow } from '@/components/groups/WorkloadPanel';
import MemberRow from '@/components/groups/MemberRow';
import GroupSettingsModal from '@/components/groups/GroupSettingsModal';
import { useToast } from '@/components/ToastProvider';
import { GROUP_UPDATED_EVENT, notifyGroupUpdated } from '@/lib/groupEvents';
import { loadBandOf, loadPct } from '@/lib/loadBands';
import { todayISOBangkok } from '@/lib/thaiTime';
import type { GroupInfo, GroupTaskInfo } from '@/lib/types';

/** วันที่ (YYYY-MM-DD) + จำนวนวัน -> วันที่ใหม่แบบ string เดียวกัน (ใช้หาขอบเขต "ใกล้ครบกำหนด") */
function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const URGENT_WINDOW_DAYS = 3;

export default function GroupAdminPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const toast = useToast();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [tasks, setTasks] = useState<GroupTaskInfo[]>([]);
  const [workload, setWorkload] = useState<WorkloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ฟอร์มมอบหมายงานด่วน - อยู่ใน modal แยก ไม่ได้แปะค้างบนหน้า
  const [assignOpen, setAssignOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    const [gRes, tRes, wRes] = await Promise.all([
      fetch(`/api/groups/${params.id}`),
      fetch(`/api/groups/${params.id}/tasks`),
      fetch(`/api/groups/${params.id}/workload`),
    ]);
    if (!gRes.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const g: GroupInfo = (await gRes.json()).group;
    setGroup(g);
    if (tRes.ok) setTasks((await tRes.json()).tasks ?? []);
    if (wRes.ok) setWorkload((await wRes.json()).workload ?? []);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener(GROUP_UPDATED_EVENT, handler);
    return () => window.removeEventListener(GROUP_UPDATED_EVENT, handler);
  }, [load]);

  // หน้านี้สำหรับเจ้าของกลุ่มเท่านั้น - คนอื่นเข้า URL ตรงๆ ให้เด้งกลับไปภาพรวม
  useEffect(() => {
    if (!loading && group && !group.isOwner) {
      router.replace(`/groups/${params.id}`);
    }
  }, [loading, group, params.id, router]);

  async function removeMember(memberId: string) {
    if (!confirm('เอาสมาชิกคนนี้ออกจากกลุ่ม?')) return;
    await fetch(`/api/groups/${params.id}/members/${memberId}`, { method: 'DELETE' });
    load();
    notifyGroupUpdated();
  }

  async function deleteGroup() {
    if (!confirm('ลบกลุ่มนี้ถาวร? สมาชิกทุกคนจะออกจากกลุ่ม')) return;
    await fetch(`/api/groups/${params.id}`, { method: 'DELETE' });
    router.push('/groups');
  }

  async function quickAssign(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || !assigneeId) return;
    setAssigning(true);
    setAssignError('');

    const tRes = await fetch(`/api/groups/${params.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t, dueDate: dueDate || undefined }),
    });
    const tData = await tRes.json().catch(() => ({}));
    if (!tRes.ok) {
      setAssigning(false);
      return setAssignError(tData.error ?? 'เพิ่มงานไม่สำเร็จ');
    }

    const aRes = await fetch(`/api/groups/${params.id}/tasks/${tData.task.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: assigneeId }),
    });
    setAssigning(false);
    if (!aRes.ok) {
      const aData = await aRes.json().catch(() => ({}));
      toast.error(
        `เพิ่มงาน "${t}" แล้ว แต่มอบหมายอัตโนมัติไม่สำเร็จ (${aData.error ?? 'หาเวลาว่างไม่ทัน'}) ไปมอบหมายเองได้ที่แท็บ "รายละเอียดงาน"`,
      );
      setTitle('');
      setDueDate('');
      setAssigneeId('');
      setAssignOpen(false);
      load();
      return;
    }

    toast.success(`มอบหมาย "${t}" แล้ว`);
    setTitle('');
    setDueDate('');
    setAssigneeId('');
    setAssignOpen(false);
    load();
  }

  if (loading) return <p className="py-10 text-center font-body text-sm text-ink-muted">กำลังโหลด...</p>;
  if (notFound || !group)
    return (
      <div className="py-10 text-center">
        <p className="font-display text-lg font-bold text-ink">ไม่พบกลุ่มนี้</p>
        <Link href="/groups" className="mt-3 inline-block font-body text-sm font-semibold text-eddy-600">
          ← กลับไปหน้ากลุ่ม
        </Link>
      </div>
    );
  if (!group.isOwner) return <p className="py-10 text-center font-body text-sm text-ink-muted">กำลังพากลับ...</p>;

  const accepted = (group.members ?? []).filter((m) => m.status === 'accepted');
  const pending = (group.members ?? []).filter((m) => m.status === 'pending');
  const unassignedCount = tasks.filter((t) => !t.done && (!t.assignment || t.assignment.status === 'rejected')).length;

  const sortedWorkload = [...workload].sort((a, b) => (b.score ?? Infinity) - (a.score ?? Infinity));
  const top = sortedWorkload[0];
  const topBand = top ? loadBandOf(loadPct(top.committedMinutes, top.freeMinutes)) : null;

  // ---- สรุปงาน + งานที่ต้องตามเร่งด่วน (เลยกำหนด/ใกล้ครบกำหนดใน 3 วัน, ยังไม่เสร็จ) ----
  const today = todayISOBangkok();
  const urgentCutoff = addDaysISO(today, URGENT_WINDOW_DAYS);
  const doneCount = tasks.filter((t) => t.done).length;
  const overdueTasks = tasks.filter((t) => !t.done && t.dueDate && t.dueDate < today);
  const dueSoonTasks = tasks.filter((t) => !t.done && t.dueDate && t.dueDate >= today && t.dueDate <= urgentCutoff);
  // เรียงใกล้ครบกำหนดสุดไว้บนสุดเสมอ (เลยกำหนดนานสุด -> เลยกำหนดน้อยสุด -> ใกล้ครบกำหนดสุด)
  const urgentTasks = [...overdueTasks, ...dueSoonTasks].sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        {top && topBand ? (
          <div className={`flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs font-semibold ${topBand.text} ${topBand.track}`}>
            <AlertTriangle size={13} /> โหลดเยอะสุดในกลุ่มนี้: {top.isMe ? 'คุณ' : top.name} ·{' '}
            {loadPct(top.committedMinutes, top.freeMinutes)}% ({topBand.label})
          </div>
        ) : (
          <span />
        )}
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="ตั้งค่ากลุ่ม"
          title="ตั้งค่ากลุ่ม"
          className="flex flex-shrink-0 items-center justify-center rounded-full border border-eddy-200 bg-surface p-2 text-ink-muted transition-colors hover:bg-eddy-50 hover:text-ink"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* ---- สรุปงาน ---- */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="งานทั้งหมด" value={tasks.length} />
        <StatTile label="เสร็จแล้ว" value={doneCount} tone="ok" />
        <StatTile label="เลยกำหนด" value={overdueTasks.length} tone={overdueTasks.length > 0 ? 'warn' : 'default'} />
      </div>

      {/* ---- งานที่ต้องตามเร่งด่วน (เลยกำหนด/ใกล้ครบกำหนดใน 3 วัน) ---- */}
      <Card>
        <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
          <CalendarClock size={16} className="text-load-full" /> งานที่ต้องตามเร่งด่วน
        </h2>
        {urgentTasks.length === 0 ? (
          <p className="mt-2 font-body text-xs text-ink-muted">ไม่มีงานเลยกำหนดหรือใกล้ครบกำหนดตอนนี้</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {urgentTasks.map((t) => {
              const overdue = t.dueDate! < today;
              return (
                <Link
                  key={t.id}
                  href={`/groups/${params.id}/tasks`}
                  className="flex items-center gap-3 rounded-clay-sm bg-eddy-50/60 px-3 py-2 transition-colors hover:bg-eddy-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm text-ink">{t.title}</p>
                    <p className="truncate font-body text-[11px] text-ink-muted">
                      {t.assignment ? t.assignment.assignedToName : 'ยังไม่มอบหมาย'}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] font-bold ${
                      overdue ? 'bg-load-full/15 text-load-full' : 'bg-load-tight/15 text-load-tight'
                    }`}
                  >
                    {overdue ? `เลยกำหนด ${t.dueDate}` : `ส่ง ${t.dueDate}`}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <WorkloadPanel groupId={params.id} />
      </Card>

      {/* ---- มอบหมายงานด่วน ---- */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-ink">
              <ListChecks size={17} className="text-eddy-500" /> มอบหมายงานด่วน
            </h2>
            <p className="mt-0.5 font-body text-xs text-ink-muted">
              เพิ่มงานสั้นๆ แล้วมอบหมายให้สมาชิกได้ทันที (หาช่วงเวลาว่างให้อัตโนมัติ)
            </p>
          </div>
          <Button onClick={() => setAssignOpen(true)} className="!rounded-full !px-4 !py-2">
            <span className="flex items-center gap-1.5 font-display text-caption">
              <Plus size={15} /> มอบหมายงาน
            </span>
          </Button>
        </div>

        <Link
          href={`/groups/${params.id}/tasks`}
          className="mt-3 flex items-center gap-1 font-body text-xs font-semibold text-eddy-600 transition-colors hover:underline"
        >
          {unassignedCount > 0 ? `มีงานที่ยังไม่มอบหมายอีก ${unassignedCount} งาน` : 'ไปจัดการงานทั้งหมด'}{' '}
          <ArrowRight size={13} />
        </Link>
      </Card>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="มอบหมายงานด่วน" maxWidth="max-w-md">
        <p className="font-body text-xs text-ink-muted">
          ถ้าอยากแตกงานเป็นขั้นตอนย่อยด้วย AI หรือให้เอ็ดดี้จัดตารางทั้งกลุ่ม ไปที่แท็บ
          &quot;รายละเอียดงาน&quot; แทน
        </p>
        <form onSubmit={quickAssign} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block font-display text-xs font-semibold text-ink-soft">ชื่องาน</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ทำสไลด์นำเสนอบทที่ 3"
              autoFocus
              className="w-full rounded-clay-sm border border-eddy-200 bg-surface px-3.5 py-2 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
            />
          </div>
          <div>
            <label className="mb-1 block font-display text-xs font-semibold text-ink-soft">กำหนดส่ง (ไม่บังคับ)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-clay-sm border border-eddy-200 bg-surface px-3.5 py-2 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
            />
          </div>
          <div>
            <label className="mb-1 block font-display text-xs font-semibold text-ink-soft">มอบหมายให้</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-clay-sm border border-eddy-200 bg-surface px-3.5 py-2 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
            >
              <option value="">เลือกสมาชิก</option>
              {accepted.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.isMe ? `${m.name} (คุณ)` : m.name}
                </option>
              ))}
            </select>
          </div>

          {assignError && (
            <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-xs text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">
              {assignError}
            </p>
          )}

          <Button type="submit" disabled={assigning || !title.trim() || !assigneeId}>
            {assigning ? 'กำลังมอบหมาย...' : 'มอบหมาย'}
          </Button>
        </form>
      </Modal>

      {/* ---- สมาชิก ---- */}
      <Card>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-sm font-bold text-ink">สมาชิก</h2>
          <span className="font-body text-xs text-ink-muted">{accepted.length} คน</span>
        </div>

        {accepted.length === 0 ? (
          <EmptyState mood="think" title="ยังไม่มีสมาชิก" description="เชิญเพื่อนเข้ากลุ่มได้จากปุ่ม &quot;เชิญสมาชิก&quot; ด้านบน" />
        ) : (
          <div className="mt-2 flex flex-col divide-y divide-eddy-100">
            {accepted.map((m) => (
              <MemberRow key={m.id} m={m} isOwnerView={group.isOwner} ownerId={group.ownerId} onRemove={removeMember} />
            ))}
          </div>
        )}

        {pending.length > 0 && (
          <div className="mt-3 rounded-clay-sm bg-eddy-50/70 p-2.5">
            <h3 className="font-display text-[11px] font-bold text-ink-soft">รอตอบรับ ({pending.length})</h3>
            <div className="mt-1 flex flex-col divide-y divide-eddy-100">
              {pending.map((m) => (
                <MemberRow key={m.id} m={m} isOwnerView={group.isOwner} ownerId={group.ownerId} onRemove={removeMember} pending />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ---- โซนอันตราย (ตั้งค่ากลุ่มย้ายไปเป็นปุ่มเฟืองมุมบนแล้ว) ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-clay border border-dashed border-eddy-200 px-4 py-3">
        <p className="font-body text-xs text-ink-muted">ลบกลุ่มแล้วสมาชิกทุกคนจะหลุดออกจากกลุ่ม และงานกลุ่มทั้งหมดจะหายไป</p>
        <button
          onClick={deleteGroup}
          className="flex items-center gap-1 rounded-full border border-pastel-pink-dark/40 px-3 py-1.5 font-display text-xs font-semibold text-eddy-700 dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark transition-colors hover:bg-pastel-pink/40"
        >
          <Trash2 size={14} /> ลบกลุ่ม
        </button>
      </div>

      <GroupSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        group={group}
        onSaved={() => {
          load();
          notifyGroupUpdated();
        }}
      />

      <Link
        href={`/groups/${params.id}`}
        className="flex w-fit items-center gap-1 font-body text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
      >
        ดูภาพรวมกลุ่ม (ที่สมาชิกทุกคนเห็น) <ChevronRight size={13} />
      </Link>
    </div>
  );
}

function StatTile({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'ok' | 'warn' }) {
  return (
    <div
      className={clsx(
        'rounded-clay border border-eddy-100 px-4 py-3 text-center',
        tone === 'warn' ? 'bg-pastel-yellow/60 dark:bg-pastel-yellow-dark/20' : tone === 'ok' ? 'bg-pastel-mint/60' : 'bg-surface',
      )}
    >
      <p className="font-display text-2xl font-bold leading-none text-ink">{value}</p>
      <p className="mt-1.5 font-body text-[11px] text-ink-muted">{label}</p>
    </div>
  );
}
