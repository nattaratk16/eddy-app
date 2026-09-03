import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isCategoryKind } from '@/lib/categoryKind';
import type { CalendarCategory } from '@/lib/types';

function serialize(cat: { id: string; name: string; color: string; shared: boolean; kind: string }): CalendarCategory {
  return {
    id: cat.id,
    name: cat.name,
    color: cat.color as CalendarCategory['color'],
    shared: cat.shared,
    kind: isCategoryKind(cat.kind) ? cat.kind : 'non_academic',
  };
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
      // แก้ทับคำเดาอัตโนมัติได้เสมอ (ต้องเป็นค่าที่รู้จักเท่านั้น กันข้อมูลเพี้ยน)
      ...(isCategoryKind(body.kind) && { kind: body.kind }),
    },
  });

  return NextResponse.json({ category: serialize(category) });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
