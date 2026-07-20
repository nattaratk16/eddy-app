// ตัวช่วยสำหรับระบบกลุ่ม (เฟส 3) - สิทธิ์การเข้าถึง + แปลงข้อมูลส่งออก
import { prisma } from './prisma';
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
  group: { id: string; name: string; description: string | null; color: string; ownerId: string },
  currentUserId: string,
  opts?: { memberCount?: number; members?: MemberWithUser[] },
): GroupInfo {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    color: group.color as PastelColor,
    ownerId: group.ownerId,
    isOwner: group.ownerId === currentUserId,
    memberCount: opts?.memberCount ?? opts?.members?.filter((m) => m.status === 'accepted').length ?? 0,
    members: opts?.members?.map((m) => serializeMember(m, currentUserId)),
  };
}
