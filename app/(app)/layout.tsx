import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ChatWidget from '@/components/ChatWidget';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen bg-eddy-50">
      <Sidebar />
      <div className="flex-1 pb-24 md:pb-10">{children}</div>
      <MobileNav />
      <ChatWidget />
    </div>
  );
}
