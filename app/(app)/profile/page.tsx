import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import ProfileForm from '@/components/ProfileForm';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;

  const [user, categoryCount, eventCount, taskTotal, taskDone] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, bio: true, image: true, createdAt: true },
    }),
    prisma.category.count({ where: { userId } }),
    prisma.event.count({ where: { userId } }),
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, done: true } }),
  ]);

  if (!user) redirect('/login');

  const userName = user.name || user.email || 'เพื่อน';

  return (
    <div className="px-4 md:px-10">
      <Topbar userName={userName} />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="font-display text-lg font-bold text-ink">โปรไฟล์ของฉัน</h2>
          <p className="mt-1 font-body text-sm text-ink-muted">
            แก้ไขข้อมูลส่วนตัวของคุณ — ข้อมูลนี้จะใช้แสดงตัวตนให้เพื่อนเห็นตอนทำระบบแชร์ในอนาคต
          </p>
          <div className="mt-5">
            <ProfileForm
              initialName={user.name ?? ''}
              email={user.email}
              initialBio={user.bio ?? ''}
              initialImage={user.image ?? ''}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card tone="white">
            <h2 className="font-display text-base font-bold text-ink">ประวัติสังเขป</h2>
            <div className="mt-4 flex flex-col gap-3 font-body text-sm text-ink">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">เป็นสมาชิกตั้งแต่</span>
                <span className="font-semibold">
                  {user.createdAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
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
                <span className="font-semibold">
                  {taskDone}/{taskTotal} ชิ้น
                </span>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
