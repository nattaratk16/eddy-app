import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Card from '@/components/Card';
import WorkPreferencesForm from '@/components/settings/WorkPreferencesForm';

export default async function SettingsWorkPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true, dayStart: true, dayEnd: true, skills: true, maxFocusMinutes: true, bufferMinutes: true },
  });
  if (!user) redirect('/login');

  return (
    <Card>
      <WorkPreferencesForm
        initialTimezone={user.timezone ?? ''}
        initialDayStart={user.dayStart ?? ''}
        initialDayEnd={user.dayEnd ?? ''}
        initialSkills={user.skills}
        initialMaxFocusMinutes={user.maxFocusMinutes}
        initialBufferMinutes={user.bufferMinutes}
      />
    </Card>
  );
}
