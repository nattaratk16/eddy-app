import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_DEFAULT_CATEGORIES, isUserRole } from '@/lib/roles';

// POST /api/onboarding  { role?: "school"|"university"|"working", skip?: boolean }
// - เลือกบทบาท: บันทึก role + สร้าง category พื้นฐานตามวัย (ถ้ายังไม่มี) + mark onboarded
// - ข้าม: mark onboarded เฉยๆ (ไปตั้งค่าทีหลังได้)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => null);

  // ข้าม
  if (body?.skip === true) {
    await prisma.user.update({ where: { id: userId }, data: { onboardedAt: new Date() } });
    return NextResponse.json({ ok: true, skipped: true });
  }

  const role = body?.role;
  if (!isUserRole(role)) {
    return NextResponse.json({ error: 'กรุณาเลือกบทบาท' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { role, onboardedAt: new Date() } });

  // สร้าง category พื้นฐานให้ (เฉพาะถ้าผู้ใช้ยังไม่มีหมวดหมู่เลย - กันสร้างซ้ำ)
  const existingCount = await prisma.category.count({ where: { userId } });
  let categoriesCreated = 0;
  if (existingCount === 0) {
    const defaults = ROLE_DEFAULT_CATEGORIES[role];
    await prisma.category.createMany({
      data: defaults.map((c) => ({ userId, name: c.name, color: c.color })),
    });
    categoriesCreated = defaults.length;
  }

  return NextResponse.json({ ok: true, role, categoriesCreated });
}
