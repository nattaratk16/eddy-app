import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateWeeklySummary } from '@/lib/gemini';
import { buildWeeklySummary } from '@/lib/aiMock';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const weekEvents: CalendarEvent[] = Array.isArray(body?.weekEvents) ? body.weekEvents : [];
  const categories: CalendarCategory[] = Array.isArray(body?.categories) ? body.categories : [];

  let summary: string | null = null;
  try {
    summary = await generateWeeklySummary({ weekEvents, categories });
  } catch {
    summary = null;
  }
  if (!summary) summary = buildWeeklySummary(weekEvents, categories);

  return NextResponse.json({ summary });
}
