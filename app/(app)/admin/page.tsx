import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, GraduationCap, ListChecks, Plus, Users } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import WorkloadPanel from '@/components/groups/WorkloadPanel';
import { getColorOption } from '@/lib/colors';
import { computeGroupWorkload } from '@/lib/groupWorkload';
import { buildDateWindow } from '@/lib/schedule';
import { loadBandOf, loadPct } from '@/lib/loadBands';
import type { PastelColor } from '@/lib/types';

const WINDOW_DAYS = 7;

// หน้า Admin สำหรับอาจารย์ - รวมคลาสเรียนทั้งหมดที่ตัวเองเป็นเจ้าของ (กลุ่มที่มี code) ไว้ที่เดียว
// ใช้หน้ากลุ่มเดิมทั้งหมด (/groups/[id], .../tasks, .../calendar) สำหรับ "จัดการ" จริง (มอบหมายงาน,
// กระจายงาน) ไม่สร้าง UI ซ้ำ เพราะ owner ใช้หน้าพวกนั้นได้ครบอยู่แล้ว (ดู lib/groupWorkload.ts) —
// เดิมเคยมีสรุป "ข้ามคลาส" (รวมนักศึกษาทุกคนมาจัดอันดับเดียว) แต่ผู้ใช้ (อาจารย์) ไม่ชอบ บอกว่า
// อยากดูแยกเป็นรายวิชาว่าวิชาไหนใครโหลดเยอะสุด มากกว่าดูภาพรวมปนกัน เลยเปลี่ยนมาคำนวณ "คนโหลดเยอะสุด"
// แยกต่อคลาส (ด้วย lib/groupWorkload.ts ตัวเดียวกับที่ WorkloadPanel ใช้) โชว์เด่นๆ บนหัวการ์ดแต่ละคลาสแทน
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'teacher') redirect('/dashboard');
  const teacherId = session.user.id;

  const classes = await prisma.group.findMany({
    where: { ownerId: teacherId, code: { not: null } },
    include: {
      // ไม่นับตัวอาจารย์เอง (เป็นสมาชิก/owner ของกลุ่มอัตโนมัติ แต่ไม่ใช่ "นักศึกษา")
      members: {
        where: { status: 'accepted', userId: { not: teacherId } },
        select: { userId: true, user: { select: { name: true, email: true, dayStart: true, dayEnd: true } } },
      },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const studentCount = new Set(classes.flatMap((g) => g.members.map((m) => m.userId))).size;

  // คนโหลดเยอะสุดของแต่ละคลาส (ขนานกันทุกคลาส) - คำนวณด้วยสูตร/ข้อมูลชุดเดียวกับที่ WorkloadPanel
  // ของคลาสนั้นแสดง (เรียงคนแน่นสุดไว้ซ้ายสุด) เลยหยิบแค่คนแรกหลังเรียงมาโชว์เป็น badge เด่นๆ
  const dates = buildDateWindow(WINDOW_DAYS);
  const topLoadByClass = new Map<string, { name: string; pct: number } | null>();
  await Promise.all(
    classes.map(async (g) => {
      if (g.members.length === 0) return topLoadByClass.set(g.id, null);
      const memberIds = g.members.map((m) => m.userId);
      const memberPrefs = g.members.map((m) => ({ userId: m.userId, dayStart: m.user.dayStart, dayEnd: m.user.dayEnd }));
      const { workloadByUser } = await computeGroupWorkload(memberIds, dates, memberPrefs);
      let top: { name: string; pct: number; score: number } | null = null;
      for (const m of g.members) {
        const w = workloadByUser.get(m.userId)!;
        const pct = loadPct(w.committedMinutes, w.freeMinutes);
        const score = Number.isFinite(w.score) ? w.score : Infinity;
        if (!top || score > top.score) top = { name: m.user.name || m.user.email.split('@')[0], pct, score };
      }
      topLoadByClass.set(g.id, top);
    }),
  );

  return (
    <div className="px-4 pb-10 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-8">
        <div>
          <h1 className="font-display text-h1 text-ink">จัดการคลาส</h1>
          <p className="mt-0.5 font-body text-body text-ink-muted">
            ดูภาระงานนักศึกษาทั้งห้อง วางแผนและมอบหมายงานกลุ่มของแต่ละคลาสที่คุณสอน
          </p>
        </div>
        <Link
          href="/groups"
          className="flex items-center gap-1.5 rounded-full border border-eddy-200 bg-surface px-4 py-2.5 font-display text-caption font-semibold text-ink-soft transition-colors hover:bg-eddy-50"
        >
          <Plus size={16} /> สร้างคลาสใหม่
        </Link>
      </div>

      {classes.length === 0 ? (
        <section className="mt-8">
          <EmptyState
            size="full"
            mood="think"
            title="ยังไม่มีคลาสเรียน"
            description='ไปที่หน้า "กลุ่ม" แล้วกดสร้างกลุ่ม ใส่รหัสวิชาตอนสร้าง กลุ่มนั้นจะกลายเป็นคลาสเรียนและมาแสดงที่นี่'
            action={{ label: 'ไปหน้ากลุ่ม', icon: <Plus size={16} />, href: '/groups' }}
          />
        </section>
      ) : (
        <>
          {/* ---- สรุปรวม ---- */}
          <section className="mt-6 grid grid-cols-2 gap-3">
            <StatCard label="คลาสทั้งหมด" value={classes.length} />
            <StatCard label="นักศึกษาทั้งหมด" value={studentCount} />
          </section>

          {/* ---- แต่ละคลาส: badge "โหลดเยอะสุด" ของวิชานั้นๆ + กราฟภาระงานเต็มรูปแบบ ---- */}
          <section className="mt-6 flex flex-col gap-6">
            {classes.map((g) => {
              const c = getColorOption(g.color as PastelColor);
              const top = topLoadByClass.get(g.id);
              const band = top ? loadBandOf(top.pct) : null;
              return (
                <Card key={g.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Link href={`/groups/${g.id}`} className="group flex min-w-0 flex-1 items-start gap-3">
                      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-clay-sm ${c.chipClass}`}>
                        <GraduationCap size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-display text-h3 text-ink group-hover:underline">{g.name}</p>
                          <span className="flex-shrink-0 rounded-full bg-pastel-blue px-2 py-0.5 font-display text-[10px] font-bold text-eddy-700">
                            {g.code}
                          </span>
                        </div>
                        {g.description && <p className="mt-0.5 truncate font-body text-xs text-ink-muted">{g.description}</p>}
                        <div className="mt-1.5 flex items-center gap-4">
                          <span className="flex items-center gap-1.5 font-body text-xs text-ink-muted">
                            <Users size={13} /> {g.members.length} นักศึกษา
                          </span>
                          <span className="flex items-center gap-1.5 font-body text-xs text-ink-muted">
                            <ListChecks size={13} /> {g._count.tasks} งาน
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link
                      href={`/groups/${g.id}/admin`}
                      className="flex flex-shrink-0 items-center gap-1 rounded-full border border-eddy-200 bg-surface px-3.5 py-2 font-display text-xs font-semibold text-ink-soft transition-colors hover:bg-eddy-50"
                    >
                      มอบหมายงาน <ChevronRight size={14} />
                    </Link>
                  </div>

                  {top && band && (
                    <div className={`mt-3 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs font-semibold ${band.text} ${band.track}`}>
                      <AlertTriangle size={13} /> โหลดเยอะสุดในวิชานี้: {top.name} · {top.pct}% ({band.label})
                    </div>
                  )}

                  <div className="mt-4 border-t border-eddy-100 pt-4">
                    <WorkloadPanel groupId={g.id} />
                  </div>
                </Card>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col justify-center rounded-clay border border-eddy-100 bg-surface px-4 py-3">
      <p className="font-display text-2xl font-bold leading-none text-ink">{value}</p>
      <p className="mt-1 font-body text-[11px] text-ink-muted">{label}</p>
    </div>
  );
}
