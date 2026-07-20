import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ChatWidget from '@/components/ChatWidget';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-28 md:pb-10">{children}</div>
      <MobileNav />
      <ChatWidget />
    </div>
  );
}
