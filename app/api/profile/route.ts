import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { PASTEL_COLORS } from '@/lib/colors';

const BIO_MAX = 500; // "เกี่ยวกับฉัน/นิสัย" ยาวได้ขึ้น เพราะใช้ป้อนให้ AI วิเคราะห์
const VALID_COLORS = new Set(PASTEL_COLORS.map((c) => c.value));
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
// ช่วงที่ยอมรับได้ - ไม่ผูกกับตัวเลือกสำเร็จรูปอีกต่อไป ผู้ใช้พิมพ์เองได้ในกรอบนี้
// (15-240 ตรงกับ MIN_STEP_MINUTES/MAX_STEP_MINUTES ที่ lib/gemini.ts ใช้บังคับขนาดขั้นตอนย่อยอยู่แล้ว
// ตั้งเกินเพดานนี้ไปก็ไม่มีผลเพิ่มเติม เลยจำกัดไว้ตรงนี้ให้ตรงกับพฤติกรรมจริง)
const MIN_FOCUS_MINUTES = 15;
const MAX_FOCUS_MINUTES = 240;
const MIN_BUFFER_MINUTES = 0;
const MAX_BUFFER_MINUTES = 120;
const MAX_SKILLS = 20;
const SKILL_MAX_LEN = 40;

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });

  const data: Prisma.UserUpdateInput = {};

  if (typeof body.name === 'string') {
    const v = body.name.trim();
    if (v.length > 80) return NextResponse.json({ error: 'ชื่อยาวเกินไป' }, { status: 400 });
    data.name = v || null;
  }

  if (typeof body.bio === 'string') {
    const v = body.bio.trim();
    if (v.length > BIO_MAX) return NextResponse.json({ error: `เกี่ยวกับฉันยาวเกินไป (สูงสุด ${BIO_MAX})` }, { status: 400 });
    data.bio = v || null;
  }

  if (typeof body.avatarEmoji === 'string') {
    // เก็บอีโมจิตัวเดียว (จำกัด 4 code points กันข้อมูลเกิน แต่ไม่ตัดอีโมจิ ZWJ เช่น 🧑‍💻)
    data.avatarEmoji = [...body.avatarEmoji.trim()].slice(0, 4).join('') || null;
  }

  if (typeof body.avatarColor === 'string') {
    const c = body.avatarColor.trim();
    if (c && !VALID_COLORS.has(c as never)) return NextResponse.json({ error: 'สีไม่ถูกต้อง' }, { status: 400 });
    data.avatarColor = c || null;
  }

  if (typeof body.timezone === 'string') data.timezone = body.timezone.trim() || null;

  for (const key of ['dayStart', 'dayEnd'] as const) {
    if (typeof body[key] === 'string') {
      const t = body[key].trim();
      if (t && !TIME_RE.test(t)) return NextResponse.json({ error: 'รูปแบบเวลาไม่ถูกต้อง (HH:mm)' }, { status: 400 });
      data[key] = t || null;
    }
  }

  if (body.skills !== undefined) {
    const rawSkills: unknown[] | null = Array.isArray(body.skills) ? body.skills : null;
    if (!rawSkills) {
      return NextResponse.json({ error: 'รูปแบบทักษะไม่ถูกต้อง' }, { status: 400 });
    }
    const trimmed: string[] = rawSkills
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= SKILL_MAX_LEN);
    data.skills = [...new Set(trimmed)].slice(0, MAX_SKILLS);
  }

  if (body.maxFocusMinutes !== undefined) {
    if (body.maxFocusMinutes === null) {
      data.maxFocusMinutes = null;
    } else if (
      typeof body.maxFocusMinutes !== 'number' ||
      !Number.isInteger(body.maxFocusMinutes) ||
      body.maxFocusMinutes < MIN_FOCUS_MINUTES ||
      body.maxFocusMinutes > MAX_FOCUS_MINUTES
    ) {
      return NextResponse.json(
        { error: `ระยะเวลาโฟกัสต้องอยู่ระหว่าง ${MIN_FOCUS_MINUTES}-${MAX_FOCUS_MINUTES} นาที` },
        { status: 400 },
      );
    } else {
      data.maxFocusMinutes = body.maxFocusMinutes;
    }
  }

  if (body.bufferMinutes !== undefined) {
    if (body.bufferMinutes === null) {
      data.bufferMinutes = null;
    } else if (
      typeof body.bufferMinutes !== 'number' ||
      !Number.isInteger(body.bufferMinutes) ||
      body.bufferMinutes < MIN_BUFFER_MINUTES ||
      body.bufferMinutes > MAX_BUFFER_MINUTES
    ) {
      return NextResponse.json(
        { error: `เวลาเว้นช่วงพักต้องอยู่ระหว่าง ${MIN_BUFFER_MINUTES}-${MAX_BUFFER_MINUTES} นาที` },
        { status: 400 },
      );
    } else {
      data.bufferMinutes = body.bufferMinutes;
    }
  }

  // username: ตรวจรูปแบบ + ความไม่ซ้ำ
  if (typeof body.username === 'string') {
    const raw = body.username.trim().toLowerCase();
    if (raw === '') {
      data.username = null;
    } else if (!USERNAME_RE.test(raw)) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ ยาว 3-20 ตัว' }, { status: 400 });
    } else {
      data.username = raw;
    }
  }

  try {
    const user = await prisma.user.update({ where: { id: session.user.id }, data });
    return NextResponse.json({ ok: true, username: user.username });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว' }, { status: 409 });
    }
    throw e;
  }
}
