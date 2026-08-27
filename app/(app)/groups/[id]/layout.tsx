'use client';

/**
 * Layout ร่วมของทุกหน้าในกลุ่ม (ภาพรวม / ปฏิทินกลุ่ม / งานกลุ่ม)
 * --------------------------------------------------------------
 * เดิมแต่ละหน้ามีหัวข้อของตัวเองและต้องกด "← กลับไปกลุ่ม" ทุกครั้งที่จะสลับ
 * ทำให้ใช้งานยากและดูไม่เป็นชุดเดียวกัน
 *
 * ตอนนี้หัวกลุ่ม + แท็บอยู่ที่นี่ที่เดียว สลับหน้าได้ทันทีจากทุกแท็บ
 * และปุ่ม "เชิญสมาชิก" ใช้ได้จากทุกหน้า (เดิมอยู่แค่หน้าภาพรวม)
 * --------------------------------------------------------------
 */
import { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, CalendarDays, Crown, ListChecks, LayoutGrid, UserPlus, Users } from 'lucide-react';
import clsx from 'clsx';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { getColorOption } from '@/lib/colors';
import { GROUP_UPDATED_EVENT, notifyGroupUpdated } from '@/lib/groupEvents';
import type { GroupInfo } from '@/lib/types';

/** หน้าที่เปิดอยู่จะบอกจาก path ท้ายสุด */
const TABS = [
  { key: '', label: 'ภาพรวม', icon: LayoutGrid },
  { key: 'calendar', label: 'ปฏิทินกลุ่ม', icon: CalendarDays },
  { key: 'tasks', label: 'งานกลุ่ม', icon: ListChecks },
] as const;

export default function GroupLayout({ children, params }: { children: ReactNode; params: { id: string } }) {
  const pathname = usePathname();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [taskCount, setTaskCount] = useState<number | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [gRes, tRes] = await Promise.all([
      fetch(`/api/groups/${params.id}`),
      fetch(`/api/groups/${params.id}/tasks`),
    ]);
    if (gRes.ok) setGroup((await gRes.json()).group);
    if (tRes.ok) setTaskCount(((await tRes.json()).tasks ?? []).length);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // หน้าลูกแก้ข้อมูลกลุ่ม (เชิญ/เอาสมาชิกออก/เพิ่มงาน) -> ให้หัวกลุ่มอัปเดตตาม
  useEffect(() => {
    const handler = () => load();
    window.addEventListener(GROUP_UPDATED_EVENT, handler);
    return () => window.removeEventListener(GROUP_UPDATED_EVENT, handler);
  }, [load]);

  async function invite() {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    setInviteMsg(null);
    const res = await fetch(`/api/groups/${params.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setInviting(false);
    if (!res.ok) return setInviteMsg({ ok: false, text: data.error ?? 'เชิญไม่สำเร็จ' });
    setInviteMsg({ ok: true, text: `ส่งคำเชิญถึง ${email} แล้ว` });
    setInviteEmail('');
    load();
    notifyGroupUpdated();
  }

  const base = `/groups/${params.id}`;
  const current = pathname === base ? '' : pathname.slice(base.length + 1);
  const color = group ? getColorOption(group.color) : null;
  const accepted = (group?.members ?? []).filter((m) => m.status === 'accepted');
  const pendingCount = (group?.members ?? []).filter((m) => m.status === 'pending').length;

  return (
    <div className="px-4 pt-8 md:px-10">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1 font-body text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} /> กลุ่มทั้งหมด
      </Link>

      {/* ---- หัวกลุ่ม ---- */}
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <span
          className={clsx(
            'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-clay',
            color ? color.chipClass : 'bg-eddy-50',
          )}
        >
          <Users size={26} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight text-ink">
              {group?.name ?? 'กำลังโหลด...'}
            </h1>
            {group?.isOwner && (
              <span title="คุณเป็นเจ้าของกลุ่ม" className="flex-shrink-0">
                <Crown size={18} className="text-amber-500" />
              </span>
            )}
          </div>
          {group?.description && <p className="mt-0.5 font-body text-sm text-ink-muted">{group.description}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* กองรูปสมาชิก - เห็นได้ทันทีว่ามีใครอยู่ในกลุ่มบ้าง */}
          {accepted.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {accepted.slice(0, 4).map((m) =>
                  m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={m.id}
                      src={m.image}
                      alt={m.name}
                      title={m.name}
                      className="h-8 w-8 rounded-full border-2 border-white object-cover"
                    />
                  ) : (
                    <span
                      key={m.id}
                      title={m.name}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ink font-display text-xs font-bold text-white"
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  ),
                )}
                {accepted.length > 4 && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-eddy-100 font-display text-[10px] font-bold text-eddy-700">
                    +{accepted.length - 4}
                  </span>
                )}
              </div>
              <span className="font-body text-xs text-ink-muted">
                {accepted.length} สมาชิก{pendingCount > 0 ? ` · รอตอบรับ ${pendingCount}` : ''}
              </span>
            </div>
          )}

          <Button
            onClick={() => {
              setInviteMsg(null);
              setInviteOpen(true);
            }}
            className="!rounded-full !px-4 !py-2"
          >
            <span className="flex items-center gap-1.5 font-display text-caption">
              <UserPlus size={15} /> เชิญสมาชิก
            </span>
          </Button>
        </div>
      </div>

      {/* ---- แท็บ ---- */}
      <div className="mt-5 flex items-center gap-1 overflow-x-auto border-b border-eddy-100">
        {TABS.map((tab) => {
          const active = current === tab.key;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.key ? `${base}/${tab.key}` : base}
              className={clsx(
                '-mb-px flex flex-shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 font-display text-caption font-semibold transition-colors',
                active
                  ? 'border-eddy-500 text-eddy-700'
                  : 'border-transparent text-ink-muted hover:border-eddy-200 hover:text-ink',
              )}
            >
              <Icon size={15} /> {tab.label}
              {tab.key === 'tasks' && taskCount !== null && taskCount > 0 && (
                <span
                  className={clsx(
                    'ml-0.5 rounded-full px-1.5 py-0.5 font-display text-[10px] font-bold',
                    active ? 'bg-eddy-100 text-eddy-700' : 'bg-eddy-50 text-ink-muted',
                  )}
                >
                  {taskCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="pb-10 pt-6">{children}</div>

      {/* ---- เชิญสมาชิก (ใช้ได้จากทุกแท็บ) ---- */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="เชิญสมาชิก" maxWidth="max-w-md">
        <p className="font-body text-sm text-ink-muted">กรอกอีเมลของเพื่อน (เพื่อนต้องมีบัญชี EDDY อยู่แล้ว)</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && invite()}
            placeholder="friend@example.com"
            autoFocus
            className="flex-1 rounded-clay-sm border border-eddy-200 bg-white px-4 py-2.5 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
          />
          <Button onClick={invite} disabled={inviting} className="!py-2.5">
            <span className="flex items-center justify-center gap-1.5">
              <UserPlus size={16} /> {inviting ? 'กำลังเชิญ...' : 'เชิญ'}
            </span>
          </Button>
        </div>
        {inviteMsg && (
          <p
            className={clsx(
              'mt-3 rounded-clay-sm px-3 py-2 font-body text-xs',
              inviteMsg.ok ? 'bg-pastel-mint/60 text-ink' : 'bg-pastel-pink/60 text-eddy-700',
            )}
          >
            {inviteMsg.text}
          </p>
        )}
      </Modal>
    </div>
  );
}
