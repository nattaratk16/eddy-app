import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { isStrongPassword, MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { hashToken } from '@/lib/passwordReset';

// POST /api/auth/reset-password { token, password }
export async function POST(req: NextRequest) {
  // token เองสุ่มมายาว 32 ไบต์เดาไม่ได้อยู่แล้ว แต่ยังกันไว้อีกชั้นกันคนลองยิงสุ่มถี่ๆ
  if (!checkRateLimit(`reset-password:${getClientIp(req)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: 'ลองบ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!token) {
    return NextResponse.json({ error: 'ลิงก์ไม่ถูกต้อง' }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json(
      { error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร และมีทั้งตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว` },
      { status: 400 },
    );
  }

  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    // ลบทิ้งด้วยถ้าหมดอายุแล้วแต่ยังไม่ถูกเก็บกวาด - กันค้างเฉยๆ ไม่มีประโยชน์
    if (resetToken) await prisma.passwordResetToken.delete({ where: { id: resetToken.id } }).catch(() => {});
    return NextResponse.json({ error: 'ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashed } }),
    // ลบ token ทุกอันของ user นี้ (ไม่ใช่แค่อันที่ใช้) - ใช้ครั้งเดียวแล้วจบ กันเอาลิงก์เก่าที่เคยขอไว้
    // มาใช้ซ้ำได้อีกหลังรีเซ็ตสำเร็จแล้ว
    prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
