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
    // เรียงด้วย id เป็นตัวตัดสินสำรอง เผื่อข้อความเก่าที่บันทึกไว้ด้วยเวลาเดียวกันเป๊ะ
    // (cuid ที่ prisma สร้างเรียงตามลำดับการสร้างอยู่แล้ว)
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
    return {
      id: m.id,
      role: m.role as 'user' | 'eddy',
      text: m.text,
      draft,
      // การ์ดที่เคยกดเพิ่มไปแล้ว - กันกดซ้ำแล้วได้งานซ้ำหลังรีเฟรช
      added: draft ? (draft as ParsedMessageIntent & { added?: boolean }).added === true : false,
      at: m.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ messages });
}

/** PATCH /api/chat/history { id } - ทำเครื่องหมายว่าการ์ดของข้อความนี้ถูกเพิ่มไปแล้ว */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const row = await prisma.chatMessage.findUnique({ where: { id }, select: { userId: true, draft: true } });
  if (!row || row.userId !== session.user.id) return NextResponse.json({ error: 'ไม่พบข้อความ' }, { status: 404 });
  if (!row.draft) return NextResponse.json({ ok: true });

  let draft: Record<string, unknown>;
  try {
    draft = JSON.parse(row.draft);
  } catch {
    return NextResponse.json({ ok: true }); // draft เสีย ไม่ต้องทำอะไรต่อ
  }
  await prisma.chatMessage.update({
    where: { id },
    data: { draft: JSON.stringify({ ...draft, added: true }) },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { count } = await prisma.chatMessage.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true, deleted: count });
}
