import Link from 'next/link';
import { ListTodo, Sparkles, ArrowRight } from 'lucide-react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import EddyMascot from '@/components/EddyMascot';
import Reveal from '@/components/motion/Reveal';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import { getColorOption } from '@/lib/colors';
import type { CalendarCategory } from '@/lib/types';

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

  const [todayTasks, monthEvents, upcomingEvents, categories] = await Promise.all([
    prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.event.findMany({ where: { userId, date: { gte: gridStart, lte: gridEnd } }, orderBy: { date: 'asc' } }),
    prisma.event.findMany({ where: { userId, date: { gte: today } }, orderBy: { date: 'asc' }, take: 5 }),
    prisma.category.findMany({ where: { userId } }),
  ]);
  const categoryById = new Map<string, CalendarCategory>(
    categories.map((c) => [c.id, { id: c.id, name: c.name, color: c.color as CalendarCategory['color'] }])
  );

  const doneCount = todayTasks.filter((t) => t.done).length;
  const highPriorityUndone = todayTasks.filter((t) => !t.done && t.priority === 'high').length;
  const donePct = todayTasks.length > 0 ? Math.round((doneCount / todayTasks.length) * 100) : 0;

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
              <p className="font-body text-caption font-medium text-ink-muted">เสร็จแล้ว</p>
              <p className="font-display text-h1 leading-none text-ink">
                {doneCount}/{todayTasks.length}
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
                todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-clay-sm bg-eddy-50 px-4 py-3 transition-colors hover:bg-eddy-100"
                  >
                    <span
                      className={`h-5 w-5 flex-shrink-0 rounded-full border-2 ${
                        task.done ? 'border-eddy-500 bg-eddy-500' : 'border-eddy-300 bg-white'
                      }`}
                    />
                    <p className={`flex-1 font-body text-body ${task.done ? 'text-ink-muted line-through' : 'text-ink'}`}>
                      {task.title}
                    </p>
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
                const dotClass = cat ? getColorOption(cat.color).dotClass : 'bg-eddy-200';
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
              }))}
              categories={[...categoryById.values()]}
              todayISO={toISODate(today)}
            />
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
