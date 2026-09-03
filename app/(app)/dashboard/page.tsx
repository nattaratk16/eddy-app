import Link from 'next/link';
import clsx from 'clsx';
import { ListTodo, Sparkles, ArrowRight, Gauge, PieChart, TrendingDown, Clock } from 'lucide-react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import EddyMascot from '@/components/EddyMascot';
import Reveal from '@/components/motion/Reveal';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import WorkloadDistributionChart from '@/components/dashboard/WorkloadDistributionChart';
import WorkloadInsightText from '@/components/dashboard/WorkloadInsightText';
import EisenhowerPieChart from '@/components/dashboard/EisenhowerPieChart';
import CategoryDonutChart from '@/components/dashboard/CategoryDonutChart';
import BurndownChart from '@/components/dashboard/BurndownChart';
import PeakProductivityChart from '@/components/dashboard/PeakProductivityChart';
import { getEventColor } from '@/lib/colors';
import { getWorkloadSignals, BURNOUT_BANDS } from '@/lib/burnoutRisk';
import { getEisenhowerToday } from '@/lib/eisenhowerToday';
import { getCategoryTimeDistribution } from '@/lib/categoryTimeDistribution';
import { getWeeklyBurndown } from '@/lib/weeklyBurndown';
import { getPeakProductivity } from '@/lib/peakProductivity';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

const priorityLabel: Record<string, string> = { high: 'สำคัญมาก', medium: 'ปานกลาง', low: 'ทั่วไป' };
const priorityTone: Record<string, string> = {
  high: 'bg-pastel-pink text-eddy-700',
  medium: 'bg-pastel-yellow text-eddy-700',
  low: 'bg-pastel-mint text-eddy-700',
};

function toISODate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email || 'เพื่อน';
  const userId = session!.user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ช่วงที่ปฏิทินเดือนต้องใช้ (คร่อมสัปดาห์แรก/สุดท้ายของเดือน)
  const gridStart = startOfWeek(startOfMonth(today));
  const gridEnd = endOfWeek(endOfMonth(today));

  // งานเสร็จแล้วไม่ต้องแสดงในแดชบอร์ด - ลิสต์นี้เอาไว้บอกว่า "ยังเหลืออะไรต้องทำ" เท่านั้น
  const [
    todayTasks,
    doneCount,
    monthEvents,
    upcomingEvents,
    categories,
    { daily: workloadDaily, risk: burnoutRisk },
    eisenhowerSplit,
    categorySlices,
    burndown,
    peakProductivity,
  ] = await Promise.all([
    prisma.task.findMany({ where: { userId, done: false }, orderBy: { createdAt: 'desc' }, take: 5 }),
    // นับรวมทั้งหมด (ไม่ใช่แค่ 5 ที่โชว์) เอาไว้คิดสัดส่วนความคืบหน้าโดยรวม - งานเสร็จแล้วไม่ถูกดึงมาทั้งก้อนอีกต่อไป
    prisma.task.count({ where: { userId, done: true } }),
    prisma.event.findMany({ where: { userId, date: { gte: gridStart, lte: gridEnd } }, orderBy: { date: 'asc' } }),
    prisma.event.findMany({ where: { userId, date: { gte: today } }, orderBy: { date: 'asc' }, take: 5 }),
    prisma.category.findMany({ where: { userId } }),
    getWorkloadSignals(userId),
    getEisenhowerToday(userId),
    getCategoryTimeDistribution(userId),
    getWeeklyBurndown(userId),
    getPeakProductivity(userId),
  ]);
  const burnoutBand = BURNOUT_BANDS.find((b) => b.key === burnoutRisk.band)!;
  const categoryById = new Map<string, CalendarCategory>(
    categories.map((c) => [c.id, { id: c.id, name: c.name, color: c.color as CalendarCategory['color'] }])
  );

  const highPriorityUndone = todayTasks.filter((t) => t.priority === 'high').length;
  // สัดส่วนความคืบหน้าโดยรวม (เสร็จแล้วทั้งหมด / ทั้งหมดที่เคยเพิ่ม) แทนที่จะเป็นแค่ "5 งานล่าสุด"
  // เพราะตอนนี้ todayTasks มีแต่งานที่ยังไม่เสร็จ ไม่มีตัวเสร็จให้เทียบสัดส่วนในชุดเดียวกันแล้ว
  const totalEver = doneCount + todayTasks.length;
  const donePct = totalEver > 0 ? Math.round((doneCount / totalEver) * 100) : 0;

  // วงแหวนความคืบหน้า (SVG donut)
  const ringR = 32;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - donePct / 100);

  return (
    <div className="px-4 md:px-10">
      <Topbar userName={userName} />

      {/* ---------- Bento: การ์ดฮีโร่ + สถิติ ---------- */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* การ์ดโฟกัสวันนี้ (เด่น) */}
        <Reveal className="sm:col-span-2">
          <div className="relative flex h-full items-center gap-4 overflow-hidden rounded-clay border border-white/70 bg-gradient-to-br from-pastel-blue via-[#E4EAFB] to-pastel-lilac p-7 text-ink shadow-clay">
            <div className="relative z-10 flex-1">
              <p className="font-body text-caption font-semibold uppercase tracking-[0.06em] text-eddy-600">โฟกัสวันนี้</p>
              <p className="mt-1.5 font-display text-h2 text-ink">
                {highPriorityUndone > 0
                  ? `มีงานสำคัญ ${highPriorityUndone} อย่างรออยู่`
                  : 'ไม่มีงานสำคัญค้าง เยี่ยมมาก!'}
              </p>
              <p className="mt-1.5 font-body text-body text-ink-soft">
                {todayTasks.length} งาน · {upcomingEvents.length} กิจกรรมที่จะถึง
              </p>
              <Link
                href="/todo"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-6 font-display text-body font-semibold text-white shadow-clay-sm transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
              >
                <Sparkles size={16} /> จัดการงาน <ArrowRight size={16} />
              </Link>
            </div>
            {/* มาสคอตประจำแอป (แทนหน้ายิ้มกลมๆ เดิม ให้เป็นตัวละครเดียวกันทั้งแอป) */}
            <div className="relative z-10 hidden shrink-0 sm:block">
              <EddyMascot size={104} />
            </div>
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/40 blur-2xl" />
          </div>
        </Reveal>

        {/* สถิติ: งานวันนี้ */}
        <Reveal delay={0.08} hover>
          <Card className="flex h-full items-center gap-4 transition-colors duration-200 hover:border-eddy-300">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-clay-sm bg-pastel-blue text-eddy-700">
              <ListTodo size={26} />
            </span>
            <div>
              <p className="font-body text-caption font-medium text-ink-muted">งานวันนี้</p>
              <p className="font-display text-h1 leading-none text-ink">{todayTasks.length}</p>
            </div>
          </Card>
        </Reveal>

        {/* สถิติ: ความคืบหน้า (วงแหวน) */}
        <Reveal delay={0.16} hover>
          <Card className="flex h-full items-center gap-4 transition-colors duration-200 hover:border-eddy-300">
            <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
              <svg viewBox="0 0 80 80" className="h-14 w-14 -rotate-90">
                <circle cx="40" cy="40" r={ringR} fill="none" stroke="#E1ECF8" strokeWidth="8" />
                <circle
                  cx="40"
                  cy="40"
                  r={ringR}
                  fill="none"
                  stroke="#3D72B4"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <span className="absolute font-display text-caption font-bold text-ink">{donePct}%</span>
            </div>
            <div>
              <p className="font-body text-caption font-medium text-ink-muted">เสร็จแล้วทั้งหมด</p>
              <p className="font-display text-h1 leading-none text-ink">
                {doneCount}/{totalEver}
              </p>
            </div>
          </Card>
        </Reveal>
      </section>

      {/* ---------- งานวันนี้ + มินิปฏิทิน ---------- */}
      <section className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2" delay={0.22}>
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-h3 text-ink">งานวันนี้</h2>
              <Link href="/todo" className="font-body text-caption font-semibold text-eddy-600 hover:text-eddy-700">
                ดูทั้งหมด
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <EddyMascot mood="happy" size={64} float={false} />
                  <p className="font-body text-body text-ink-soft">ยังไม่มีงานวันนี้ — เพิ่มงานแรกกันเลย!</p>
                  <Link
                    href="/todo"
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 font-display text-caption font-semibold text-white transition-all hover:bg-black active:scale-[0.97]"
                  >
                    <Sparkles size={15} /> เพิ่มงานแรก
                  </Link>
                </div>
              ) : (
                // งานเสร็จแล้วไม่ถูกดึงมาแต่แรก (query กรอง done:false ไว้แล้ว) แถวนี้จึงเป็น
                // งานที่ยังไม่เสร็จเสมอ ไม่ต้องมีสไตล์ขีดฆ่า/เช็คแล้วให้เลือกอีก
                todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-clay-sm bg-eddy-50 px-4 py-3 transition-colors hover:bg-eddy-100"
                  >
                    <span className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-eddy-300 bg-white" />
                    <p className="flex-1 font-body text-body text-ink">{task.title}</p>
                    <span className={`rounded-full px-3 py-1 font-body text-caption font-semibold ${priorityTone[task.priority]}`}>
                      {priorityLabel[task.priority]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Reveal>

        {/* กิจกรรมที่จะถึง - ย้ายขึ้นมาคู่กับงานวันนี้ */}
        <Reveal delay={0.28}>
          <Card>
            <h2 className="font-display text-h3 text-ink">กิจกรรมที่จะถึง</h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {upcomingEvents.length === 0 && (
                <p className="py-4 font-body text-sm text-ink-muted">ไม่มีกิจกรรมที่จะถึงเร็วๆ นี้</p>
              )}
              {upcomingEvents.map((ev) => {
                const cat = categoryById.get(ev.categoryId);
                const dotClass = getEventColor(ev.color, cat?.color)?.dotClass ?? 'bg-eddy-200';
                return (
                  <Link
                    key={ev.id}
                    href={`/calendar?date=${toISODate(ev.date)}`}
                    className="flex items-center gap-3 rounded-clay-sm px-2 py-1.5 transition-colors hover:bg-eddy-50"
                  >
                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotClass}`} />
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm text-ink">{ev.title}</p>
                      <p className="font-body text-xs text-ink-muted">
                        {toISODate(ev.date)} {ev.startTime ? `• ${ev.startTime}` : ''}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </Reveal>
      </section>

      {/* ---------- ปฏิทินเดือน (รวมมินิปฏิทิน + ตารางสัปดาห์เดิมไว้ด้วยกัน) ---------- */}
      <section className="mt-5">
        <Reveal delay={0.34}>
          {/* padding น้อยกว่าการ์ดอื่น - ปฏิทินมีกรอบของตัวเองอยู่แล้ว ไม่ต้องมีขอบซ้อนขอบ */}
          <Card className="!p-4 sm:!p-5">
            <DashboardCalendar
              events={monthEvents.map((ev) => ({
                id: ev.id,
                title: ev.title,
                date: toISODate(ev.date),
                startTime: ev.startTime ?? undefined,
                endTime: ev.endTime ?? undefined,
                location: ev.location ?? undefined,
                description: ev.description ?? undefined,
                categoryId: ev.categoryId,
                color: (ev.color ?? undefined) as CalendarEvent['color'],
                isDeadline: ev.isDeadline || undefined,
              }))}
              categories={[...categoryById.values()]}
              todayISO={toISODate(today)}
            />
          </Card>
        </Reveal>
      </section>

      {/* ---------- ภาระงาน & ความเสี่ยงหมดไฟ (แนวคิดจากทฤษฎีวางแผนกำลังการผลิต) ---------- */}
      <section className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2" delay={0.4}>
          <Card>
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-ink">
              <Gauge size={18} className="text-eddy-500" /> ภาระงาน 7 วันข้างหน้า
            </h2>
            <p className="mt-0.5 font-body text-caption text-ink-muted">
              เทียบเวลาที่ถูกจองไว้แล้ว (แท่ง) กับกรอบเวลาที่คุณสะดวกทำงานจริง (เส้นประ) ในแต่ละวัน
            </p>
            <WorkloadDistributionChart daily={workloadDaily} />
          </Card>
        </Reveal>

        <Reveal delay={0.46}>
          <Card className="flex h-full flex-col">
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-ink">
              <Gauge size={18} className="text-eddy-500" /> ความเสี่ยงหมดไฟ
            </h2>
            <div className="mt-4 flex items-center gap-3">
              <span className="font-display text-h1 leading-none text-ink">{burnoutRisk.score}</span>
              <span
                className={clsx(
                  'rounded-full px-2.5 py-1 font-display text-caption font-semibold',
                  burnoutRisk.band === 'low' && 'bg-pastel-mint text-eddy-700',
                  burnoutRisk.band === 'medium' && 'bg-pastel-yellow text-eddy-700',
                  burnoutRisk.band === 'high' && 'bg-pastel-pink text-eddy-700',
                )}
              >
                {burnoutBand.label}
              </span>
            </div>
            {/* มิเตอร์ - สีเติมบอกระดับความเสี่ยง รางพื้นหลังเป็นสีเดียวกันแต่จางลง */}
            <div className={clsx('mt-3 h-3 w-full overflow-hidden rounded-full', burnoutBand.track)}>
              <div
                className={clsx('h-full rounded-full transition-[width] duration-500', burnoutBand.bar)}
                style={{ width: `${burnoutRisk.score}%` }}
              />
            </div>
            <WorkloadInsightText signals={burnoutRisk} className="mt-4 flex-1 font-body text-body text-ink-soft" />
          </Card>
        </Reveal>
      </section>

      {/* ---------- สัดส่วนวันนี้: เมทริกซ์ไอเซนฮาวร์ + เวลาตามหมวดหมู่ (7 วันที่ผ่านมา) ---------- */}
      <section className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Reveal delay={0.52}>
          <Card>
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-ink">
              <PieChart size={18} className="text-eddy-500" /> งานด่วนวันนี้ สำคัญแค่ไหน
            </h2>
            <p className="mt-0.5 font-body text-caption text-ink-muted">
              เมทริกซ์ไอเซนฮาวร์ - เวลาที่ใช้กับงานด่วนวันนี้ ระหว่างงานสำคัญกับงานทั่วไป
            </p>
            <EisenhowerPieChart split={eisenhowerSplit} className="mt-4" />
          </Card>
        </Reveal>

        <Reveal delay={0.58}>
          <Card>
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-ink">
              <PieChart size={18} className="text-eddy-500" /> เวลาไปกับหมวดหมู่ไหนบ้าง
            </h2>
            <p className="mt-0.5 font-body text-caption text-ink-muted">7 วันที่ผ่านมา - เวลาที่ลงปฏิทินแล้วแยกตามหมวดหมู่จริง</p>
            <CategoryDonutChart slices={categorySlices} className="mt-4" />
          </Card>
        </Reveal>
      </section>

      {/* ---------- Burndown สัปดาห์นี้ ---------- */}
      <section className="mt-5">
        <Reveal delay={0.64}>
          <Card>
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-ink">
              <TrendingDown size={18} className="text-eddy-500" /> จะทำงานทันสัปดาห์นี้ไหม
            </h2>
            <p className="mt-0.5 font-body text-caption text-ink-muted">
              หลัก Burndown ของ Agile/Scrum - เทียบงานที่เหลือจริงกับเส้นอุดมคติ (งานที่มีกำหนดส่งสัปดาห์นี้)
            </p>
            <BurndownChart series={burndown} />
          </Card>
        </Reveal>
      </section>

      {/* ---------- ช่วงเวลาทำงานเสร็จเยอะที่สุด ---------- */}
      <section className="mt-5">
        <Reveal delay={0.7}>
          <Card>
            <h2 className="flex items-center gap-1.5 font-display text-h3 text-ink">
              <Clock size={18} className="text-eddy-500" /> ช่วงเวลาที่คุณโปรดักทีฟที่สุด
            </h2>
            <p className="mt-0.5 font-body text-caption text-ink-muted">
              วิเคราะห์จากเวลาที่ติ๊กงานเสร็จจริง (Time-of-Day Analysis) ด้วย Kernel Density Estimation
            </p>
            <PeakProductivityChart result={peakProductivity} />
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
