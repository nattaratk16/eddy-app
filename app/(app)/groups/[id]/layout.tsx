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
import { ReactNode, useCallback, useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, CalendarDays, Check, Copy, Crown, ListChecks, LayoutGrid, RefreshCw, UserPlus, Users } from 'lucide-react';
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

export default function GroupLayout(props: { children: ReactNode; params: Promise<{ id: string }> }) {
  const params = use(props.params);

  const {
    children
  } = props;

  const pathname = usePathname();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [taskCount, setTaskCount] = useState<number | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // รหัสให้เพื่อนเข้าร่วมเอง (กลุ่มเก่าที่ยังไม่มีรหัส จะสร้างให้ตอนเปิด modal ครั้งแรก)
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [copied, setCopied] = useState(false);
  // จำว่าเคยขอรหัสให้กลุ่มนี้ไปแล้ว - กันยิงซ้ำไม่รู้จบตอนเซิร์ฟเวอร์ตอบ error
  const codeRequestedFor = useRef<string | null>(null);

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

  // อัปเดตรหัสจากข้อมูลกลุ่ม แต่ห้ามล้างรหัสที่เพิ่งสร้างไปทิ้ง
  // (ข้อมูลกลุ่มที่โหลดมาก่อนหน้าอาจยังไม่มีรหัส)
  useEffect(() => {
    if (group?.joinCode) setJoinCode(group.joinCode);
  }, [group?.joinCode]);

  // เปิด modal แล้วยังไม่มีรหัส (กลุ่มที่สร้างก่อนมีฟีเจอร์นี้) -> ขอให้เซิร์ฟเวอร์สร้างให้ "ครั้งเดียว"
  useEffect(() => {
    if (!inviteOpen || joinCode || codeRequestedFor.current === params.id) return;
    codeRequestedFor.current = params.id;
    setCodeBusy(true);
    setCodeError('');
    fetch(`/api/groups/${params.id}/join-code`, { method: 'POST' })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.joinCode) throw new Error(data?.error ?? 'สร้างรหัสกลุ่มไม่สำเร็จ');
        setJoinCode(data.joinCode);
      })
      .catch((err: Error) => setCodeError(err.message))
      .finally(() => setCodeBusy(false));
  }, [inviteOpen, joinCode, params.id]);

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

  async function copyCode() {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // เบราว์เซอร์ไม่ให้เขียนคลิปบอร์ด (เช่นไม่ใช่ https) - ผู้ใช้ยังคัดลอกเองได้จากรหัสที่แสดงอยู่
    }
  }

  /** ขอรหัสใหม่ - ใช้ทั้งปุ่ม "เปลี่ยนรหัสใหม่" และปุ่มลองใหม่ตอนสร้างรหัสไม่สำเร็จ */
  async function requestCode(regenerate: boolean) {
    if (codeBusy) return;
    if (regenerate && !confirm('เปลี่ยนรหัสใหม่? รหัสเดิมจะใช้เข้ากลุ่มไม่ได้อีก')) return;
    setCodeBusy(true);
    setCodeError('');
    try {
      const res = await fetch(`/api/groups/${params.id}/join-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.joinCode) throw new Error(data?.error ?? 'ขอรหัสกลุ่มไม่สำเร็จ');
      setJoinCode(data.joinCode);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'ขอรหัสกลุ่มไม่สำเร็จ');
    } finally {
      setCodeBusy(false);
    }
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
                      className="h-8 w-8 rounded-full border-2 border-surface object-cover"
                    />
                  ) : (
                    <span
                      key={m.id}
                      title={m.name}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-inverse font-display text-xs font-bold text-white"
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  ),
                )}
                {accepted.length > 4 && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-eddy-100 font-display text-[10px] font-bold text-eddy-700">
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
        {/* วิธีที่ 1: ส่งรหัสให้เพื่อนกรอกเอง - ง่ายกว่าเพราะไม่ต้องรู้อีเมลของเพื่อน */}
        <div className="rounded-clay-sm bg-eddy-50 p-4">
          <p className="font-display text-xs font-semibold text-ink-soft">รหัสกลุ่ม</p>
          <p className="mt-0.5 font-body text-[11px] text-ink-muted">
            ส่งรหัสนี้ให้เพื่อน แล้วให้กด &quot;เข้าร่วมกลุ่ม&quot; ในหน้ากลุ่ม
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex-1 rounded-clay-sm bg-surface px-4 py-2.5 text-center font-display text-xl font-bold tracking-[0.3em] text-ink">
              {joinCode ?? (codeBusy ? '••••••' : '—')}
            </span>
            <button
              onClick={copyCode}
              disabled={!joinCode}
              aria-label="คัดลอกรหัสกลุ่ม"
              className="flex items-center gap-1 rounded-clay-sm bg-inverse px-3 py-2.5 font-display text-xs font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
          </div>
          {codeError ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="font-body text-[11px] text-eddy-700">{codeError}</p>
              <button
                onClick={() => requestCode(false)}
                disabled={codeBusy}
                className="flex items-center gap-1 font-body text-[11px] font-semibold text-eddy-600 transition-colors hover:underline disabled:opacity-50"
              >
                <RefreshCw size={11} /> ลองอีกครั้ง
              </button>
            </div>
          ) : (
            group?.isOwner &&
            joinCode && (
              <button
                onClick={() => requestCode(true)}
                disabled={codeBusy}
                className="mt-2 flex items-center gap-1 font-body text-[11px] font-semibold text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
              >
                <RefreshCw size={11} /> เปลี่ยนรหัสใหม่
              </button>
            )
          )}
        </div>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-eddy-100" />
          <span className="font-body text-[11px] text-ink-muted">หรือเชิญด้วยอีเมล</span>
          <span className="h-px flex-1 bg-eddy-100" />
        </div>

        <p className="font-body text-sm text-ink-muted">กรอกอีเมลของเพื่อน (เพื่อนต้องมีบัญชี EDDY อยู่แล้ว)</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && invite()}
            placeholder="friend@example.com"
            autoFocus
            className="flex-1 rounded-clay-sm border border-eddy-200 bg-surface px-4 py-2.5 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
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
              inviteMsg.ok
                ? 'bg-pastel-mint/60 text-ink dark:bg-pastel-mint-dark/20 dark:text-pastel-mint-dark'
                : 'bg-pastel-pink/60 text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark',
            )}
          >
            {inviteMsg.text}
          </p>
        )}
      </Modal>
    </div>
  );
}
