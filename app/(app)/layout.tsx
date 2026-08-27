import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ChatWidget from '@/components/ChatWidget';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // ผู้ใช้ใหม่ที่ยังไม่ได้ทำ onboarding -> เด้งไปหน้า onboarding ก่อน
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { onboardedAt: true } });
  if (!user?.onboardedAt) redirect('/onboarding');

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-28 md:pb-10">{children}</div>
      <MobileNav />
      <ChatWidget />
    </div>
  );
}
