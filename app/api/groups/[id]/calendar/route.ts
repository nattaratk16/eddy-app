import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';
import { PASTEL_COLORS } from '@/lib/colors';
import { NOT_DEADLINE_EVENT, eventOverlapsWindow } from '@/lib/eventFilters';
import { todayISOBangkok } from '@/lib/thaiTime';
import { expandRecurring, parseDays } from '@/lib/recurring';
import type { RecurringEventInfo } from '@/lib/types';

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
    where: { userId: { in: memberUserIds }, ...eventOverlapsWindow(start, end), ...NOT_DEADLINE_EVENT },
    orderBy: { date: 'asc' },
  });

  // event ที่มาจากงานกลุ่มนี้โดยตรง (ยืนยันลงปฏิทินแล้ว) - ใช้ไฮไลต์ให้เด่นกว่ากิจกรรมส่วนตัวอื่นของสมาชิก
  const groupAssignments = await prisma.groupTaskAssignment.findMany({
    where: { groupTask: { groupId: params.id }, status: 'approved', approvedEventId: { not: null } },
    select: { approvedEventId: true },
  });
  const groupEventIds = new Set(groupAssignments.map((a) => a.approvedEventId));

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

  const group = await prisma.group.findUnique({ where: { id: params.id }, select: { name: true, code: true } });

  const eventsOut = events.map((ev) => {
    const isMine = ev.userId === userId;
    const canSeeTitle = isMine || showTitlesByUser.get(ev.userId) === true;
    return {
      id: ev.id,
      title: canSeeTitle ? ev.title : 'ไม่ว่าง',
      date: ev.date.toISOString().slice(0, 10),
      endDate: ev.endDate ? ev.endDate.toISOString().slice(0, 10) : undefined,
      startTime: ev.startTime ?? undefined,
      endTime: ev.endTime ?? undefined,
      location: canSeeTitle ? ev.location ?? undefined : undefined,
      categoryId: ev.userId, // ผูกกับสมาชิก (สี)
      isGroupEvent: groupEventIds.has(ev.id),
    };
  });

  // รวม block ปฏิทินของ "คาบเรียน" (Loop ที่มีรหัสวิชา) เฉพาะกลุ่มที่เป็นคลาสเรียน (มี Group.code)
  // เท่านั้น - กลุ่มทั่วไปไม่โชว์ Loop ของสมาชิกเลย (ของเดิมก็ไม่โชว์อยู่แล้ว ไม่เปลี่ยนพฤติกรรม)
  // ถ้าสมาชิก ≥2 คนมี Loop รหัสวิชาเดียวกัน วันเวลาเดียวกัน ให้ยุบเป็น 1 block เดียว โชว์ชื่อสมาชิกแทน
  // ที่จะซ้อนกันทีละคน (ถ้ามีแค่คนเดียวก็โชว์เป็น block เดี่ยวสีประจำคนนั้นแบบปกติ)
  const courseBlocksOut: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    categoryId: string;
  }[] = [];
  if (group?.code) {
    const recurringRows = await prisma.recurringEvent.findMany({
      where: { userId: { in: memberUserIds }, courseCode: { not: null } },
    });
    const recurringByUser = new Map<string, RecurringEventInfo[]>();
    for (const r of recurringRows) {
      const arr = recurringByUser.get(r.userId) ?? [];
      arr.push({
        id: r.id,
        title: r.title,
        courseCode: r.courseCode,
        days: parseDays(r.days),
        startTime: r.startTime,
        endTime: r.endTime,
        categoryId: r.categoryId,
        startDate: r.startDate ? r.startDate.toISOString().slice(0, 10) : null,
        endDate: r.endDate ? r.endDate.toISOString().slice(0, 10) : null,
      });
      recurringByUser.set(r.userId, arr);
    }

    const weekDates = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10));
    const nameByUser = new Map(membersOut.map((m) => [m.id, m.name]));
    // key = "รหัสวิชา|วันที่|เวลาเริ่ม|เวลาจบ" -> รายชื่อ userId ที่ตรงกันทั้งหมด
    const byKey = new Map<string, { courseCode: string; date: string; startTime: string; endTime: string; userIds: string[] }>();
    for (const [uid, list] of recurringByUser) {
      for (const ev of expandRecurring(list, weekDates)) {
        if (!ev.courseCode || !ev.startTime || !ev.endTime) continue;
        const key = `${ev.courseCode}|${ev.date}|${ev.startTime}|${ev.endTime}`;
        const entry = byKey.get(key) ?? { courseCode: ev.courseCode, date: ev.date, startTime: ev.startTime, endTime: ev.endTime, userIds: [] };
        // กัน uid ซ้ำ - ถ้าคนคนเดียวมี Loop รหัสวิชาเดียวกัน วัน/เวลาเดียวกัน 2 รายการ (สร้างซ้ำโดยไม่ตั้งใจ)
        // ไม่งั้นจะดูเหมือนมี "เพื่อน 2 คน" ลงเรียนตรงกันทั้งที่เป็นคนเดียวกัน
        if (!entry.userIds.includes(uid)) entry.userIds.push(uid);
        byKey.set(key, entry);
      }
    }
    for (const [key, entry] of byKey) {
      const names = entry.userIds.map((uid) => nameByUser.get(uid) ?? 'เพื่อน');
      courseBlocksOut.push({
        id: `course:${key}`,
        // ≥2 คนตรงกัน = รวม block เดียวโชว์ชื่อทุกคนแทนที่จะซ้อนกันทีละคน (ชื่อเต็มอยู่ใน title เสมอ
        // แม้ถูก CSS truncate ตัดใน TimeGridView ก็ยังดูครบได้จาก title attribute ของเบราว์เซอร์)
        title: entry.userIds.length > 1 ? `${entry.courseCode} · ${names.join(', ')}` : `${entry.courseCode} ${names[0]}`,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        // คนเดียว = ใช้สีประจำคนนั้นเหมือน event ปกติ, ≥2 คน = ใช้สีกลาง "__course__" แยกจากสีสมาชิกคนไหนคนเดียว
        categoryId: entry.userIds.length > 1 ? '__course__' : entry.userIds[0],
      });
    }
  }

  return NextResponse.json({
    groupName: group?.name ?? 'กลุ่ม',
    members: membersOut,
    events: [...eventsOut, ...courseBlocksOut],
    weekStart: start.toISOString().slice(0, 10),
  });
}
