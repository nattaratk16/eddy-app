import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { CalendarCategory } from '@/lib/types';

function serialize(cat: { id: string; name: string; color: string; shared: boolean }): CalendarCategory {
  return { id: cat.id, name: cat.name, color: cat.color as CalendarCategory['color'], shared: cat.shared };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.shared !== undefined && { shared: body.shared }),
    },
  });

  return NextResponse.json({ category: serialize(category) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ไม่ต้องลบ Event เองแล้ว - onDelete: Cascade ใน schema จัดการให้อัตโนมัติ
  await prisma.category.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
