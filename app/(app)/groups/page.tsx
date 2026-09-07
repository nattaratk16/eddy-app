'use client';

/**
 * หน้ารวมกลุ่ม
 * --------------------------------------------------------------
 * เดิมมีแค่ปุ่ม "สร้างกลุ่ม" กับรายการการ์ด ซึ่งเข้ากลุ่มได้ทางเดียวคือรอคนอื่นเชิญ
 * ตอนนี้เพิ่ม "เข้าร่วมกลุ่มด้วยรหัส" และเติมข้อมูลที่ใช้ตัดสินใจได้จริงลงหน้านี้:
 * สถิติรวม, งานที่รอเรายืนยันข้ามทุกกลุ่ม, และการ์ดกลุ่มที่บอกสถานะในตัว
 * --------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Crown,
  KeyRound,
  ListChecks,
  Plus,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Reveal from '@/components/motion/Reveal';
import EddyMascot from '@/components/EddyMascot';
import EmptyState from '@/components/EmptyState';
import { PASTEL_COLORS, getColorOption } from '@/lib/colors';
import type { GroupInfo, GroupInvitation, PastelColor } from '@/lib/types';

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // สร้างกลุ่ม
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<PastelColor>('blue');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // เข้าร่วมกลุ่มด้วยรหัส
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinedName, setJoinedName] = useState('');

  async function load() {
    const [gRes, iRes] = await Promise.all([fetch('/api/groups'), fetch('/api/groups/invitations')]);
    const gData = await gRes.json();
    const iData = await iRes.json();
    setGroups(gData.groups ?? []);
    setInvitations(iData.invitations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createGroup() {
    if (!name.trim()) return setError('กรุณาตั้งชื่อกลุ่ม');
    setSaving(true);
    setError('');
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, color }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error ?? 'สร้างกลุ่มไม่สำเร็จ');
    setGroups((prev) => [data.group, ...prev]);
    setCreating(false);
    setName('');
    setDescription('');
    setColor('blue');
  }

  async function joinGroup() {
    const code = joinCode.trim();
    if (!code) return setJoinError('กรุณากรอกรหัสกลุ่ม');
    setJoinBusy(true);
    setJoinError('');
    setJoinedName('');
    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setJoinBusy(false);
    if (!res.ok) return setJoinError(data.error ?? 'เข้าร่วมกลุ่มไม่สำเร็จ');
    setJoinedName(data.alreadyMember ? `คุณอยู่ในกลุ่ม "${data.group.name}" อยู่แล้ว` : `เข้าร่วมกลุ่ม "${data.group.name}" แล้ว!`);
    setJoinCode('');
    load();
  }

  async function respond(inv: GroupInvitation, accept: boolean) {
    setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
    await fetch(`/api/groups/${inv.groupId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    });
    if (accept) load();
  }

  const totalTasks = groups.reduce((sum, g) => sum + (g.taskCount ?? 0), 0);
  const totalWaiting = groups.reduce((sum, g) => sum + (g.waitingForMeCount ?? 0), 0);
  const ownedCount = groups.filter((g) => g.isOwner).length;
  const waitingGroups = groups.filter((g) => (g.waitingForMeCount ?? 0) > 0);

  return (
    <div className="px-4 pb-10 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-8">
        <div>
          <h1 className="font-display text-h1 text-ink">กลุ่ม</h1>
          <p className="mt-0.5 font-body text-body text-ink-muted">แชร์ตาราง วางแผนงาน และให้เอ็ดดี้จัดเวลาให้ทั้งทีม</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setJoinError('');
              setJoinedName('');
              setJoining(true);
            }}
            className="flex items-center gap-1.5 rounded-full border border-eddy-200 bg-surface px-4 py-2.5 font-display text-caption font-semibold text-ink-soft transition-colors hover:bg-eddy-50"
          >
            <KeyRound size={16} /> เข้าร่วมกลุ่ม
          </button>
          <Button
            onClick={() => setCreating(true)}
            className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 !px-5 !py-2.5 hover:!brightness-110"
          >
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> สร้างกลุ่ม
            </span>
          </Button>
        </div>
      </div>

      {/* ---- แถบสรุป + เกริ่นว่ากลุ่มทำอะไรได้ ---- */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="relative overflow-hidden !bg-gradient-to-br !from-eddy-50 !to-pastel-lilac/40">
          <div className="flex items-start gap-4">
            <EddyMascot mood="happy" size={64} />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-h3 text-ink">ทำงานเป็นทีมกับเอ็ดดี้</h2>
              <ul className="mt-2 flex flex-col gap-1.5 font-body text-xs text-ink-soft">
                <li className="flex items-start gap-1.5">
                  <Sparkles size={13} className="mt-0.5 flex-shrink-0 text-eddy-500" />
                  เอ็ดดี้หาเวลาว่างที่ตรงกันของทุกคน แล้วกระจายงานตามภาระงานจริงของแต่ละคน
                </li>
                <li className="flex items-start gap-1.5">
                  <Users size={13} className="mt-0.5 flex-shrink-0 text-eddy-500" />
                  เห็นตารางของสมาชิกซ้อนกันในปฏิทินเดียว โดยเลือกได้ว่าจะเปิดเผยแค่ไหน
                </li>
                <li className="flex items-start gap-1.5">
                  <KeyRound size={13} className="mt-0.5 flex-shrink-0 text-eddy-500" />
                  ชวนเพื่อนด้วยอีเมล หรือส่ง &quot;รหัสกลุ่ม&quot; ให้เพื่อนเข้าร่วมเองก็ได้
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="กลุ่มของคุณ" value={groups.length} hint={ownedCount > 0 ? `เป็นเจ้าของ ${ownedCount}` : undefined} />
          <StatCard label="งานกลุ่มทั้งหมด" value={totalTasks} />
          <StatCard label="รอคุณยืนยัน" value={totalWaiting} tone={totalWaiting > 0 ? 'warn' : 'default'} />
          <StatCard label="คำเชิญใหม่" value={invitations.length} tone={invitations.length > 0 ? 'accent' : 'default'} />
        </div>
      </section>

      {/* ---- คำเชิญที่รอตอบรับ ---- */}
      {invitations.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-h3 text-ink">คำเชิญเข้ากลุ่ม ({invitations.length})</h2>
          <div className="flex flex-col gap-3">
            {invitations.map((inv) => {
              const c = getColorOption(inv.groupColor);
              return (
                <Reveal key={inv.id}>
                  <Card className="flex flex-wrap items-center gap-3 !p-4">
                    <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${c.chipClass}`}>
                      <Users size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold text-ink">{inv.groupName}</p>
                      <p className="truncate font-body text-xs text-ink-muted">
                        {inv.invitedByName ? `${inv.invitedByName} ชวนคุณ · ` : ''}
                        {inv.memberCount} สมาชิก
                      </p>
                    </div>
                    <button
                      onClick={() => respond(inv, true)}
                      className="flex items-center gap-1 rounded-full bg-inverse px-3 py-1.5 font-display text-xs font-semibold text-white transition-colors hover:bg-black"
                    >
                      <Check size={14} /> รับคำเชิญ
                    </button>
                    <button
                      onClick={() => respond(inv, false)}
                      className="flex items-center gap-1 rounded-full border border-eddy-200 px-3 py-1.5 font-display text-xs font-semibold text-ink-soft transition-colors hover:bg-eddy-50"
                    >
                      <X size={14} /> ปฏิเสธ
                    </button>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- งานที่รอเรายืนยัน (ข้ามทุกกลุ่ม) ---- */}
      {waitingGroups.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-1.5 font-display text-h3 text-ink">
            <UserCheck size={18} className="text-eddy-500" /> รอคุณยืนยัน
          </h2>
          <div className="flex flex-col gap-2">
            {waitingGroups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}/tasks`}
                className="flex items-center gap-3 rounded-clay border border-eddy-100 bg-pastel-yellow/40 px-4 py-3 transition-colors hover:border-eddy-300"
              >
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${getColorOption(g.color).dotClass}`} />
                <span className="min-w-0 flex-1 truncate font-body text-sm text-ink">
                  <b>{g.waitingForMeCount} งาน</b> ในกลุ่ม {g.name} รอให้คุณกดยืนยันลงปฏิทิน
                </span>
                <ArrowRight size={16} className="flex-shrink-0 text-ink-muted" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---- รายการกลุ่ม ---- */}
      <section className="mt-8">
        <h2 className="mb-3 font-display text-h3 text-ink">กลุ่มทั้งหมด</h2>
        {loading ? (
          <p className="py-10 text-center font-body text-sm text-ink-muted">กำลังโหลด...</p>
        ) : groups.length === 0 ? (
          <EmptyState
            size="full"
            mood="think"
            title="ยังไม่มีกลุ่ม"
            description='สร้างกลุ่มแล้วชวนเพื่อนมาแชร์ตาราง หรือถ้าเพื่อนส่งรหัสกลุ่มมาให้ ก็กด "เข้าร่วมกลุ่ม" ได้เลย'
            action={{ label: 'สร้างกลุ่ม', icon: <Plus size={16} />, onClick: () => setCreating(true) }}
            secondaryAction={{ label: 'เข้าร่วมด้วยรหัส', icon: <KeyRound size={16} />, onClick: () => setJoining(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g, i) => (
              <Reveal key={g.id} delay={i * 0.05} hover>
                <GroupCard group={g} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ---- Modal สร้างกลุ่ม ---- */}
      <Modal open={creating} onClose={() => setCreating(false)} title="สร้างกลุ่มใหม่" maxWidth="max-w-md">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-display text-sm font-semibold text-ink-soft">ชื่อกลุ่ม</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น กลุ่มโปรเจกต์ Capstone"
              className="w-full rounded-clay-sm border border-eddy-200 bg-surface px-4 py-2.5 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block font-display text-sm font-semibold text-ink-soft">รายละเอียด (ไม่บังคับ)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="กลุ่มนี้เกี่ยวกับอะไร"
              className="w-full rounded-clay-sm border border-eddy-200 bg-surface px-4 py-2.5 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-display text-sm font-semibold text-ink-soft">สีประจำกลุ่ม</label>
            <div className="flex flex-wrap gap-2">
              {PASTEL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  aria-label={c.label}
                  className={`h-7 w-7 rounded-full ${c.swatchClass} ${
                    color === c.value ? 'scale-110 ring-2 ring-eddy-500 ring-offset-2' : ''
                  }`}
                />
              ))}
            </div>
          </div>
          {error && <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-sm text-eddy-700 dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">{error}</p>}
          <div className="mt-1 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={createGroup}
              disabled={saving}
              className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 hover:!brightness-110"
            >
              {saving ? 'กำลังสร้าง...' : 'สร้างกลุ่ม'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---- Modal เข้าร่วมกลุ่มด้วยรหัส ---- */}
      <Modal open={joining} onClose={() => setJoining(false)} title="เข้าร่วมกลุ่ม" maxWidth="max-w-md">
        <p className="font-body text-sm text-ink-muted">
          กรอกรหัสกลุ่ม 6 ตัวที่เพื่อนส่งมาให้ (หารหัสได้ที่ปุ่ม &quot;เชิญสมาชิก&quot; ในหน้ากลุ่มนั้น)
        </p>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && joinGroup()}
          placeholder="เช่น K7M2QD"
          maxLength={8}
          autoFocus
          className="mt-3 w-full rounded-clay-sm border border-eddy-200 bg-surface px-4 py-3 text-center font-display text-xl font-bold uppercase tracking-[0.3em] text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
        />
        {joinError && (
          <p className="mt-3 rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-xs text-eddy-700">{joinError}</p>
        )}
        {joinedName && (
          <p className="mt-3 rounded-clay-sm bg-pastel-mint/60 px-3 py-2 font-body text-xs text-ink dark:bg-pastel-mint-dark/20 dark:text-pastel-mint-dark">{joinedName}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setJoining(false)}>
            ปิด
          </Button>
          <Button onClick={joinGroup} disabled={joinBusy || !joinCode.trim()}>
            <span className="flex items-center gap-1.5">
              <KeyRound size={16} /> {joinBusy ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
            </span>
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: 'default' | 'warn' | 'accent';
}) {
  return (
    <div
      className={clsx(
        'flex flex-col justify-center rounded-clay border px-4 py-3',
        tone === 'warn'
          ? 'border-transparent bg-pastel-yellow/70'
          : tone === 'accent'
          ? 'border-transparent bg-pastel-mint/60'
          : 'border-eddy-100 bg-surface',
      )}
    >
      <p className="font-display text-2xl font-bold leading-none text-ink">{value}</p>
      <p className="mt-1 font-body text-[11px] text-ink-muted">{label}</p>
      {hint && <p className="font-body text-[10px] text-ink-muted">{hint}</p>}
    </div>
  );
}

function GroupCard({ group }: { group: GroupInfo }) {
  const c = getColorOption(group.color);
  const avatars = group.memberAvatars ?? [];
  return (
    <Link href={`/groups/${group.id}`}>
      <Card className="flex h-full flex-col gap-3 transition-colors hover:border-eddy-300">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-clay-sm ${c.chipClass}`}>
            <Users size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-display text-h3 text-ink">{group.name}</p>
              {group.isOwner && <Crown size={14} className="flex-shrink-0 text-amber-500" />}
            </div>
            {group.description && <p className="mt-0.5 truncate font-body text-xs text-ink-muted">{group.description}</p>}
          </div>
          <ChevronRight size={18} className="flex-shrink-0 text-ink-muted" />
        </div>

        {/* สมาชิก + จำนวนงาน */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {avatars.map((a, i) =>
                a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={a.image}
                    alt={a.name}
                    className="h-7 w-7 rounded-full border-2 border-surface object-cover"
                  />
                ) : (
                  <span
                    key={i}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-inverse font-display text-[10px] font-bold text-white"
                  >
                    {a.name.charAt(0).toUpperCase()}
                  </span>
                ),
              )}
              {group.memberCount > avatars.length && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-eddy-100 font-display text-[10px] font-bold text-eddy-700">
                  +{group.memberCount - avatars.length}
                </span>
              )}
            </div>
            <span className="font-body text-xs text-ink-muted">{group.memberCount} สมาชิก</span>
          </div>

          {(group.taskCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 font-body text-xs text-ink-muted">
              <ListChecks size={13} /> {group.taskCount} งาน
            </span>
          )}
        </div>

        {(group.waitingForMeCount ?? 0) > 0 && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-pastel-yellow px-2.5 py-1 font-display text-[10px] font-bold text-eddy-700">
            <UserCheck size={11} /> รอคุณยืนยัน {group.waitingForMeCount} งาน
          </span>
        )}
      </Card>
    </Link>
  );
}
