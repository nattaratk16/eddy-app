// ตัวช่วยสำหรับระบบกลุ่ม (เฟส 3) - สิทธิ์การเข้าถึง + แปลงข้อมูลส่งออก
import { prisma } from './prisma';
import { generateJoinCode } from './joinCode';
import type { GroupInfo, GroupMemberInfo, PastelColor } from './types';
import type { GroupMember, User } from '@prisma/client';

/** ดึงแถวสมาชิกของผู้ใช้ในกลุ่ม (null ถ้าไม่ได้อยู่ในกลุ่ม/ยังไม่ถูกเชิญ) */
export function getMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

/** ผู้ใช้เป็นสมาชิกที่รับคำเชิญแล้วหรือไม่ (เห็นข้อมูลกลุ่มได้) */
export async function isAcceptedMember(groupId: string, userId: string): Promise<boolean> {
  const m = await getMembership(groupId, userId);
  return !!m && m.status === 'accepted';
}

type MemberWithUser = GroupMember & { user: Pick<User, 'id' | 'name' | 'email' | 'image'> };

export function serializeMember(m: MemberWithUser, currentUserId: string): GroupMemberInfo {
  return {
    id: m.id,
    userId: m.userId,
    name: m.user.name || m.user.email.split('@')[0],
    email: m.user.email,
    image: m.user.image,
    role: m.role as GroupMemberInfo['role'],
    status: m.status as GroupMemberInfo['status'],
    showEventTitles: m.showEventTitles,
    isMe: m.userId === currentUserId,
  };
}

export function serializeGroup(
  group: { id: string; name: string; description: string | null; color: string; ownerId: string; joinCode?: string | null },
  currentUserId: string,
  opts?: { memberCount?: number; members?: MemberWithUser[]; avatars?: { name: string; image: string | null }[] },
): GroupInfo {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    color: group.color as PastelColor,
    ownerId: group.ownerId,
    isOwner: group.ownerId === currentUserId,
    joinCode: group.joinCode ?? null,
    memberCount: opts?.memberCount ?? opts?.members?.filter((m) => m.status === 'accepted').length ?? 0,
    members: opts?.members?.map((m) => serializeMember(m, currentUserId)),
    memberAvatars: opts?.avatars,
  };
}

/**
 * หา joinCode ที่ยังไม่ซ้ำ แล้วบันทึกให้กลุ่ม
 * กลุ่มที่สร้างก่อนมีฟีเจอร์นี้จะยังไม่มีรหัส - เรียกฟังก์ชันนี้ตอนที่ต้องใช้ครั้งแรก
 */
export async function ensureJoinCode(groupId: string, existing?: string | null): Promise<string> {
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateJoinCode();
    const taken = await prisma.group.findUnique({ where: { joinCode: code }, select: { id: true } });
    if (taken) continue;
    const updated = await prisma.group.update({ where: { id: groupId }, data: { joinCode: code } });
    return updated.joinCode!;
  }
  throw new Error('สร้างรหัสกลุ่มไม่สำเร็จ ลองใหม่อีกครั้ง');
}
