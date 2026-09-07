import Link from 'next/link';
import { ListTodo, Sparkles, ArrowRight, Gauge, PieChart, TrendingDown, Clock } from 'lucide-react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import EddyMascot from '@/components/EddyMascot';
import EmptyState from '@/components/EmptyState';
import Reveal from '@/components/motion/Reveal';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import WorkloadDistributionChart from '@/components/dashboard/WorkloadDistributionChart';
import WorkloadInsightText from '@/components/dashboard/WorkloadInsightText';
import BurnoutGauge from '@/components/dashboard/BurnoutGauge';
import InsightCardHeader from '@/components/dashboard/InsightCardHeader';
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
import { todayISOBangkok } from '@/lib/thaiTime';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

const priorityLabel: Record<string, string> = { high: 'สำคัญมาก', medium: 'ปานกลาง', low: 'ทั่วไป' };
const priorityTone: Record<string, string> = {
  high: 'bg-pastel-pink text-chip-ink',
  medium: 'bg-pastel-yellow text-chip-ink',
  low: 'bg-pastel-mint text-chip-ink',
};

function toISODate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email || 'เพื่อน';
  const userId = session!.user.id;

  // "วันนี้" ต้องอิงเวลาไทยเสมอ ไม่ใช่ timezone ของเครื่องที่รันเซิร์ฟเวอร์ (โปรดักชันมักรัน UTC
  // ซึ่งช่วง 00:00-07:00 น. ไทยจะยังนับเป็นเมื่อวาน) - วิดเจ็ตสถิติในหน้านี้ใช้ todayISOBangkok
  // กันหมดอยู่แล้ว ตรงนี้เคยเป็น new Date() + setHours(0,0,0,0) เลยเพี้ยนไม่ตรงกับส่วนอื่นในหน้าเดียวกัน
  const todayISO = todayISOBangkok();
  // dueDate/Event.date เก็บเป็น "ป้ายวันที่" ที่เที่ยงคืน UTC - เทียบกับ Date ที่สร้างแบบเดียวกัน
  const today = new Date(`${todayISO}T00:00:00.000Z`);

  // ช่วงที่ปฏิทินเดือนต้องใช้ (คร่อมสัปดาห์แรก/สุดท้ายของเดือน)
  const gridStart = startOfWeek(startOfMonth(today));
  const gridEnd = endOfWeek(endOfMonth(today));

  // งานเสร็จแล้วไม่ต้องแสดงในแดชบอร์ด - ลิสต์นี้เอาไว้บอกว่า "ยังเหลืออะไรต้องทำ" เท่านั้น
  const [
    dueTasks,
    dueTaskCount,
    dueHighPriorityCount,
    undoneCount,
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
    // งานที่ถึงกำหนดแล้ว (ครบกำหนดวันนี้ + ที่เลยกำหนดมาแล้ว) เรียงตามวันครบกำหนด
    // เดิมดึง "5 งานที่สร้างล่าสุดที่ยังไม่เสร็จ" มาโดยไม่ดูวันครบกำหนดเลย ทั้งที่การ์ดพาดหัวว่า "งานวันนี้"
    prisma.task.findMany({
      where: { userId, done: false, dueDate: { not: null, lte: today } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 5,
    }),
    // นับจำนวนจริง แยกจากลิสต์ที่ take: 5 ไว้ - ไม่งั้นตัวเลขบนการ์ดสถิติจะตันอยู่ที่ 5 เสมอ
    prisma.task.count({ where: { userId, done: false, dueDate: { not: null, lte: today } } }),
    prisma.task.count({ where: { userId, done: false, priority: 'high', dueDate: { not: null, lte: today } } }),
    prisma.task.count({ where: { userId, done: false } }),
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

  // สัดส่วนความคืบหน้าโดยรวม - ตัวหารต้องเป็นจำนวนงานทั้งหมดจริงๆ (เสร็จ + ยังไม่เสร็จ)
  // เดิมใช้ doneCount + จำนวนงานในลิสต์ที่ถูก take: 5 ครอบไว้ ทำให้เปอร์เซ็นต์สูงเกินจริง
  const totalEver = doneCount + undoneCount;
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
          <div className="relative flex h-full items-center gap-4 overflow-hidden rounded-clay border border-surface/70 bg-gradient-to-br from-pastel-blue via-[#E4EAFB] to-pastel-lilac p-7 text-chip-ink shadow-clay">
            <div className="relative z-10 flex-1">
              <p className="font-body text-caption font-semibold uppercase tracking-[0.06em] text-eddy-600">โฟกัสวันนี้</p>
              <p className="mt-1.5 font-display text-h2 text-ink">
                {dueHighPriorityCount > 0
                  ? `มีงานสำคัญ ${dueHighPriorityCount} อย่างรออยู่`
                  : 'ไม่มีงานสำคัญค้าง เยี่ยมมาก!'}
              </p>
              <p className="mt-1.5 font-body text-body text-ink-soft">
                {dueTaskCount} งานถึงกำหนด · {upcomingEvents.length} กิจกรรมที่จะถึง
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
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-surface/40 blur-2xl" />
          </div>
        </Reveal>

        {/* สถิติ: งานวันนี้ */}
        <Reveal delay={0.08} hover>
          <Card className="flex h-full items-center gap-4 transition-colors duration-200 hover:border-eddy-300">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-clay-sm bg-pastel-blue text-chip-ink">
              <ListTodo size={26} />
            </span>
            <div>
              <p className="font-body text-caption font-medium text-ink-muted">งานถึงกำหนด</p>
              <p className="font-display text-h1 leading-none text-ink">{dueTaskCount}</p>
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

      {/* ---------- โซน: งานและตารางของคุณ ---------- */}
      <div className="mb-1 mt-12 flex items-center gap-3">
        <h2 className="flex-shrink-0 font-display text-h2 text-ink">งานและตารางของคุณ</h2>
        <span className="h-px flex-1 bg-eddy-100" />
      </div>

      {/* ---------- งานวันนี้ + มินิปฏิทิน ---------- */}
      <section className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2" delay={0.22}>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-h3 text-ink">งานที่ถึงกำหนด</h2>
                <p className="font-body text-caption text-ink-muted">ครบกำหนดวันนี้และที่เลยกำหนดมาแล้ว</p>
              </div>
              <Link href="/todo" className="flex-shrink-0 font-body text-caption font-semibold text-eddy-600 hover:text-eddy-700">
                ดูทั้งหมด{dueTaskCount > dueTasks.length ? ` (${dueTaskCount})` : ''}
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {dueTasks.length === 0 ? (
                <EmptyState
                  title="ไม่มีงานถึงกำหนดตอนนี้ — สบายตัว!"
                  action={{ label: 'เพิ่มงานใหม่', href: '/todo', icon: <Sparkles size={15} /> }}
                />
              ) : (
                // งานเสร็จแล้วไม่ถูกดึงมาแต่แรก (query กรอง done:false ไว้แล้ว) แถวนี้จึงเป็น
                // งานที่ยังไม่เสร็จเสมอ ไม่ต้องมีสไตล์ขีดฆ่า/เช็คแล้วให้เลือกอีก
                dueTasks.map((task) => {
                  // dueDate เป็น "ป้ายวันที่" ที่เที่ยงคืน UTC - อ่านค่าตรงๆ จาก ISO ไม่ให้ timezone
                  // ของเซิร์ฟเวอร์มาเลื่อนวัน (format() ของ date-fns แปลงเป็นเวลาท้องถิ่นก่อน)
                  const dueISO = task.dueDate?.toISOString().slice(0, 10);
                  const overdue = Boolean(dueISO && dueISO < todayISO);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-clay-sm bg-eddy-50 px-4 py-3 transition-colors hover:bg-eddy-100"
                    >
                      <span className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-eddy-300 bg-surface" />
                      <p className="min-w-0 flex-1 truncate font-body text-body text-ink">{task.title}</p>
                      {overdue && (
                        <span className="flex-shrink-0 rounded-full bg-pastel-coral px-3 py-1 font-body text-caption font-semibold text-chip-ink">
                          เลยกำหนด
                        </span>
                      )}
                      <span
                        className={`flex-shrink-0 rounded-full px-3 py-1 font-body text-caption font-semibold ${priorityTone[task.priority]}`}
                      >
                        {priorityLabel[task.priority]}
                      </span>
                    </div>
                  );
                })
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
              todayISO={todayISO}
            />
          </Card>
        </Reveal>
      </section>

      {/* ---------- โซน: ข้อมูลเชิงลึกและสถิติ ---------- */}
      <div className="mb-1 mt-12 flex items-center gap-3">
        <h2 className="flex-shrink-0 font-display text-h2 text-ink">ข้อมูลเชิงลึกและสถิติ</h2>
        <span className="h-px flex-1 bg-eddy-100" />
      </div>

      {/* จัดใหม่เป็น 2 ชั้น: การ์ดกะทัดรัด (โดนัท/เกจ) 3 ใบมาอยู่แถวเดียวกันก่อน อ่านเป็น
          "สรุปด่วน" ชุดเดียวจบในแถวเดียว จากนั้นค่อยเป็นกราฟเส้น/แท่งแบบละเอียด 3 กราฟ เรียงเต็ม
          ความกว้างทีละกราฟด้านล่าง - จากเดิมที่จับคู่กราฟใหญ่+การ์ดเล็กในทุกแถว (2:1) ทำให้กราฟใหญ่ถูก
          บีบแคบ และการ์ดเล็กก็โดนแถมความสูงจากกราฟใหญ่จนดูไม่เป็นธรรมชาติ */}

      {/* ---------- แถวสรุปด่วน: ความเสี่ยงหมดไฟ + งานด่วนวันนี้สำคัญแค่ไหน + เวลาไปกับหมวดหมู่ไหนบ้าง ---------- */}
      {/* lg: ไม่ใช่ md: - แต่ละการ์ดมีวงกลม 160px + legend ที่ขยับมาต่อข้างกัน (sm:flex-row)
          กว้างขั้นต่ำรวมกันเกิน 300px ถ้าตัดเป็น 3 คอลัมน์ตั้งแต่ md (768px แบบ iPad แนวตั้งพอดี)
          แต่ละคอลัมน์จะเหลือพื้นที่ไม่พอ วงกลม+legend เลยชนกัน/ล้นการ์ด ต้องรอจอกว้างจริงๆ (lg) ก่อน */}
      <section className="mt-5 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        <Reveal delay={0.4}>
          <Card className="flex h-full flex-col">
            <InsightCardHeader icon={<Gauge size={20} />} tone="bg-pastel-peach text-chip-ink" title="ความเสี่ยงหมดไฟ" />
            {/* มาตรวัดครึ่งวงกลมแทนแท่งมิเตอร์เดิม - ขยายเต็มพื้นที่ตรงกลางที่เหลือของการ์ด (flex-1 +
                justify-center) แทนที่จะปล่อยเป็นช่องว่างโล่งๆ ใต้แท่งมิเตอร์แคบๆ เหมือนก่อนหน้านี้ */}
            <div className="flex flex-1 flex-col items-center justify-center py-2">
              <BurnoutGauge score={burnoutRisk.score} band={burnoutRisk.band} label={burnoutBand.label} />
            </div>
            {/* กล่องข้อความ AI แยกเป็น callout สีอ่อน ให้ดูตั้งใจจัดวาง ไม่ใช่ข้อความลอยท้ายการ์ด */}
            <div className="rounded-clay-sm bg-eddy-50 p-3.5">
              <WorkloadInsightText signals={burnoutRisk} className="font-body text-sm text-ink-soft" />
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.46}>
          <Card className="flex h-full flex-col">
            <InsightCardHeader
              icon={<PieChart size={20} />}
              tone="bg-pastel-lilac text-chip-ink"
              title="งานด่วนวันนี้ สำคัญแค่ไหน"
              description="เมทริกซ์ไอเซนฮาวร์ - งานด่วนวันนี้ ระหว่างงานสำคัญกับงานทั่วไป"
            />
            <div className="mt-2 flex flex-1 flex-col justify-center">
              <EisenhowerPieChart split={eisenhowerSplit} />
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.52}>
          <Card className="flex h-full flex-col">
            <InsightCardHeader
              icon={<PieChart size={20} />}
              tone="bg-pastel-sky text-chip-ink"
              title="เวลาไปกับหมวดหมู่ไหนบ้าง"
              description="7 วันที่ผ่านมา - เวลาที่ลงปฏิทินแล้วแยกตามหมวดหมู่จริง"
            />
            <div className="mt-2 flex flex-1 flex-col justify-center">
              <CategoryDonutChart slices={categorySlices} />
            </div>
          </Card>
        </Reveal>
      </section>

      {/* ---------- กราฟละเอียด 3 กราฟ ต่อแถวเดียวกัน: ภาระงาน / Burndown / ช่วงเวลาโปรดักทีฟ ---------- */}
      {/* ไม่ใส่ max-w ให้กราฟเอง - ปล่อยให้คอลัมน์ของ grid เป็นตัวกำหนดความกว้าง (แคบลงเองเพราะ
          อยู่คนละ 1/3 ของแถว) กราฟจึงยังคงสัดส่วน/รายละเอียดเดิมของมันแค่ย่อทั้งชุดลงมาด้วยกัน
          ไม่ใช่ถูกบีบด้วยตัวเลขที่กะเอง เหมือนที่ลองแล้วดูไม่สวยรอบก่อน */}
      <section className="mt-5 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        <Reveal delay={0.58}>
          <Card className="flex h-full flex-col">
            <InsightCardHeader
              icon={<Gauge size={20} />}
              tone="bg-pastel-blue text-chip-ink"
              title="ภาระงาน 7 วันข้างหน้า"
              description="เทียบเวลาที่ถูกจองไว้แล้ว (แท่ง) กับกรอบเวลาที่คุณสะดวกทำงานจริง (เส้นประ) ในแต่ละวัน"
            />
            <WorkloadDistributionChart daily={workloadDaily} className="mt-4" />
          </Card>
        </Reveal>

        <Reveal delay={0.64}>
          <Card className="flex h-full flex-col">
            <InsightCardHeader
              icon={<TrendingDown size={20} />}
              tone="bg-pastel-mint text-chip-ink"
              title="จะทำงานทันสัปดาห์นี้ไหม"
              description="หลัก Burndown ของ Agile/Scrum - เทียบงานที่เหลือจริงกับเส้นอุดมคติ (งานที่มีกำหนดส่งสัปดาห์นี้)"
            />
            <BurndownChart series={burndown} className="mt-4" />
          </Card>
        </Reveal>

        <Reveal delay={0.7}>
          <Card className="flex h-full flex-col">
            <InsightCardHeader
              icon={<Clock size={20} />}
              tone="bg-pastel-amber text-chip-ink"
              title="ช่วงเวลาที่คุณโปรดักทีฟที่สุด"
              description="วิเคราะห์จากเวลาที่ติ๊กงานเสร็จจริง (Time-of-Day Analysis) ด้วย Kernel Density Estimation"
            />
            <PeakProductivityChart result={peakProductivity} className="mt-4" />
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
