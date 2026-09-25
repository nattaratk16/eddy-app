'use client';

/**
 * แท็บ "ภาพรวม" ของกลุ่ม
 * หัวกลุ่ม + แท็บ + ปุ่มเชิญ อยู่ใน layout.tsx แล้ว หน้านี้ดูแลแค่เนื้อหา:
 *   ซ้าย  = รายชื่อสมาชิก (+ คนที่รอตอบรับ)
 *   ขวา   = สถานะงานของกลุ่ม + ภาระงานสมาชิก
 *   ล่าง  = โซนอันตราย (ออกจากกลุ่ม / ลบกลุ่ม) - ย้ายลงมาจากมุมขวาบนเดิม
 *           เพราะเป็นปุ่มที่กดผิดแล้วเสียหาย ไม่ควรเด่นกว่าเนื้อหา
 */
import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Crown, ListChecks, LogOut, Sparkles, Trash2, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import WorkloadPanel from '@/components/groups/WorkloadPanel';
import WorkloadTrendChart from '@/components/groups/WorkloadTrendChart';
import { GROUP_UPDATED_EVENT, notifyGroupUpdated } from '@/lib/groupEvents';
import type { GroupInfo, GroupTaskInfo } from '@/lib/types';

export default function GroupOverviewPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [tasks, setTasks] = useState<GroupTaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [gRes, tRes] = await Promise.all([
        fetch(`/api/groups/${params.id}`),
        fetch(`/api/groups/${params.id}/tasks`),
      ]);
      if (!gRes.ok) {
        setNotFound(true);
        return;
      }
      setGroup((await gRes.json()).group);
      if (tRes.ok) setTasks((await tRes.json()).tasks ?? []);
    } catch {
      // เน็ตหลุด/เซิร์ฟเวอร์พัง - ไม่งั้น "กำลังโหลด..." จะค้างตลอดไป (บั๊กเดียวกับที่แก้ไปแล้วในหน้ารวมกลุ่ม)
      setLoadError(true);
    } finally {
      setLoading(false);
    }
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
  if (loadError)
    return (
      <EmptyState
        size="full"
        mood="think"
        title="โหลดข้อมูลกลุ่มไม่สำเร็จ"
        description="เชื่อมต่อไม่ได้ ลองใหม่อีกครั้งนะ"
        action={{ label: 'ลองใหม่', icon: <ArrowRight size={16} />, onClick: load }}
      />
    );
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
      {/* ---- คอลัมน์หลัก: สิ่งที่ต้องดูจริงๆ ของกลุ่ม ---- */}
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-ink">
              <ListChecks size={17} className="text-eddy-500" /> งานกลุ่ม
            </h2>
            <Link
              href={`/groups/${params.id}/tasks`}
              className="flex items-center gap-1 font-body text-xs font-semibold text-eddy-600 transition-colors hover:underline"
            >
              จัดการงานกลุ่ม <ArrowRight size={13} />
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="font-body text-sm text-ink-muted">ยังไม่มีงานในกลุ่มนี้</p>
              <Link
                href={`/groups/${params.id}/tasks`}
                className="flex items-center gap-1.5 rounded-clay-sm bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110"
              >
                <Sparkles size={14} /> เพิ่มงานแรก
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <BigStat label="งานทั้งหมด" value={tasks.length} />
                <BigStat label="ยังไม่ได้มอบหมาย" value={unassigned} tone={unassigned > 0 ? 'warn' : 'default'} />
                <BigStat label="ลงปฏิทินแล้ว" value={onCalendar} tone={onCalendar > 0 ? 'ok' : 'default'} />
              </div>

              {waitingMe > 0 && (
                <Link
                  href={`/groups/${params.id}/tasks`}
                  className="mt-4 flex items-center gap-2.5 rounded-clay-sm bg-pastel-yellow/70 dark:bg-pastel-yellow-dark/20 px-4 py-3 transition-colors hover:brightness-95"
                >
                  <UserCheck size={18} className="flex-shrink-0 text-eddy-700" />
                  <span className="min-w-0 flex-1 font-body text-sm text-ink">
                    มี <b>{waitingMe} งาน</b> รอคุณกดยืนยันลงปฏิทิน
                  </span>
                  <ArrowRight size={16} className="flex-shrink-0 text-ink-muted" />
                </Link>
              )}
            </>
          )}
        </Card>

        {/* กราฟภาระงาน - หัวใจของระบบกลุ่ม ให้พื้นที่ใหญ่สุด */}
        <Card>
          <WorkloadPanel groupId={params.id} />
        </Card>

        {/* กราฟเส้นแยกต่างหาก - ภาพรวมเฉลี่ยทั้งกลุ่มรายวัน คนละมุมกับกราฟแท่งรายคนด้านบน */}
        <Card>
          <WorkloadTrendChart groupId={params.id} />
        </Card>
      </div>

      {/* ---- คอลัมน์ขวา: รายชื่อสมาชิกแบบย่อ ---- */}
      <div className="flex flex-col gap-5">
        <Card className="!p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-ink">สมาชิก</h2>
            <span className="font-body text-xs text-ink-muted">{accepted.length} คน</span>
          </div>

          <div className="mt-2 flex flex-col divide-y divide-eddy-100">
            {accepted.map((m) => (
              <MemberRow key={m.id} m={m} isOwnerView={group.isOwner} ownerId={group.ownerId} onRemove={removeMember} />
            ))}
          </div>

          {pending.length > 0 && (
            <div className="mt-3 rounded-clay-sm bg-eddy-50/70 p-2.5">
              <h3 className="flex items-center gap-1.5 font-display text-[11px] font-bold text-ink-soft">
                <Clock size={12} /> รอตอบรับ ({pending.length})
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
              className="flex items-center gap-1 rounded-full border border-pastel-pink-dark/40 px-3 py-1.5 font-display text-xs font-semibold text-eddy-700 dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark transition-colors hover:bg-pastel-pink/40"
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

/** ตัวเลขใหญ่ในการ์ดงานกลุ่ม */
function BigStat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'ok' | 'warn' }) {
  return (
    <div
      className={clsx(
        'rounded-clay-sm px-3 py-3 text-center',
        tone === 'warn' ? 'bg-pastel-yellow/60 dark:bg-pastel-yellow-dark/20' : tone === 'ok' ? 'bg-pastel-mint/60' : 'bg-eddy-50',
      )}
    >
      <p className="font-display text-2xl font-bold leading-none text-ink">{value}</p>
      <p className="mt-1.5 font-body text-[11px] text-ink-muted">{label}</p>
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
    <div className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
      {m.image ? (
        <Image src={m.image} alt={m.name} width={32} height={32} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
      ) : (
        <span
          className={clsx(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-xs font-bold text-white',
            pending ? 'bg-ink-muted' : 'bg-inverse',
          )}
        >
          {m.name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate font-body text-xs font-semibold text-ink">
          <span className="truncate">{m.name}</span>
          {m.isMe && <span className="flex-shrink-0 font-normal text-ink-muted">(คุณ)</span>}
          {m.role === 'owner' && <Crown size={11} className="flex-shrink-0 text-amber-500" />}
        </p>
        {/* คอลัมน์แคบ - อีเมลยาวกว่าชื่อมาก แสดงเฉพาะคนที่ยังไม่ตอบรับ (ใช้ระบุตัวว่าเชิญใครไป) */}
        {pending && <p className="truncate font-body text-[11px] text-ink-muted">{m.email}</p>}
      </div>
      {canRemove && (
        <button
          onClick={() => onRemove(m.id)}
          aria-label={m.isMe ? 'ออกจากกลุ่ม' : `เอา ${m.name} ออกจากกลุ่ม`}
          className="flex-shrink-0 rounded-full p-1 text-ink-muted dark:bg-pastel-pink-dark/15 transition-colors hover:bg-pastel-pink/40 hover:text-chip-ink"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
