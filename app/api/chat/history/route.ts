/**
 * GET    /api/chat/history  - ประวัติแชทล่าสุดของฉัน (เรียงเก่า -> ใหม่)
 * DELETE /api/chat/history  - ล้างประวัติแชททั้งหมดของฉัน
 * --------------------------------------------------------------
 * โหลดตอนเปิดหน้าต่างแชทเท่านั้น ไม่ได้โหลดพร้อมทุกหน้า
 * เพื่อไม่ให้เพิ่มงานให้ทุกหน้าที่มีปุ่มแชทลอยอยู่
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ParsedMessageIntent } from '@/lib/gemini';

/** จำนวนข้อความย้อนหลังที่ดึงมาแสดง - พอให้ต่อบทสนทนาได้โดยไม่หนักเกิน */
const HISTORY_LIMIT = 40;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // เอาข้อความล่าสุด N ข้อความ แล้วกลับลำดับให้เก่าอยู่บน (อ่านจากบนลงล่างตามปกติ)
  const rows = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
    select: { id: true, role: true, text: true, draft: true, createdAt: true },
  });

  const messages = rows.reverse().map((m) => {
    let draft: ParsedMessageIntent | undefined;
    if (m.draft) {
      try {
        draft = JSON.parse(m.draft) as ParsedMessageIntent;
      } catch {
        draft = undefined; // ข้อมูลเก่าเสียหาย - แสดงแค่ข้อความก็พอ
      }
    }
    return { id: m.id, role: m.role as 'user' | 'eddy', text: m.text, draft, at: m.createdAt.toISOString() };
  });

  return NextResponse.json({ messages });
}

export async function DELETE(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { count } = await prisma.chatMessage.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true, deleted: count });
}
