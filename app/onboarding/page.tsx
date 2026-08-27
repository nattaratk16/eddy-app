import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import OnboardingWizard from '@/components/OnboardingWizard';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // ถ้าทำ onboarding ไปแล้ว (หรือข้าม) ไม่ต้องแสดงอีก
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardedAt: true },
  });
  if (user?.onboardedAt) redirect('/dashboard');

  return <OnboardingWizard />;
}
