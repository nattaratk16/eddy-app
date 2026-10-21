import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Card from '@/components/Card';
import AiKeyForm from '@/components/settings/AiKeyForm';

export default async function SettingsAiPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { geminiApiKey: true },
  });
  if (!user) redirect('/login');

  // ไม่ส่ง key เต็มๆกลับไปที่หน้าเว็บ - ส่งแค่ 4 ตัวท้ายไปโชว์ยืนยันว่าคือ key ไหน
  const last4 = user.geminiApiKey ? user.geminiApiKey.slice(-4) : null;

  return (
    <Card>
      <AiKeyForm hasKey={!!user.geminiApiKey} last4={last4} />
    </Card>
  );
}
