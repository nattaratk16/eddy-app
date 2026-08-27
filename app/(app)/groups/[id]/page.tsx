'use client';

/**
 * แท็บ "ภาพรวม" ของกลุ่ม
 * หัวกลุ่ม + แท็บ + ปุ่มเชิญ อยู่ใน layout.tsx แล้ว หน้านี้ดูแลแค่เนื้อหา:
 *   ซ้าย  = รายชื่อสมาชิก (+ คนที่รอตอบรับ)
 *   ขวา   = สถานะงานของกลุ่ม + ภาระงานสมาชิก
 *   ล่าง  = โซนอันตราย (ออกจากกลุ่ม / ลบกลุ่ม) - ย้ายลงมาจากมุมขวาบนเดิม
 *           เพราะเป็นปุ่มที่กดผิดแล้วเสียหาย ไม่ควรเด่นกว่าเนื้อหา
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Crown, ListChecks, LogOut, Sparkles, Trash2, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import WorkloadPanel from '@/components/groups/WorkloadPanel';
import { GROUP_UPDATED_EVENT, notifyGroupUpdated } from '@/lib/groupEvents';
import type { GroupInfo, GroupTaskInfo } from '@/lib/types';

export default function GroupOverviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [tasks, setTasks] = useState<GroupTaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const [gRes, tRes] = await Promise.all([
      fetch(`/api/groups/${params.id}`),
      fetch(`/api/groups/${params.id}/tasks`),
    ]);
    if (!gRes.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setGroup((await gRes.json()).group);
    if (tRes.ok) setTasks((await tRes.json()).tasks ?? []);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // เชิญสมาชิกจากปุ่มบนหัวกลุ่ม (อยู่ใน layout) -> โหลดรายชื่อใหม่
  useEffect(() => {
    const handler = () => load();
    window.addEventListener(GROUP_UPDATED_EVENT, handler);
    return () => window.removeEventListener(GROUP_UPDATED_EVENT, handler);
  }, [load]);

  async function removeMember(memberId: string) {
    if (!confirm('เอาสมาชิกคนนี้ออกจากกลุ่ม?')) return;
    await fetch(`/api/groups/${params.id}/members/${memberId}`, { method: 'DELETE' });
    load();
    notifyGroupUpdated();
  }

  async function leaveGroup() {
    const me = group?.members?.find((m) => m.isMe);
    if (!me) return;
    if (!confirm('ออกจากกลุ่มนี้?')) return;
    await fetch(`/api/groups/${params.id}/members/${me.id}`, { method: 'DELETE' });
    router.push('/groups');
  }

  async function deleteGroup() {
    if (!confirm('ลบกลุ่มนี้ถาวร? สมาชิกทุกคนจะออกจากกลุ่ม')) return;
    await fetch(`/api/groups/${params.id}`, { method: 'DELETE' });
    router.push('/groups');
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

  const members = group.members ?? [];
  const accepted = members.filter((m) => m.status === 'accepted');
  const pending = members.filter((m) => m.status === 'pending');

  const unassigned = tasks.filter((t) => !t.assignment).length;
  const waitingMe = tasks.filter((t) => t.assignment?.isMine && t.assignment.status === 'suggested').length;
  const onCalendar = tasks.filter((t) => t.assignment?.status === 'approved').length;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      {/* ---- สมาชิก ---- */}
      <Card>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-bold text-ink">สมาชิก</h2>
          <span className="font-body text-xs text-ink-muted">{accepted.length} คน</span>
        </div>

        <div className="mt-3 flex flex-col divide-y divide-eddy-100">
          {accepted.map((m) => (
            <MemberRow key={m.id} m={m} isOwnerView={group.isOwner} ownerId={group.ownerId} onRemove={removeMember} />
          ))}
        </div>

        {pending.length > 0 && (
          <div className="mt-5 rounded-clay-sm bg-eddy-50/70 p-3">
            <h3 className="flex items-center gap-1.5 font-display text-xs font-bold text-ink-soft">
              <Clock size={13} /> รอตอบรับคำเชิญ ({pending.length})
            </h3>
            <div className="mt-1 flex flex-col divide-y divide-eddy-100">
              {pending.map((m) => (
                <MemberRow
                  key={m.id}
                  m={m}
                  isOwnerView={group.isOwner}
                  ownerId={group.ownerId}
                  onRemove={removeMember}
                  pending
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ---- คอลัมน์ขวา: สถานะงาน + ภาระงาน ---- */}
      <div className="flex flex-col gap-5">
        <Card>
          <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-ink">
            <ListChecks size={16} className="text-eddy-500" /> งานกลุ่ม
          </h2>

          {tasks.length === 0 ? (
            <div className="mt-3">
              <p className="font-body text-xs text-ink-muted">ยังไม่มีงานในกลุ่มนี้</p>
              <Link
                href={`/groups/${params.id}/tasks`}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-clay-sm bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110"
              >
                <Sparkles size={14} /> เพิ่มงานแรก
              </Link>
            </div>
          ) : (
            <>
              <dl className="mt-3 flex flex-col gap-2">
                <StatRow label="ทั้งหมด" value={`${tasks.length} งาน`} />
                <StatRow label="ยังไม่ได้มอบหมาย" value={`${unassigned} งาน`} tone={unassigned > 0 ? 'warn' : 'muted'} />
                <StatRow label="ลงปฏิทินแล้ว" value={`${onCalendar} งาน`} tone="ok" />
              </dl>

              {waitingMe > 0 && (
                <Link
                  href={`/groups/${params.id}/tasks`}
                  className="mt-3 flex items-center gap-2 rounded-clay-sm bg-pastel-yellow/70 px-3 py-2 transition-colors hover:brightness-95"
                >
                  <UserCheck size={15} className="flex-shrink-0 text-eddy-700" />
                  <span className="font-body text-xs text-ink">
                    มี <b>{waitingMe} งาน</b> รอคุณกดยืนยันลงปฏิทิน
                  </span>
                </Link>
              )}
            </>
          )}
        </Card>

        <Card>
          <WorkloadPanel groupId={params.id} />
        </Card>
      </div>

      {/* ---- โซนอันตราย ---- */}
      <div className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-clay border border-dashed border-eddy-200 px-4 py-3">
          <p className="font-body text-xs text-ink-muted">
            {group.isOwner
              ? 'ลบกลุ่มแล้วสมาชิกทุกคนจะหลุดออกจากกลุ่ม และงานกลุ่มทั้งหมดจะหายไป'
              : 'ออกจากกลุ่มแล้วจะไม่เห็นตารางและงานของกลุ่มนี้อีก'}
          </p>
          {group.isOwner ? (
            <button
              onClick={deleteGroup}
              className="flex items-center gap-1 rounded-full border border-pastel-pink-dark/40 px-3 py-1.5 font-display text-xs font-semibold text-eddy-700 transition-colors hover:bg-pastel-pink/40"
            >
              <Trash2 size={14} /> ลบกลุ่ม
            </button>
          ) : (
            <button
              onClick={leaveGroup}
              className="flex items-center gap-1 rounded-full border border-eddy-200 px-3 py-1.5 font-display text-xs font-semibold text-ink-soft transition-colors hover:bg-eddy-50"
            >
              <LogOut size={14} /> ออกจากกลุ่ม
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, tone = 'muted' }: { label: string; value: string; tone?: 'muted' | 'ok' | 'warn' }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="font-body text-xs text-ink-muted">{label}</dt>
      <dd
        className={clsx(
          'font-display text-xs font-bold',
          tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-ink',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function MemberRow({
  m,
  isOwnerView,
  ownerId,
  onRemove,
  pending = false,
}: {
  m: NonNullable<GroupInfo['members']>[number];
  isOwnerView: boolean;
  ownerId: string;
  onRemove: (memberId: string) => void;
  pending?: boolean;
}) {
  const canRemove = (isOwnerView && m.userId !== ownerId) || m.isMe;
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      {m.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.image} alt={m.name} className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
      ) : (
        <span
          className={clsx(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white',
            pending ? 'bg-ink-muted' : 'bg-ink',
          )}
        >
          {m.name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-body text-sm font-semibold text-ink">
          {m.name}
          {m.isMe && (
            <span className="rounded-full bg-eddy-100 px-1.5 py-0.5 font-display text-[10px] font-semibold text-eddy-700">
              คุณ
            </span>
          )}
          {m.role === 'owner' && <Crown size={12} className="flex-shrink-0 text-amber-500" />}
        </p>
        <p className="truncate font-body text-xs text-ink-muted">{m.email}</p>
      </div>
      {pending && <span className="flex-shrink-0 font-body text-[11px] text-ink-muted">รอตอบรับ</span>}
      {canRemove && (
        <button
          onClick={() => onRemove(m.id)}
          aria-label={m.isMe ? 'ออกจากกลุ่ม' : `เอา ${m.name} ออกจากกลุ่ม`}
          className="flex-shrink-0 rounded-full p-1.5 text-ink-muted transition-colors hover:bg-pastel-pink/40 hover:text-eddy-700"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
