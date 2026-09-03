import { redirect } from 'next/navigation';
import { Mail, KeyRound, Chrome } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import ProfileForm from '@/components/ProfileForm';
import SignOutButton from '@/components/SignOutButton';
import Reveal from '@/components/motion/Reveal';
import { getColorOption } from '@/lib/colors';
import type { PastelColor } from '@/lib/types';

const monthNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const [user, completedTaskCount, groupCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, image: true, createdAt: true,
        username: true, avatarColor: true, avatarEmoji: true, timezone: true, dayStart: true, dayEnd: true,
        skills: true, maxFocusMinutes: true, bufferMinutes: true,
        password: true, // ใช้เช็คว่าเข้าสู่ระบบด้วย Google หรืออีเมล/รหัสผ่านเท่านั้น - ไม่ส่งค่าจริงออกไปไหน
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
  const signInMethod = user.password ? 'อีเมลและรหัสผ่าน' : 'Google';

  return (
    <div className="px-4 md:px-10">
      <Topbar userName={userName} />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* แบนเนอร์ปกด้านบนเป็นส่วนหนึ่งของ ProfileForm เอง (ต้องไม่มีอะไรคั่นก่อนหน้า
            ไม่งั้น -mx-6 -mt-6 ที่ใช้ยื่นแบนเนอร์ชนขอบการ์ดจะเยื้องผิดตำแหน่ง) */}
        <Reveal>
          <Card>
            <ProfileForm
              email={user.email}
              image={user.image ?? ''}
              initialName={user.name ?? ''}
              initialUsername={user.username ?? ''}
              initialAvatarColor={user.avatarColor ?? ''}
              initialAvatarEmoji={user.avatarEmoji ?? ''}
              initialTimezone={user.timezone ?? ''}
              initialDayStart={user.dayStart ?? ''}
              initialDayEnd={user.dayEnd ?? ''}
              initialSkills={user.skills}
              initialMaxFocusMinutes={user.maxFocusMinutes}
              initialBufferMinutes={user.bufferMinutes}
              memberSinceLabel={memberSinceLabel}
              completedTaskCount={completedTaskCount}
              groupCount={groupCount}
            />
          </Card>
        </Reveal>

        <div className="flex flex-col gap-6">
          {/* ตัวอย่างที่เพื่อนเห็น */}
          <Reveal delay={0.08}>
            <Card className="overflow-hidden">
              <div className="-mx-6 -mt-6 mb-4 h-2 bg-gradient-to-r from-eddy-500 via-accent-500 to-pastel-lilac-dark" />
              <h2 className="font-display text-h3 text-ink">ตัวอย่างที่เพื่อนเห็น</h2>
              <div className="mt-4 flex flex-col items-center text-center">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={userName} className="h-20 w-20 rounded-full object-cover shadow-clay-sm" />
                ) : (
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold shadow-clay-sm ${color.chipClass}`}>
                    {user.avatarEmoji || previewInitial}
                  </div>
                )}
                <p className="mt-3 font-display text-lg font-bold text-ink">{userName}</p>
                {user.username && <p className="font-body text-sm text-ink-muted">@{user.username}</p>}
                {(user.dayStart || user.dayEnd) && (
                  <p className="mt-3 font-body text-xs text-ink-muted">
                    สะดวก {user.dayStart || '—'}–{user.dayEnd || '—'} น. ({user.timezone || 'Asia/Bangkok'})
                  </p>
                )}
                {user.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {user.skills.map((s) => (
                      <span key={s} className="rounded-full bg-pastel-blue px-2.5 py-1 font-body text-xs text-eddy-700">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {(user.maxFocusMinutes || user.bufferMinutes) && (
                  <p className="mt-3 font-body text-xs text-ink-muted">
                    {user.maxFocusMinutes && <>โฟกัสต่อเนื่องสูงสุด {user.maxFocusMinutes} นาที</>}
                    {user.maxFocusMinutes && user.bufferMinutes ? ' · ' : ''}
                    {user.bufferMinutes && <>เว้นพัก {user.bufferMinutes} นาที</>}
                  </p>
                )}
              </div>
            </Card>
          </Reveal>

          {/* บัญชี */}
          <Reveal delay={0.16}>
            <Card className="overflow-hidden">
              <div className="-mx-6 -mt-6 mb-4 h-2 bg-gradient-to-r from-eddy-500 via-accent-500 to-pastel-lilac-dark" />
              <h2 className="font-display text-h3 text-ink">บัญชี</h2>
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2.5 font-body text-sm text-ink-soft">
                  <Mail size={16} className="flex-shrink-0 text-ink-muted" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2.5 font-body text-sm text-ink-soft">
                  {signInMethod === 'Google' ? (
                    <Chrome size={16} className="flex-shrink-0 text-ink-muted" />
                  ) : (
                    <KeyRound size={16} className="flex-shrink-0 text-ink-muted" />
                  )}
                  เข้าสู่ระบบด้วย{signInMethod === 'Google' ? ' Google' : 'อีเมลและรหัสผ่าน'}
                </div>
              </div>
              <div className="mt-4 border-t border-eddy-100 pt-4">
                <SignOutButton />
              </div>
            </Card>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
