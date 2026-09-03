/**
 * GET /api/groups/[id]/workload
 * --------------------------------------------------------------
 * ภาระงานของสมาชิกทุกคนใน 7 วันข้างหน้า (Workload Score)
 * ใช้ตัวคำนวณเดียวกับตอนกระจายงาน แต่ "อ่านอย่างเดียว" ไม่แตะข้อมูล
 * เพื่อให้หน้ากลุ่มโชว์ได้ตลอดโดยไม่ต้องกดปุ่มจัดตารางก่อน
 * --------------------------------------------------------------
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMembership } from '@/lib/groups';
import { buildDateWindow, nowMinutesBangkok, todayISOBangkok } from '@/lib/schedule';
import { computeGroupWorkload } from '@/lib/groupWorkload';
import { computeDailyAverageLoad } from '@/lib/workload';

const WINDOW_DAYS = 7;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await getMembership(params.id, session.user.id);
  if (!me || me.status !== 'accepted') {
    return NextResponse.json({ error: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId: params.id, status: 'accepted' },
    include: { user: { select: { id: true, name: true, email: true, dayStart: true, dayEnd: true } } },
  });
  if (members.length === 0) return NextResponse.json({ days: WINDOW_DAYS, workload: [], trend: [] });

  const dates = buildDateWindow(WINDOW_DAYS);
  const memberPrefs = members.map((m) => ({ userId: m.userId, dayStart: m.user.dayStart, dayEnd: m.user.dayEnd }));
  const { slotsByUser, workloadByUser } = await computeGroupWorkload(members.map((m) => m.userId), dates, memberPrefs);

  // แนวโน้มภาระงานเฉลี่ยของทั้งกลุ่มรายวัน - กราฟเส้นแยกจากกราฟแท่งรายคนด้านบน (ดูหน้ากลุ่ม)
  const trend = computeDailyAverageLoad(slotsByUser, memberPrefs, dates, {
    date: todayISOBangkok(),
    nowMin: nowMinutesBangkok(),
  });

  return NextResponse.json({
    days: WINDOW_DAYS,
    trend,
    workload: members.map((m) => {
      const w = workloadByUser.get(m.userId)!;
      return {
        userId: m.userId,
        name: m.user.name || m.user.email.split('@')[0],
        isMe: m.userId === session.user!.id,
        committedMinutes: w.committedMinutes,
        bookedMinutes: w.bookedMinutes,
        pendingMinutes: w.pendingMinutes,
        freeMinutes: w.freeMinutes,
        assignedMinutes: 0,
        academicMinutes: w.academicMinutes,
        nonAcademicMinutes: w.nonAcademicMinutes,
        score: Number.isFinite(w.score) ? Number(w.score.toFixed(2)) : null,
      };
    }),
  });
}
