import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Mail, KeyRound, Chrome, CalendarClock, ShieldCheck } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Card from '@/components/Card';
import ChangePasswordButton from '@/components/ChangePasswordButton';
import SignOutButton from '@/components/SignOutButton';

const monthNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export default async function SettingsAccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    // password ใช้เช็คแค่ว่าสมัครด้วยอีเมลหรือ Google - ไม่ส่งค่าจริงออกไปไหน
    select: { email: true, password: true, createdAt: true },
  });
  if (!user) redirect('/login');

  const usesPassword = Boolean(user.password);
  const memberSinceLabel = `${monthNames[user.createdAt.getMonth()]} ${user.createdAt.getFullYear() + 543}`;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="font-display text-h3 text-ink">ข้อมูลบัญชี</h2>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 font-body text-sm text-ink-soft">
            <Mail size={16} className="flex-shrink-0 text-ink-muted" />
            <span className="truncate">{user.email}</span>
            <span className="ml-auto flex-shrink-0 font-body text-xs text-ink-muted">แก้ไขไม่ได้</span>
          </div>
          <div className="flex items-center gap-2.5 font-body text-sm text-ink-soft">
            {usesPassword ? (
              <KeyRound size={16} className="flex-shrink-0 text-ink-muted" />
            ) : (
              <Chrome size={16} className="flex-shrink-0 text-ink-muted" />
            )}
            เข้าสู่ระบบด้วย{usesPassword ? 'อีเมลและรหัสผ่าน' : ' Google'}
          </div>
          <div className="flex items-center gap-2.5 font-body text-sm text-ink-soft">
            <CalendarClock size={16} className="flex-shrink-0 text-ink-muted" />
            เข้าร่วมเมื่อ {memberSinceLabel}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-h3 text-ink">ความปลอดภัย</h2>
        {usesPassword ? (
          <>
            <p className="mt-0.5 font-body text-caption text-ink-muted">
              เปลี่ยนรหัสผ่านเป็นระยะ และอย่าใช้รหัสเดียวกับเว็บอื่น
            </p>
            <div className="mt-4">
              <ChangePasswordButton />
            </div>
          </>
        ) : (
          <p className="mt-2 rounded-clay-sm bg-eddy-50 p-3.5 font-body text-sm text-ink-soft">
            บัญชีนี้เข้าสู่ระบบผ่าน Google จึงไม่มีรหัสผ่านให้เปลี่ยนที่นี่ — จัดการรหัสผ่านได้ที่บัญชี Google ของคุณ
          </p>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-h3 text-ink">ความเป็นส่วนตัว</h2>
        <p className="mt-0.5 font-body text-caption text-ink-muted">
          ในกลุ่ม คุณเลือกได้ว่าจะให้เพื่อนเห็นชื่อกิจกรรมของคุณ หรือเห็นแค่ช่วงที่ “ไม่ว่าง” — ตั้งค่าได้ในหน้ากลุ่มแต่ละกลุ่ม
        </p>
        <Link
          href="/privacy"
          className="mt-4 flex w-fit items-center gap-2 rounded-full border border-eddy-200 bg-surface px-4 py-2.5 font-display text-sm font-semibold text-ink-soft transition-colors hover:border-eddy-300 hover:bg-eddy-50 hover:text-eddy-700"
        >
          <ShieldCheck size={16} /> อ่านนโยบายความเป็นส่วนตัว
        </Link>
      </Card>

      <Card>
        <h2 className="font-display text-h3 text-ink">เซสชัน</h2>
        <p className="mt-0.5 font-body text-caption text-ink-muted">ออกจากระบบบนอุปกรณ์นี้</p>
        <div className="mt-4 sm:max-w-xs">
          <SignOutButton />
        </div>
      </Card>
    </div>
  );
}
