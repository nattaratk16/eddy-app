import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Pencil, Settings, ListChecks, Users, Mail, Clock, Tags, Timer, Coffee, type LucideIcon } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Card from '@/components/Card';
import Reveal from '@/components/motion/Reveal';
import { getColorOption } from '@/lib/colors';
import type { PastelColor } from '@/lib/types';

const monthNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function StatChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1.5 font-body text-xs font-medium text-ink-soft shadow-clay-sm">
      <Icon size={13} className="text-eddy-600" />
      <span className="font-display font-bold text-ink">{value}</span> {label}
    </span>
  );
}

/** แถวข้อมูลแบบอ่านอย่างเดียว - ค่าว่างจะขึ้น "ยังไม่ได้ตั้งค่า" เป็นสีจางแทนช่องว่างเปล่าๆ */
function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={16} className="mt-0.5 flex-shrink-0 text-ink-muted" />
      <div className="min-w-0 flex-1">
        <p className="font-body text-xs text-ink-muted">{label}</p>
        <p className={`font-body text-sm ${value ? 'text-ink' : 'text-ink-muted/70'}`}>{value || 'ยังไม่ได้ตั้งค่า'}</p>
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const [user, completedTaskCount, groupCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, email: true, image: true, createdAt: true,
        username: true, title: true, organization: true, bio: true,
        avatarColor: true, avatarEmoji: true, timezone: true, dayStart: true, dayEnd: true,
        skills: true, maxFocusMinutes: true, bufferMinutes: true,
      },
    }),
    prisma.task.count({ where: { userId, done: true } }),
    prisma.groupMember.count({ where: { userId, status: 'accepted' } }),
  ]);
  if (!user) redirect('/login');

  const userName = user.name || user.email || 'เพื่อน';
  const color = getColorOption((user.avatarColor as PastelColor) || 'blue');
  const previewInitial = userName.charAt(0).toUpperCase();
  const memberSinceLabel = `${monthNames[user.createdAt.getMonth()]} ${user.createdAt.getFullYear() + 543}`;
  const availability =
    user.dayStart || user.dayEnd
      ? `${user.dayStart || '—'}–${user.dayEnd || '—'} น. (${user.timezone || 'Asia/Bangkok'})`
      : '';

  return (
    <div className="px-4 md:px-10">
      {/* หน้านี้ "ดูอย่างเดียว" - การแก้ไขทั้งหมดอยู่ในหน้าตั้งค่า (/settings) */}
      <header className="flex flex-wrap items-center justify-between gap-3 pt-8">
        <h1 className="font-display text-h1 text-ink">โปรไฟล์</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/settings/profile"
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-5 py-2.5 font-display text-sm font-semibold text-white shadow-clay-sm transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          >
            <Pencil size={15} /> แก้ไขโปรไฟล์
          </Link>
          <Link
            href="/settings"
            aria-label="ตั้งค่า"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-eddy-200 bg-surface text-ink-soft transition-colors hover:border-eddy-300 hover:bg-eddy-50 hover:text-eddy-700"
          >
            <Settings size={17} />
          </Link>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* ---------- การ์ดตัวตน ---------- */}
        <Reveal>
          <Card className="overflow-hidden">
            {/* แบนเนอร์ยื่นชนขอบการ์ด (ยกเลิก padding p-6 ของ Card) */}
            <div className="-mx-6 -mt-6 h-28 overflow-hidden bg-gradient-to-r from-eddy-500 via-accent-500 to-pastel-lilac-dark sm:h-32">
              <div className="relative h-full w-full">
                <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
                <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
              </div>
            </div>

            <div className="-mt-14 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:gap-4">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={userName}
                  width={96}
                  height={96}
                  className="h-24 w-24 flex-shrink-0 rounded-full object-cover shadow-clay-sm ring-4 ring-surface"
                />
              ) : (
                <div
                  className={`flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full text-3xl font-bold shadow-clay-sm ring-4 ring-surface ${color.chipClass}`}
                >
                  {user.avatarEmoji || previewInitial}
                </div>
              )}
              <div className="min-w-0 flex-1 sm:pb-1">
                <p className="truncate font-display text-lg font-bold text-ink">{userName}</p>
                {user.username && <p className="font-body text-sm text-ink-muted">@{user.username}</p>}
                {(user.title || user.organization) && (
                  <p className="mt-0.5 truncate font-body text-sm text-ink-soft">
                    {[user.title, user.organization].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-eddy-100/80 pt-3.5">
              <StatChip icon={ListChecks} label="งานสำเร็จ" value={completedTaskCount} />
              <StatChip icon={Users} label="กลุ่ม" value={groupCount} />
              <span className="font-body text-xs text-ink-muted sm:ml-auto">เข้าร่วมเมื่อ {memberSinceLabel}</span>
            </div>

            <div className="mt-4 border-t border-eddy-100/80 pt-4">
              <h2 className="font-display text-h3 text-ink">เกี่ยวกับฉัน</h2>
              <p className={`mt-1.5 whitespace-pre-wrap font-body text-sm ${user.bio ? 'text-ink-soft' : 'text-ink-muted/70'}`}>
                {user.bio || 'ยังไม่ได้เขียนอะไรไว้ — เขียนไว้สักหน่อยให้เอ็ดดี้เข้าใจสไตล์การทำงานของคุณมากขึ้น'}
              </p>
            </div>

            <div className="mt-4 border-t border-eddy-100/80 pt-4">
              <h2 className="flex items-center gap-1.5 font-display text-h3 text-ink">
                <Tags size={17} className="text-eddy-500" /> ทักษะและความถนัด
              </h2>
              {user.skills.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {user.skills.map((s) => (
                    <span key={s} className="rounded-full bg-pastel-blue px-3 py-1 font-body text-xs text-chip-ink">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 font-body text-sm text-ink-muted/70">ยังไม่ได้เพิ่มทักษะ</p>
              )}
            </div>
          </Card>
        </Reveal>

        {/* ---------- สรุปค่าที่ตั้งไว้ (อ่านอย่างเดียว) ---------- */}
        <div className="flex flex-col gap-6">
          <Reveal delay={0.08}>
            <Card>
              <h2 className="font-display text-h3 text-ink">ข้อมูลบัญชี</h2>
              <div className="mt-2 divide-y divide-eddy-100">
                <InfoRow icon={Mail} label="อีเมล" value={user.email} />
              </div>
              <Link
                href="/settings/account"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-eddy-200 bg-surface px-4 py-2.5 font-display text-sm font-semibold text-ink-soft transition-colors hover:border-eddy-300 hover:bg-eddy-50 hover:text-eddy-700"
              >
                <Settings size={15} /> จัดการบัญชีและรหัสผ่าน
              </Link>
            </Card>
          </Reveal>

          <Reveal delay={0.16}>
            <Card>
              <h2 className="font-display text-h3 text-ink">การทำงานและเวลา</h2>
              <div className="mt-2 divide-y divide-eddy-100">
                <InfoRow icon={Clock} label="เวลาที่สะดวก" value={availability} />
                <InfoRow
                  icon={Timer}
                  label="โฟกัสต่อเนื่องสูงสุด"
                  value={user.maxFocusMinutes ? `${user.maxFocusMinutes} นาที` : ''}
                />
                <InfoRow
                  icon={Coffee}
                  label="เว้นช่วงพักระหว่างงาน"
                  value={user.bufferMinutes != null ? `${user.bufferMinutes} นาที` : ''}
                />
              </div>
              <Link
                href="/settings/work"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-eddy-200 bg-surface px-4 py-2.5 font-display text-sm font-semibold text-ink-soft transition-colors hover:border-eddy-300 hover:bg-eddy-50 hover:text-eddy-700"
              >
                <Pencil size={15} /> แก้ไขการตั้งค่าเวลา
              </Link>
            </Card>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
