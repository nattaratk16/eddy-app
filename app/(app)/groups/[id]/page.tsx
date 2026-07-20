'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Crown, ArrowLeft, UserPlus, Trash2, LogOut, Clock, CalendarDays, ListChecks, ChevronRight } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { getColorOption } from '@/lib/colors';
import type { GroupInfo } from '@/lib/types';

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const res = await fetch(`/api/groups/${params.id}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setGroup(data.group);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

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
  }

  async function removeMember(memberId: string) {
    if (!confirm('เอาสมาชิกคนนี้ออกจากกลุ่ม?')) return;
    await fetch(`/api/groups/${params.id}/members/${memberId}`, { method: 'DELETE' });
    load();
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

  if (loading) return <div className="px-4 py-16 text-center font-body text-sm text-ink-muted md:px-10">กำลังโหลด...</div>;
  if (notFound || !group)
    return (
      <div className="px-4 py-16 text-center md:px-10">
        <p className="font-display text-lg font-bold text-ink">ไม่พบกลุ่มนี้</p>
        <Link href="/groups" className="mt-3 inline-block font-body text-sm font-semibold text-eddy-600">← กลับไปหน้ากลุ่ม</Link>
      </div>
    );

  const c = getColorOption(group.color);
  const members = group.members ?? [];
  const accepted = members.filter((m) => m.status === 'accepted');
  const pending = members.filter((m) => m.status === 'pending');

  return (
    <div className="px-4 pt-8 md:px-10">
      <Link href="/groups" className="mb-4 inline-flex items-center gap-1 font-body text-sm font-semibold text-ink-soft transition-colors hover:text-ink">
        <ArrowLeft size={16} /> กลุ่มทั้งหมด
      </Link>

      {/* หัวกลุ่ม */}
      <div className="flex items-start gap-4">
        <span className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-clay ${c.chipClass}`}>
          <Users size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight text-ink">{group.name}</h1>
            {group.isOwner && <Crown size={18} className="flex-shrink-0 text-amber-500" />}
          </div>
          {group.description && <p className="mt-0.5 font-body text-sm text-ink-muted">{group.description}</p>}
          <p className="mt-1 font-body text-xs text-ink-muted">{accepted.length} สมาชิก</p>
        </div>
        {group.isOwner ? (
          <button onClick={deleteGroup} className="flex items-center gap-1 rounded-full border border-pastel-pink-dark/40 px-3 py-2 font-display text-xs font-semibold text-eddy-700 transition-colors hover:bg-pastel-pink/40">
            <Trash2 size={14} /> ลบกลุ่ม
          </button>
        ) : (
          <button onClick={leaveGroup} className="flex items-center gap-1 rounded-full border border-eddy-200 px-3 py-2 font-display text-xs font-semibold text-ink-soft transition-colors hover:bg-eddy-50">
            <LogOut size={14} /> ออกจากกลุ่ม
          </button>
        )}
      </div>

      {/* เกริ่นฟีเจอร์ที่กำลังจะมา (3b/3c) */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href={`/groups/${params.id}/calendar`} className="flex items-center gap-3 rounded-clay border border-eddy-100 bg-white p-4 transition-colors hover:border-eddy-300">
          <span className="flex h-10 w-10 items-center justify-center rounded-clay-sm bg-pastel-blue text-eddy-700"><CalendarDays size={20} /></span>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-ink">ปฏิทินกลุ่ม</p>
            <p className="font-body text-xs text-ink-muted">ดูตารางของสมาชิกร่วมกัน</p>
          </div>
          <ChevronRight size={18} className="ml-auto flex-shrink-0 text-ink-muted" />
        </Link>
        <Link href={`/groups/${params.id}/tasks`} className="flex items-center gap-3 rounded-clay border border-eddy-100 bg-white p-4 transition-colors hover:border-eddy-300">
          <span className="flex h-10 w-10 items-center justify-center rounded-clay-sm bg-pastel-lilac text-eddy-700"><ListChecks size={20} /></span>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-ink">งานกลุ่ม + AI จัดเวลา</p>
            <p className="font-body text-xs text-ink-muted">ให้เอ็ดดี้หาเวลาว่างตรงกัน</p>
          </div>
          <ChevronRight size={18} className="ml-auto flex-shrink-0 text-ink-muted" />
        </Link>
      </div>

      {/* เชิญสมาชิก */}
      <Card className="mt-6">
        <h2 className="font-display text-base font-bold text-ink">เชิญสมาชิก</h2>
        <p className="mt-0.5 font-body text-xs text-ink-muted">กรอกอีเมลของเพื่อน (เพื่อนต้องมีบัญชี EDDY)</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && invite()}
            placeholder="friend@example.com"
            className="flex-1 rounded-full border border-eddy-200 bg-white px-4 py-2.5 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
          />
          <Button onClick={invite} disabled={inviting} className="!py-2.5">
            <span className="flex items-center justify-center gap-1.5">
              <UserPlus size={16} /> {inviting ? 'กำลังเชิญ...' : 'เชิญ'}
            </span>
          </Button>
        </div>
        {inviteMsg && (
          <p className={`mt-2 font-body text-xs ${inviteMsg.ok ? 'text-emerald-600' : 'text-eddy-700'}`}>{inviteMsg.text}</p>
        )}
      </Card>

      {/* รายชื่อสมาชิก */}
      <Card className="mt-4">
        <h2 className="font-display text-base font-bold text-ink">สมาชิก ({accepted.length})</h2>
        <div className="mt-3 flex flex-col divide-y divide-eddy-100">
          {accepted.map((m) => (
            <MemberRow key={m.id} m={m} isOwnerView={group.isOwner} ownerId={group.ownerId} onRemove={removeMember} />
          ))}
        </div>

        {pending.length > 0 && (
          <>
            <h3 className="mt-5 flex items-center gap-1.5 font-display text-sm font-bold text-ink-soft">
              <Clock size={14} /> รอตอบรับ ({pending.length})
            </h3>
            <div className="mt-2 flex flex-col divide-y divide-eddy-100">
              {pending.map((m) => (
                <MemberRow key={m.id} m={m} isOwnerView={group.isOwner} ownerId={group.ownerId} onRemove={removeMember} pending />
              ))}
            </div>
          </>
        )}
      </Card>
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
  const initial = m.name.charAt(0).toUpperCase();
  const canRemove = (isOwnerView && m.userId !== ownerId) || m.isMe;
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      {m.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.image} alt={m.name} className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <span className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold text-white ${pending ? 'bg-ink-muted' : 'bg-ink'}`}>
          {initial}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-body text-sm font-semibold text-ink">
          {m.name}
          {m.isMe && <span className="rounded-full bg-eddy-100 px-1.5 py-0.5 text-[10px] font-semibold text-eddy-700">คุณ</span>}
          {m.role === 'owner' && <Crown size={12} className="text-amber-500" />}
        </p>
        <p className="truncate font-body text-xs text-ink-muted">{m.email}</p>
      </div>
      {pending && <span className="font-body text-xs text-ink-muted">รอตอบรับ</span>}
      {canRemove && (
        <button
          onClick={() => onRemove(m.id)}
          aria-label="เอาออก"
          className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-pastel-pink/40 hover:text-eddy-700"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
