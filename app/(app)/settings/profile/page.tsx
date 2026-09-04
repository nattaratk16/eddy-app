import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Card from '@/components/Card';
import ProfileIdentityForm from '@/components/settings/ProfileIdentityForm';

export default async function SettingsProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true, image: true, name: true, username: true,
      title: true, organization: true, bio: true, avatarColor: true, avatarEmoji: true,
    },
  });
  if (!user) redirect('/login');

  return (
    <Card>
      <ProfileIdentityForm
        email={user.email}
        image={user.image ?? ''}
        initialName={user.name ?? ''}
        initialUsername={user.username ?? ''}
        initialTitle={user.title ?? ''}
        initialOrganization={user.organization ?? ''}
        initialBio={user.bio ?? ''}
        initialAvatarColor={user.avatarColor ?? ''}
        initialAvatarEmoji={user.avatarEmoji ?? ''}
      />
    </Card>
  );
}
