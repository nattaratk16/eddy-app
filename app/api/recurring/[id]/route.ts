import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { serializeDays } from '@/lib/recurring';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// PATCH /api/recurring/[id] - แก้ไข Loop
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.recurringEvent.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'ไม่พบรายการนี้' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.title === 'string') {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: 'ชื่อห้ามว่าง' }, { status: 400 });
    data.title = t;
  }
  if (Array.isArray(body?.days)) {
    const d = serializeDays(body.days.map(Number));
    if (!d) return NextResponse.json({ error: 'เลือกวันอย่างน้อย 1 วัน' }, { status: 400 });
    data.days = d;
  }
  for (const key of ['startTime', 'endTime'] as const) {
    if (typeof body?.[key] === 'string') {
      if (!TIME_RE.test(body[key])) return NextResponse.json({ error: 'เวลาไม่ถูกต้อง' }, { status: 400 });
      data[key] = body[key];
    }
  }
  if (typeof body?.categoryId === 'string') data.categoryId = body.categoryId || null;
  if (body?.endDate === null) data.endDate = null;
  else if (typeof body?.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.endDate)) {
    data.endDate = new Date(`${body.endDate}T00:00:00.000Z`);
  }

  await prisma.recurringEvent.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

// DELETE /api/recurring/[id] - ลบ Loop
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.recurringEvent.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'ไม่พบรายการนี้' }, { status: 404 });
  }

  await prisma.recurringEvent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
