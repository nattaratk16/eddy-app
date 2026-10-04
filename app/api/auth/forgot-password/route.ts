import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { EMAIL_RE } from '@/lib/validation';
import { sendPasswordResetEmail } from '@/lib/email';
import { generateRawToken, hashToken, RESET_TOKEN_TTL_MS } from '@/lib/passwordReset';

// ข้อความเดียวกันเป๊ะไม่ว่าจะเจอบัญชีหรือไม่ - กันคนเอาอีเมลไปลองยิงดูว่าอีเมลไหนมีบัญชีอยู่ในระบบ EDDY บ้าง
const GENERIC_MESSAGE = 'ถ้าอีเมลนี้มีบัญชีอยู่ในระบบ เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้แล้ว ลองเช็คกล่องขาเข้า (หรือ spam) ดูนะ';

// POST /api/auth/forgot-password { email }
export async function POST(req: NextRequest) {
  // จำกัดต่อ IP เท่านั้น (ไม่ใช่ต่ออีเมล) เพราะถ้าจำกัดต่ออีเมลด้วย คนร้ายจะยิงซ้ำแล้วดูว่าอีเมลไหนโดน
  // rate limit ไวกว่า (แปลว่ามีบัญชีจริง) กลายเป็นช่องทาง enumeration อีกแบบ
  if (!checkRateLimit(`forgot-password:${getClientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, password: true } });
  // ไม่พบบัญชี หรือเป็นบัญชี Google-only (password เป็น null ไม่มีอะไรให้รีเซ็ต) - ข้ามไปเงียบๆ
  // ตอบข้อความเดิมเป๊ะเหมือนเจอบัญชีจริง กันรู้ได้ว่าอีเมลนี้มีบัญชีในระบบไหมจากการสังเกต response
  if (user?.password) {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.$transaction([
      // เคลียร์ลิงก์เก่าของ user นี้ทิ้งก่อนเสมอ - กันมีหลายลิงก์ใช้ได้พร้อมกันถ้าขอซ้ำหลายรอบ
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
    ]);

    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${rawToken}`;
    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (err) {
      // ส่งอีเมลไม่สำเร็จ (เช่น ยังไม่ได้ตั้งค่า RESEND_API_KEY) - log ไว้ฝั่งเซิร์ฟเวอร์ แต่ตอบผู้ใช้
      // เหมือนเดิมเสมอ ไม่งั้นข้อความที่ต่างกันจะกลายเป็นช่องทาง enumeration เหมือนกัน
      console.error('[forgot-password] ส่งอีเมลไม่สำเร็จ:', err);
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
