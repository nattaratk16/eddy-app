import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { guessCategoryKind, isCategoryKind } from '@/lib/categoryKind';
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ categories: categories.map(serialize) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body?.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  // เดาวิชาการ/ไม่ใช่วิชาการจากชื่อไว้ก่อน - ผู้ใช้แก้เองได้ทีหลังถ้าเดาผิด (ดู lib/categoryKind.ts)
  const category = await prisma.category.create({
    data: { name: body.name, color: body.color ?? 'blue', kind: guessCategoryKind(body.name), userId: session.user.id },
  });

  return NextResponse.json({ category: serialize(category) }, { status: 201 });
}
