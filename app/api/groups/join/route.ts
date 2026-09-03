/**
 * POST /api/groups/join  { code: "K7M2QD" }
 * --------------------------------------------------------------
 * เข้าร่วมกลุ่มด้วยรหัสกลุ่ม โดยไม่ต้องรอเจ้าของกลุ่มเชิญทางอีเมล
 * (เดิมเข้ากลุ่มได้ทางเดียวคือรอคนอื่นเชิญ ซึ่งจำกัดเกินไป)
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { serializeGroup } from '@/lib/groups';
import { isValidJoinCode, normalizeJoinCode } from '@/lib/joinCode';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const code = normalizeJoinCode(typeof body?.code === 'string' ? body.code : '');
  if (!code) return NextResponse.json({ error: 'กรุณากรอกรหัสกลุ่ม' }, { status: 400 });
  if (!isValidJoinCode(code)) {
    return NextResponse.json({ error: 'รหัสกลุ่มต้องเป็นตัวอักษร/ตัวเลข 6 ตัว' }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { joinCode: code },
    include: { members: { where: { status: 'accepted' }, select: { id: true } } },
  });
  if (!group) return NextResponse.json({ error: 'ไม่พบกลุ่มที่ใช้รหัสนี้ ลองตรวจสอบอีกครั้ง' }, { status: 404 });

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });

  // เป็นสมาชิกอยู่แล้ว = ไม่ต้องทำอะไร (กดซ้ำก็ไม่พัง) แค่พากลับเข้ากลุ่ม
  if (existing?.status === 'accepted') {
    return NextResponse.json({
      group: serializeGroup(group, userId, { memberCount: group.members.length }),
      alreadyMember: true,
    });
  }

  // เคยถูกเชิญไว้/เคยปฏิเสธไว้ -> อัปเกรดแถวเดิมเป็นสมาชิกเลย
  if (existing) {
    await prisma.groupMember.update({ where: { id: existing.id }, data: { status: 'accepted' } });
  } else {
    // showEventTitles ไม่ใส่ตรงนี้ - ปล่อยให้ใช้ค่า default (false) ของ schema เหมือนตอนถูกเชิญปกติ
    // (ปฏิทินรวมของกลุ่มควรเห็นแค่ "ว่าง/ไม่ว่าง" เป็นค่าเริ่มต้นเสมอ ไม่ว่าจะเข้ากลุ่มด้วยรหัสหรือถูกเชิญ)
    await prisma.groupMember.create({
      data: { groupId: group.id, userId, role: 'member', status: 'accepted' },
    });
  }

  return NextResponse.json({
    group: serializeGroup(group, userId, { memberCount: group.members.length + 1 }),
    alreadyMember: false,
  });
}
