import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';
import { PASTEL_COLORS } from '@/lib/colors';
import { NOT_DEADLINE_EVENT } from '@/lib/eventFilters';
import { todayISOBangkok } from '@/lib/thaiTime';

// GET /api/groups/[id]/calendar?start=YYYY-MM-DD
// คืน event ของสมาชิกทุกคน (accepted) ในสัปดาห์นั้น แยกสีต่อคน + mask ชื่อตามความเป็นส่วนตัว
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const me = await getMembership(params.id, userId);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 404 });
  }

  // ช่วงสัปดาห์ (UTC midnight ให้ตรงกับที่เก็บ event.date)
  const startParam = req.nextUrl.searchParams.get('start');
  let start: Date;
  if (startParam && /^\d{4}-\d{2}-\d{2}$/.test(startParam)) {
    start = new Date(`${startParam}T00:00:00.000Z`);
  } else {
    // ใช้ "วันนี้ตามเวลาไทย" เป็นฐาน ไม่ใช่ new Date() + getUTCDay() ตรงๆ - ช่วง 00:00-06:59 น. เวลาไทย
    // ยังเป็นเมื่อวานใน UTC ทำให้ getUTCDay() อ่านวันในสัปดาห์ผิด แล้วได้ start ของสัปดาห์ที่แล้วแทน
    // (เที่ยงคืน UTC ของวันที่ตามเวลาไทยตรงกับที่ Event.date เก็บอยู่แล้ว - เหมือน lib/weeklyBurndown.ts)
    const todayAnchor = new Date(`${todayISOBangkok()}T00:00:00.000Z`);
    start = new Date(todayAnchor.getTime() - todayAnchor.getUTCDay() * 86400000);
  }
  const end = new Date(start.getTime() + 7 * 86400000);

  // สมาชิกที่รับคำเชิญแล้ว (เจ้าของก่อน ตาม createdAt)
  const members = await prisma.groupMember.findMany({
    where: { groupId: params.id, status: 'accepted' },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const memberUserIds = members.map((m) => m.userId);
  const showTitlesByUser = new Map(members.map((m) => [m.userId, m.showEventTitles]));

  const events = await prisma.event.findMany({
    // หมุดกำหนดส่งเป็นตัวช่วยวางแผนส่วนตัว ไม่ใช่ช่วงเวลาที่ไม่ว่างจริง
    // ไม่ควรโผล่ในปฏิทินกลุ่มเป็นแท่งสีทึบ (จะทำให้เพื่อนเข้าใจผิดว่าคนนั้นติดธุระ)
    where: { userId: { in: memberUserIds }, date: { gte: start, lt: end }, ...NOT_DEADLINE_EVENT },
    orderBy: { date: 'asc' },
  });

  // สีประจำสมาชิก (ไล่จากพาเลตให้ไม่ซ้ำ)
  const memberColor = new Map<string, string>();
  members.forEach((m, i) => memberColor.set(m.userId, PASTEL_COLORS[i % PASTEL_COLORS.length].value));

  const membersOut = members.map((m) => ({
    id: m.userId, // ใช้ userId เป็น "categoryId" ให้ TimeGridView ระบายสีตามคน
    name: m.user.name || m.user.email.split('@')[0],
    color: memberColor.get(m.userId),
    image: m.user.image,
    isMe: m.userId === userId,
    showEventTitles: m.showEventTitles,
  }));

  const group = await prisma.group.findUnique({ where: { id: params.id }, select: { name: true } });

  const eventsOut = events.map((ev) => {
    const isMine = ev.userId === userId;
    const canSeeTitle = isMine || showTitlesByUser.get(ev.userId) === true;
    return {
      id: ev.id,
      title: canSeeTitle ? ev.title : 'ไม่ว่าง',
      date: ev.date.toISOString().slice(0, 10),
      startTime: ev.startTime ?? undefined,
      endTime: ev.endTime ?? undefined,
      location: canSeeTitle ? ev.location ?? undefined : undefined,
      categoryId: ev.userId, // ผูกกับสมาชิก (สี)
    };
  });

  return NextResponse.json({
    groupName: group?.name ?? 'กลุ่ม',
    members: membersOut,
    events: eventsOut,
    weekStart: start.toISOString().slice(0, 10),
  });
}
