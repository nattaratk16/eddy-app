import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateWeeklySummary, buildUserProfileContext } from '@/lib/gemini';
import { buildWeeklySummary } from '@/lib/aiMock';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const weekEvents: CalendarEvent[] = Array.isArray(body?.weekEvents) ? body.weekEvents : [];
  const categories: CalendarCategory[] = Array.isArray(body?.categories) ? body.categories : [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, bio: true, dayStart: true, dayEnd: true, timezone: true },
  });

  let summary: string | null = null;
  try {
    summary = await generateWeeklySummary({
      weekEvents,
      categories,
      userProfile: user ? buildUserProfileContext(user) : undefined,
    });
  } catch {
    summary = null;
  }
  if (!summary) summary = buildWeeklySummary(weekEvents, categories);

  return NextResponse.json({ summary });
}
