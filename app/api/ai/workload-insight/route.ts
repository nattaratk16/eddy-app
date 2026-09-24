import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateWorkloadInsight, buildUserProfileContext } from '@/lib/gemini';
import { buildWorkloadInsight } from '@/lib/aiMock';
import { computeBurnoutRisk, type BurnoutSignals } from '@/lib/burnoutRisk';
import { getCachedAiText, hashCacheInput, setCachedAiText } from '@/lib/aiCache';

const CACHE_KIND = 'workload-insight';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const signals: BurnoutSignals = {
    avgUtilizationPct: Number(body?.signals?.avgUtilizationPct) || 0,
    overloadDays: Number(body?.signals?.overloadDays) || 0,
    overdueCount: Number(body?.signals?.overdueCount) || 0,
    urgentPileupCount: Number(body?.signals?.urgentPileupCount) || 0,
  };
  // คำนวณ risk/band ใหม่ฝั่งเซิร์ฟเวอร์เอง ไม่เชื่อค่า band ที่ client ส่งมาตรงๆ
  // (signals เป็นแค่ตัวเลขไปประกอบ prompt ไม่ได้ใช้ตัดสินสิทธิ์อะไร แต่คำนวณเองก็ไม่มีต้นทุนเพิ่ม)
  const risk = computeBurnoutRisk(signals);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, bio: true, dayStart: true, dayEnd: true, timezone: true },
  });
  const userProfile = user ? buildUserProfileContext(user) : undefined;

  // เปิด/ปิดหน้าแดชบอร์ดซ้ำโดยภาระงานไม่เปลี่ยนเลย ไม่ควรต้องยิง Gemini ใหม่ทุกรอบ (ดู lib/aiCache.ts)
  const cacheKey = hashCacheInput({ signals, band: risk.band, userProfile });
  const cached = await getCachedAiText(userId, CACHE_KIND, cacheKey);
  if (cached) return NextResponse.json({ insight: cached });

  let insight: string | null = null;
  try {
    insight = await generateWorkloadInsight({ signals, band: risk.band, userProfile });
  } catch {
    insight = null;
  }
  if (insight) {
    await setCachedAiText(userId, CACHE_KIND, cacheKey, insight);
  } else {
    insight = buildWorkloadInsight(risk);
  }

  return NextResponse.json({ insight });
}
