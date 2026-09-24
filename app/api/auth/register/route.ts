import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { USERNAME_RE, EMAIL_RE, isStrongPassword, domainHasMx, MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // กันสแปมสมัครบัญชีรัวๆ จาก IP เดียว - ไม่มีอะไรจำกัดตรงนี้มาก่อนเลย
  if (!checkRateLimit(`register:${getClientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: 'สมัครบ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });

  const email: string = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const username: string = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password: string = typeof body?.password === 'string' ? body.password : '';
  const name: string | undefined = typeof body?.name === 'string' ? body.name.trim() : undefined;
  const acceptedTerms: boolean = body?.acceptedTerms === true;

  if (!name) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อที่แสดง' }, { status: 400 });
  }
  if (!username || !USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: 'ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข หรือ _ ยาว 3-20 ตัว' },
      { status: 400 },
    );
  }
  if (!email || !password) {
    return NextResponse.json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json(
      { error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร และมีทั้งตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว` },
      { status: 400 },
    );
  }
  if (!acceptedTerms) {
    return NextResponse.json({ error: 'กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก' }, { status: 400 });
  }

  // เช็คโดเมนอีเมลว่ามี MX record จริง (กันสมัครด้วยโดเมนมั่วๆ ที่ไม่มีทางรับอีเมลได้เลย)
  // หมายเหตุ: ไม่ใช่การยืนยันว่ากล่องอีเมลนั้นมีอยู่จริง เพราะยังไม่มีระบบส่งอีเมลยืนยันในโปรเจกต์นี้
  const domain = email.split('@')[1] ?? '';
  if (!(await domainHasMx(domain))) {
    return NextResponse.json({ error: 'โดเมนอีเมลนี้ไม่มีอยู่จริง กรุณาตรวจสอบอีเมลอีกครั้ง' }, { status: 400 });
  }

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username } }),
  ]);
  if (existingEmail) {
    return NextResponse.json({ error: 'อีเมลนี้มีบัญชีอยู่แล้ว' }, { status: 409 });
  }
  if (existingUsername) {
    return NextResponse.json({ error: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว' }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { email, username, password: hashed, name },
    });
    return NextResponse.json({ user: { id: user.id, email: user.email, username: user.username, name: user.name } }, { status: 201 });
  } catch (err) {
    // กันกรณี race condition: สมัครอีเมล/ชื่อผู้ใช้เดียวกันพร้อมกัน 2 คำขอ ผ่านการเช็ค findUnique
    // ด้านบนทั้งคู่ แล้วมาชนกันตอน insert จริง (unique constraint บน email/username)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined) ?? [];
      const field = target.includes('username') ? 'ชื่อผู้ใช้นี้มีคนใช้แล้ว' : 'อีเมลนี้มีบัญชีอยู่แล้ว';
      return NextResponse.json({ error: field }, { status: 409 });
    }
    throw err;
  }
}
