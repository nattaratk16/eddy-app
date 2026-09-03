import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { askEddy, parseMessageToEvent } from '@/lib/gemini';
import { ROLE_AI_CONTEXT, isUserRole } from '@/lib/roles';
import { parseEventFromText } from '@/lib/aiMock';
import { buildSlotAdvice, DEFAULT_EVENT_MINUTES, type BusyItem } from '@/lib/slotAdvice';
import { expandRecurring, parseDays } from '@/lib/recurring';
import type { CalendarCategory } from '@/lib/types';

const mockReplies = [
  'ได้เลย! ลองดูที่หน้า "สิ่งที่ต้องทำ" นะ ผมจัดลำดับความสำคัญให้แล้ว',
  'วันนี้คุณมีงานสำคัญมาก 1 รายการ แนะนำให้ทำก่อนเลย!',
  'ผมช่วยเพิ่มลงปฏิทินให้ได้นะ บอกวันและเวลามาได้เลย',
  'เก่งมาก! วันนี้ทำงานไปได้หลายอย่างแล้ว พักสักหน่อยก็ดีนะ',
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const message: string = typeof body?.message === 'string' ? body.message : '';

  if (!message.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const userId = session.user.id;
  // ใช้เวลาไทย (Asia/Bangkok) เสมอ ไม่พึ่ง timezone ของเครื่อง/เซิร์ฟเวอร์ที่รันโค้ดอยู่
  // (new Date().toISOString() จะได้ UTC เสมอ ซึ่งช่วง 00:00-06:59 น. เวลาไทยจะยังเป็น "เมื่อวาน" ใน UTC)
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  const todayStart = new Date(`${todayISO}T00:00:00+07:00`);

  const [tasks, events, categoriesRaw, user] = await Promise.all([
    prisma.task.findMany({ where: { userId, done: false }, orderBy: { createdAt: 'desc' }, take: 5 }),
    // เทียบกับต้นวันนี้ (เที่ยงคืน) ไม่ใช่เวลาปัจจุบันเป๊ะๆ ไม่งั้นกิจกรรมที่เหลือของวันนี้จะถูกกรองออกไปหลังเที่ยงคืนผ่านมาแล้ว
    prisma.event.findMany({ where: { userId, date: { gte: todayStart } }, orderBy: { date: 'asc' }, take: 5 }),
    prisma.category.findMany({ where: { userId } }),
    // โปรไฟล์ผู้ใช้ - เอานิสัย/ตัวตน + ช่วงเวลาที่สะดวก ไปให้เอ็ดดี้ตอบได้เฉพาะตัวขึ้น
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true, bio: true, dayStart: true, dayEnd: true, timezone: true } }),
  ]);
  const categories: CalendarCategory[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color as CalendarCategory['color'],
  }));

  // บริบทเกี่ยวกับตัวผู้ใช้ (ถ้ากรอกไว้) เพื่อให้ AI วิเคราะห์/แนะนำได้เข้ากับนิสัยและเวลาของแต่ละคน
  const profileLines = [
    user?.name ? `ชื่อผู้ใช้: ${user.name}` : '',
    user && isUserRole(user.role) ? ROLE_AI_CONTEXT[user.role] : '',
    user?.bio ? `นิสัย/ตัวตนของผู้ใช้: ${user.bio}` : '',
    user?.dayStart || user?.dayEnd
      ? `ช่วงเวลาที่ผู้ใช้สะดวกทำงาน: ${user?.dayStart || '—'}-${user?.dayEnd || '—'} น. (${user?.timezone || 'Asia/Bangkok'})`
      : '',
  ].filter(Boolean);

  const context = [
    ...profileLines,
    `งานที่ยังไม่เสร็จ: ${tasks.map((t) => t.title).join(', ') || 'ไม่มี'}`,
    `กิจกรรมที่จะถึง: ${events.map((e) => `${e.title} (${e.date.toISOString().slice(0, 10)})`).join(', ') || 'ไม่มี'}`,
  ].join('\n');

  const [replyResult, draftResult] = await Promise.allSettled([
    askEddy({ message, context }),
    parseMessageToEvent({ message, todayISO, categories }),
  ]);

  const reply =
    replyResult.status === 'fulfilled' ? replyResult.value : mockReplies[Math.floor(Math.random() * mockReplies.length)];

  let draft = draftResult.status === 'fulfilled' ? draftResult.value : null;
  if (!draft) {
    const fallback = parseEventFromText(message);
    draft = fallback ? { intent: 'event' as const, ...fallback } : null;
  }
  if (draft && draft.intent === 'none') draft = null;

  // ---- ผู้ใช้ระบุวันมาแล้ว: ดูให้หน่อยว่าวันนั้นชนของเดิมหรือแน่นเกินไปไหม ----
  // ถ้าใช่ ให้เสนอช่วงเวลาอื่นไปด้วย (ผู้ใช้จะเลือกหรือใช้เวลาเดิมก็ได้)
  let slotAdvice = null;
  if (draft?.intent === 'event' && draft.date) {
    slotAdvice = await adviseSlot(userId, draft.date, draft.startTime ?? null);
  }

  // เก็บบทสนทนาไว้ - เปิดแชทครั้งหน้าจะได้อ่านย้อนได้ (เขียนทีเดียว 2 แถว ประหยัด round trip)
  // เก็บ draft ไปด้วยเพื่อให้กลับมากดเพิ่มลงปฏิทิน/สิ่งที่ต้องทำต่อได้
  // แต่ไม่เก็บ slotAdvice เพราะช่วงเวลาว่างเปลี่ยนตลอด ต้องคำนวณสดเสมอ
  try {
    // ต้องกำหนดเวลาเองให้ต่างกัน 1 ms: createMany เขียนพร้อมกัน default now() จะได้ค่าเท่ากันเป๊ะ
    // แล้วตอนดึงประวัติกลับมาเรียงตามเวลา ลำดับของสองข้อความนี้จะสลับกันแบบสุ่ม
    // (คำตอบเอ็ดดี้ไปโผล่เหนือคำถามของผู้ใช้)
    const askedAt = new Date();
    await prisma.chatMessage.createMany({
      data: [
        { userId, role: 'user', text: message, createdAt: askedAt },
        {
          userId,
          role: 'eddy',
          text: reply,
          draft: draft ? JSON.stringify(draft) : null,
          createdAt: new Date(askedAt.getTime() + 1),
        },
      ],
    });
  } catch {
    // บันทึกประวัติไม่สำเร็จไม่ควรทำให้แชทพัง - ตอบผู้ใช้ต่อไปตามปกติ
  }

  return NextResponse.json({ reply, draft, slotAdvice });
}

/**
 * ดึงกิจกรรม + Loop ประจำรอบวันที่ผู้ใช้ขอ แล้วให้ lib/slotAdvice ประเมินว่าควรเสนอเวลาอื่นไหม
 * (คำนวณ local ล้วน ไม่เรียก Gemini - เรื่องเวลาว่างต้องแม่น)
 */
async function adviseSlot(userId: string, date: string, startTime: string | null) {
  const LOOKAHEAD = 4; // วันที่ขอ + อีก 3 วัน เผื่อวันนั้นเต็ม
  const from = new Date(`${date}T00:00:00.000Z`);
  const to = new Date(from.getTime() + LOOKAHEAD * 86400000);
  const dates = Array.from({ length: LOOKAHEAD }, (_, i) =>
    new Date(from.getTime() + i * 86400000).toISOString().slice(0, 10),
  );

  const [dayEvents, recurringRows, profile] = await Promise.all([
    prisma.event.findMany({
      // หมุดกำหนดส่งไม่ใช่เวลาไม่ว่าง ไม่ต้องเอามาเสนอเป็น "ชนกัน" หรือทำให้วันดูแน่นเกินจริง
      where: { userId, date: { gte: from, lt: to }, isDeadline: false },
      select: { title: true, date: true, startTime: true, endTime: true },
    }),
    prisma.recurringEvent.findMany({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { dayStart: true, dayEnd: true } }),
  ]);

  const busy: BusyItem[] = dayEvents.map((e) => ({
    title: e.title,
    date: e.date.toISOString().slice(0, 10),
    startTime: e.startTime,
    endTime: e.endTime,
  }));

  // Loop ประจำก็คือเวลาไม่ว่างเหมือนกัน
  const loops = expandRecurring(
    recurringRows.map((r) => ({
      id: r.id,
      title: r.title,
      courseCode: r.courseCode,
      days: parseDays(r.days),
      startTime: r.startTime,
      endTime: r.endTime,
      categoryId: r.categoryId,
      endDate: r.endDate ? r.endDate.toISOString().slice(0, 10) : null,
    })),
    dates,
  );
  for (const l of loops) {
    busy.push({ title: l.title, date: l.date, startTime: l.startTime, endTime: l.endTime });
  }

  return buildSlotAdvice({
    date,
    startTime,
    durationMin: DEFAULT_EVENT_MINUTES,
    busy,
    dayStart: profile?.dayStart,
    dayEnd: profile?.dayEnd,
  });
}
