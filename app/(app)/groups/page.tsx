'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Crown, Check, X, ChevronRight, UserCheck } from 'lucide-react';
import Card from '@/components/Card';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Reveal from '@/components/motion/Reveal';
import { PASTEL_COLORS, getColorOption } from '@/lib/colors';
import type { GroupInfo, GroupInvitation, PastelColor } from '@/lib/types';

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<PastelColor>('blue');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  async function respond(inv: GroupInvitation, accept: boolean) {
    setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
    await fetch(`/api/groups/${inv.groupId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    });
    if (accept) load();
  }

  return (
    <div className="px-4 md:px-10">
      <div className="flex items-center justify-between pt-8">
        <div>
          <h1 className="font-display text-h1 text-ink">กลุ่ม</h1>
          <p className="mt-0.5 font-body text-body text-ink-muted">สร้างกลุ่มเพื่อแชร์ตารางและวางแผนงานร่วมกัน</p>
        </div>
        <Button onClick={() => setCreating(true)} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 !px-5 !py-2.5 hover:!brightness-110">
          <span className="flex items-center gap-1.5">
            <Plus size={16} /> สร้างกลุ่ม
          </span>
        </Button>
      </div>

      {/* คำเชิญที่รอตอบรับ */}
      {invitations.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-h3 text-ink">คำเชิญเข้ากลุ่ม ({invitations.length})</h2>
          <div className="flex flex-col gap-3">
            {invitations.map((inv) => {
              const c = getColorOption(inv.groupColor);
              return (
                <Reveal key={inv.id}>
                  <Card className="flex items-center gap-3 !p-4">
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
                      className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 font-display text-xs font-semibold text-white transition-colors hover:bg-black"
                    >
                      <Check size={14} /> รับ
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

      {/* รายการกลุ่ม */}
      <section className="mt-8">
        {loading ? (
          <p className="py-10 text-center font-body text-sm text-ink-muted">กำลังโหลด...</p>
        ) : groups.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pastel-blue text-eddy-700">
              <Users size={26} />
            </span>
            <p className="font-display text-h3 text-ink">ยังไม่มีกลุ่ม</p>
            <p className="max-w-xs font-body text-sm text-ink-muted">
              สร้างกลุ่มแรกของคุณ แล้วชวนเพื่อนมาแชร์ตารางและให้เอ็ดดี้ช่วยจัดเวลาว่างร่วมกัน
            </p>
            <Button onClick={() => setCreating(true)} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 !px-5 !py-2.5 hover:!brightness-110">
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> สร้างกลุ่ม
              </span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g, i) => {
              const c = getColorOption(g.color);
              return (
                <Reveal key={g.id} delay={i * 0.05} hover>
                  <Link href={`/groups/${g.id}`}>
                    <Card className="flex h-full items-start gap-3 transition-colors hover:border-eddy-300">
                      <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-clay-sm ${c.chipClass}`}>
                        <Users size={22} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-display text-h3 text-ink">{g.name}</p>
                          {g.isOwner && <Crown size={14} className="flex-shrink-0 text-amber-500" />}
                        </div>
                        {g.description && <p className="mt-0.5 truncate font-body text-xs text-ink-muted">{g.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs text-ink-muted">
                          <span>{g.memberCount} สมาชิก</span>
                          {(g.taskCount ?? 0) > 0 && <span>{g.taskCount} งาน</span>}
                        </div>
                        {/* งานที่ต้องลงมือทำ - ป้ายนี้คือเหตุผลหลักที่ต้องเปิดกลุ่มนั้น */}
                        {(g.waitingForMeCount ?? 0) > 0 && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-pastel-yellow px-2 py-0.5 font-display text-[10px] font-bold text-eddy-700">
                            <UserCheck size={11} /> รอคุณยืนยัน {g.waitingForMeCount} งาน
                          </span>
                        )}
                      </div>
                      <ChevronRight size={18} className="flex-shrink-0 text-ink-muted" />
                    </Card>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal สร้างกลุ่ม */}
      <Modal open={creating} onClose={() => setCreating(false)} title="สร้างกลุ่มใหม่" maxWidth="max-w-md">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-display text-sm font-semibold text-ink-soft">ชื่อกลุ่ม</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น กลุ่มโปรเจกต์ Capstone"
              className="w-full rounded-clay-sm border border-eddy-200 bg-white px-4 py-2.5 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block font-display text-sm font-semibold text-ink-soft">รายละเอียด (ไม่บังคับ)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="กลุ่มนี้เกี่ยวกับอะไร"
              className="w-full rounded-clay-sm border border-eddy-200 bg-white px-4 py-2.5 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25"
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
                  className={`h-7 w-7 rounded-full ${c.swatchClass} ${color === c.value ? 'scale-110 ring-2 ring-eddy-500 ring-offset-2' : ''}`}
                />
              ))}
            </div>
          </div>
          {error && <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-sm text-eddy-700">{error}</p>}
          <div className="mt-1 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>ยกเลิก</Button>
            <Button onClick={createGroup} disabled={saving} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 hover:!brightness-110">{saving ? 'กำลังสร้าง...' : 'สร้างกลุ่ม'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
