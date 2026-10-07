import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST /api/google/calendar/disconnect - ลบเฉพาะแถวใน GoogleCalendarLink (การเชื่อมแบบ explicit)
// ไม่แตะตาราง Account เลย - ปลอดภัยเสมอไม่ว่าผู้ใช้จะมีรหัสผ่านหรือไม่ เพราะ GoogleCalendarLink ไม่ได้
// เป็นวิธี login ของใครทั้งนั้น (ถ้า connect อยู่ผ่าน Account แบบสมัครด้วย Google ตั้งแต่แรก ปุ่มนี้จะไม่
// มีอะไรให้ลบ - ฝั่งหน้าเว็บไม่ควรโชว์ปุ่มนี้ให้กรณีนั้นอยู่แล้ว ดู source: 'account' จาก getGoogleCalendarStatus)
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.googleCalendarLink.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
