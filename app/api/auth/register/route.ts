import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email: string = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password: string = typeof body?.password === 'string' ? body.password : '';
  const name: string | undefined = typeof body?.name === 'string' ? body.name.trim() : undefined;

  if (!email || !password) {
    return NextResponse.json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'อีเมลนี้มีบัญชีอยู่แล้ว' }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
  } catch (err) {
    // กันกรณี race condition: สมัครอีเมลเดียวกันพร้อมกัน 2 คำขอ ผ่านการเช็ค findUnique ด้านบนทั้งคู่
    // แล้วมาชนกันตอน insert จริง (unique constraint บน email)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'อีเมลนี้มีบัญชีอยู่แล้ว' }, { status: 409 });
    }
    throw err;
  }
}
