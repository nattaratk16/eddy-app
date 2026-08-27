import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import ProfileForm from '@/components/ProfileForm';
import { getColorOption } from '@/lib/colors';
import type { PastelColor } from '@/lib/types';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const [user, categoryCount, eventCount, taskTotal, taskDone, groupCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, bio: true, image: true, createdAt: true,
        username: true, avatarColor: true, avatarEmoji: true, timezone: true, dayStart: true, dayEnd: true,
      },
    }),
    prisma.category.count({ where: { userId } }),
    prisma.event.count({ where: { userId } }),
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, done: true } }),
    prisma.groupMember.count({ where: { userId, status: 'accepted' } }),
  ]);
  if (!user) redirect('/login');

  const userName = user.name || user.email || 'เพื่อน';
  const color = getColorOption((user.avatarColor as PastelColor) || 'blue');
  const previewInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="px-4 md:px-10">
      <Topbar userName={userName} />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="font-display text-h3 text-ink">โปรไฟล์ของฉัน</h2>
          <p className="mt-1 font-body text-body text-ink-muted">
            ข้อมูลนี้ใช้แสดงตัวตนให้เพื่อนเห็นในกลุ่ม และช่วยให้เอ็ดดี้จัดตารางได้ดีขึ้น
          </p>
          <div className="mt-5">
            <ProfileForm
              email={user.email}
              image={user.image ?? ''}
              initialName={user.name ?? ''}
              initialUsername={user.username ?? ''}
              initialBio={user.bio ?? ''}
              initialAvatarColor={user.avatarColor ?? ''}
              initialAvatarEmoji={user.avatarEmoji ?? ''}
              initialTimezone={user.timezone ?? ''}
              initialDayStart={user.dayStart ?? ''}
              initialDayEnd={user.dayEnd ?? ''}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          {/* ตัวอย่างที่เพื่อนเห็น */}
          <Card>
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
              {user.bio && <p className="mt-3 font-body text-sm text-ink-muted">{user.bio}</p>}
              {(user.dayStart || user.dayEnd) && (
                <p className="mt-3 font-body text-xs text-ink-muted">
                  สะดวก {user.dayStart || '—'}–{user.dayEnd || '—'} น. ({user.timezone || 'Asia/Bangkok'})
                </p>
              )}
            </div>
          </Card>

          {/* สถิติ */}
          <Card>
            <h2 className="font-display text-h3 text-ink">ประวัติสังเขป</h2>
            <div className="mt-4 flex flex-col gap-3 font-body text-body text-ink">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">เป็นสมาชิกตั้งแต่</span>
                <span className="font-semibold">
                  {user.createdAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">กลุ่มที่เข้าร่วม</span>
                <span className="font-semibold">{groupCount} กลุ่ม</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">หมวดหมู่ปฏิทิน</span>
                <span className="font-semibold">{categoryCount} หมวด</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">กิจกรรมทั้งหมด</span>
                <span className="font-semibold">{eventCount} รายการ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">งานที่ทำสำเร็จ</span>
                <span className="font-semibold">{taskDone}/{taskTotal} ชิ้น</span>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
