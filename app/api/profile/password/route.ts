import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isStrongPassword, MIN_PASSWORD_LENGTH } from '@/lib/validation';

// PATCH /api/profile/password - เปลี่ยนรหัสผ่านของบัญชีที่ login ด้วยอีเมล/รหัสผ่าน (ไม่ใช่ Google)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });

  const currentPassword: string = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword: string = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' }, { status: 400 });
  }
  if (!isStrongPassword(newPassword)) {
    return NextResponse.json(
      { error: `รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร และมีทั้งตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว` },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
  // password เป็น null ได้ถ้าสมัครผ่าน Google มา - บัญชีแบบนี้ไม่มีรหัสผ่านให้เปลี่ยน
  if (!user?.password) {
    return NextResponse.json({ error: 'บัญชีนี้เข้าสู่ระบบด้วย Google ไม่มีรหัสผ่านให้เปลี่ยน' }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}
