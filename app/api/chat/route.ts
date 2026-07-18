import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { askEddy, parseMessageToEvent } from '@/lib/gemini';
import { parseEventFromText } from '@/lib/aiMock';
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

  const [tasks, events, categoriesRaw] = await Promise.all([
    prisma.task.findMany({ where: { userId, done: false }, orderBy: { createdAt: 'desc' }, take: 5 }),
    // เทียบกับต้นวันนี้ (เที่ยงคืน) ไม่ใช่เวลาปัจจุบันเป๊ะๆ ไม่งั้นกิจกรรมที่เหลือของวันนี้จะถูกกรองออกไปหลังเที่ยงคืนผ่านมาแล้ว
    prisma.event.findMany({ where: { userId, date: { gte: todayStart } }, orderBy: { date: 'asc' }, take: 5 }),
    prisma.category.findMany({ where: { userId } }),
  ]);
  const categories: CalendarCategory[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color as CalendarCategory['color'],
  }));

  const context =
    `งานที่ยังไม่เสร็จ: ${tasks.map((t) => t.title).join(', ') || 'ไม่มี'}\n` +
    `กิจกรรมที่จะถึง: ${events.map((e) => `${e.title} (${e.date.toISOString().slice(0, 10)})`).join(', ') || 'ไม่มี'}`;

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

  return NextResponse.json({ reply, draft });
}
