import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateWeeklySummary, buildUserProfileContext } from '@/lib/gemini';
import { buildWeeklySummary } from '@/lib/aiMock';
import { getCachedAiText, hashCacheInput, setCachedAiText } from '@/lib/aiCache';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

const CACHE_KIND = 'weekly-summary';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const weekEvents: CalendarEvent[] = Array.isArray(body?.weekEvents) ? body.weekEvents : [];
  const categories: CalendarCategory[] = Array.isArray(body?.categories) ? body.categories : [];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, bio: true, dayStart: true, dayEnd: true, timezone: true },
  });
  const userProfile = user ? buildUserProfileContext(user) : undefined;

  // เรียงตาม id ก่อน hash กันเคส client ส่งลำดับต่างกันแต่เป็นข้อมูลชุดเดียวกัน (ไม่งั้น cache miss เก้อ)
  const cacheKey = hashCacheInput({
    weekEvents: [...weekEvents].sort((a, b) => a.id.localeCompare(b.id)),
    categories: [...categories].sort((a, b) => a.id.localeCompare(b.id)),
    userProfile,
  });
  const cached = await getCachedAiText(userId, CACHE_KIND, cacheKey);
  if (cached) return NextResponse.json({ summary: cached });

  let summary: string | null = null;
  try {
    summary = await generateWeeklySummary({ weekEvents, categories, userProfile });
  } catch {
    summary = null;
  }
  if (summary) {
    await setCachedAiText(userId, CACHE_KIND, cacheKey, summary);
  } else {
    summary = buildWeeklySummary(weekEvents, categories);
  }

  return NextResponse.json({ summary });
}
