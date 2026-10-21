import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_DEFAULT_CATEGORIES, isUserRole } from '@/lib/roles';

// POST /api/onboarding  { role?: "university"|"teacher", skip?: boolean }
// - เลือกบทบาท: บันทึก role + สร้าง category พื้นฐานตามบทบาท (ถ้ายังไม่มี) + mark onboarded
//   role "teacher" ใช้กฎง่ายๆ ตามที่อาจารย์ที่ปรึกษาขอ: "คนแรกที่เลือกอาจารย์ คือ อาจารย์ไปเลย"
//   (ไม่ต้องมี invite code ให้วุ่นวาย) - ถ้ามีคนเป็น teacher อยู่แล้วในระบบ คนถัดไปเลือกไม่ได้อีก
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

  if (role === 'teacher') {
    // คนแรกที่เลือก role นี้เท่านั้นที่ได้ - เช็คว่ามีใครเป็น teacher อยู่แล้วหรือยัง (ไม่นับตัวเอง
    // เผื่อกรณี onboarding ซ้ำ/กลับมาเลือกอีกรอบ) หมายเหตุ: ไม่ได้ล็อกกัน race condition สองคนกดพร้อมกัน
    // เป๊ะๆ เพราะตั้งใจให้เป็นกฎง่ายๆ ตามที่ขอ ไม่ใช่ระบบแจกสิทธิ์ที่ต้องรัดกุมระดับนั้น
    const existingTeacher = await prisma.user.findFirst({ where: { role: 'teacher', id: { not: userId } } });
    if (existingTeacher) {
      return NextResponse.json({ error: 'มีอาจารย์อยู่ในระบบแล้ว ติดต่อผู้ดูแลระบบถ้าต้องการสิทธิ์นี้' }, { status: 403 });
    }
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
