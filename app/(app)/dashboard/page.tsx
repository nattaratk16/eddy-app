import Link from 'next/link';
import { ListTodo, Sparkles, ArrowRight } from 'lucide-react';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import FaceBubble from '@/components/FaceBubble';
import Reveal from '@/components/motion/Reveal';
import { getColorOption } from '@/lib/colors';
import type { CalendarCategory } from '@/lib/types';

const priorityLabel: Record<string, string> = { high: 'สำคัญมาก', medium: 'ปานกลาง', low: 'ทั่วไป' };
const priorityTone: Record<string, string> = {
  high: 'bg-pastel-pink text-eddy-700',
  medium: 'bg-pastel-yellow text-eddy-700',
  low: 'bg-pastel-mint text-eddy-700',
};
const weekDayLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function toISODate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email || 'เพื่อน';
  const userId = session!.user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const gridStart = startOfWeek(startOfMonth(today));
  const gridEnd = endOfWeek(endOfMonth(today));
  const weekStart = startOfWeek(today);

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

  // ---- mini calendar grid ----
  const gridDays: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) gridDays.push(d);
  const eventDateSet = new Set(monthEvents.map((ev) => toISODate(ev.date)));

  // ---- weekly timeline ----
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const eventsByDate = new Map<string, typeof monthEvents>();
  for (const ev of monthEvents) {
    const key = toISODate(ev.date);
    const list = eventsByDate.get(key) ?? [];
    list.push(ev);
    eventsByDate.set(key, list);
  }

  return (
    <div className="px-4 md:px-10">
      <Topbar userName={userName} />

      {/* ---------- Bento: การ์ดฮีโร่ + สถิติ ---------- */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* การ์ดโฟกัสวันนี้ (มืด เด่น) */}
        <Reveal className="sm:col-span-2">
          <div className="relative flex h-full items-center gap-4 overflow-hidden rounded-clay border border-white/70 bg-gradient-to-br from-pastel-blue via-[#E4EAFB] to-pastel-lilac p-6 text-ink">
            <div className="relative z-10 flex-1">
              <p className="font-body text-sm text-ink-soft">โฟกัสวันนี้</p>
              <p className="mt-1 font-display text-2xl font-bold leading-snug text-ink">
                {highPriorityUndone > 0
                  ? `มีงานสำคัญ ${highPriorityUndone} อย่างรออยู่`
                  : 'ไม่มีงานสำคัญค้าง เยี่ยมมาก!'}
              </p>
              <p className="mt-1 font-body text-sm text-ink-soft">
                {todayTasks.length} งาน · {upcomingEvents.length} กิจกรรมที่จะถึง
              </p>
              <Link
                href="/todo"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 font-display text-sm font-semibold text-white transition-all duration-150 hover:scale-[1.03] hover:bg-black active:scale-95"
              >
                <Sparkles size={14} /> จัดการงาน <ArrowRight size={14} />
              </Link>
            </div>
            {/* แทนมาสคอต: กลุ่มหน้ายิ้มสไตล์ Genie */}
            <div className="relative z-10 hidden shrink-0 -space-x-3 sm:flex">
              <FaceBubble bg="bg-pastel-peach" className="h-14 w-14" />
              <FaceBubble bg="bg-white" className="h-16 w-16" />
              <FaceBubble bg="bg-pastel-mint" className="h-14 w-14" />
            </div>
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/40 blur-2xl" />
          </div>
        </Reveal>

        {/* สถิติ: งานวันนี้ */}
        <Reveal delay={0.08} hover>
          <Card className="flex h-full items-center gap-4 transition-colors duration-200 hover:border-eddy-300">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-clay-sm bg-pastel-blue text-eddy-700">
              <ListTodo size={24} />
            </span>
            <div>
              <p className="font-body text-sm text-ink-muted">งานวันนี้</p>
              <p className="font-display text-3xl font-bold leading-tight text-ink">{todayTasks.length}</p>
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
              <span className="absolute font-display text-xs font-bold text-ink">{donePct}%</span>
            </div>
            <div>
              <p className="font-body text-sm text-ink-muted">เสร็จแล้ว</p>
              <p className="font-display text-2xl font-bold leading-tight text-ink">
                {doneCount}/{todayTasks.length}
              </p>
            </div>
          </Card>
        </Reveal>
      </section>

      {/* ---------- งานวันนี้ + มินิปฏิทิน ---------- */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2" delay={0.22}>
          <Card>
            <h2 className="font-display text-lg font-bold text-ink">งานวันนี้</h2>
            <div className="mt-4 flex flex-col gap-2.5">
              {todayTasks.length === 0 && (
                <p className="py-6 text-center font-body text-sm text-ink-muted">ยังไม่มีงานเลย</p>
              )}
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-clay-sm bg-eddy-50 px-4 py-3 transition-colors hover:bg-eddy-100"
                >
                  <span
                    className={`h-5 w-5 flex-shrink-0 rounded-full border-2 ${
                      task.done ? 'border-eddy-500 bg-eddy-500' : 'border-eddy-300 bg-white'
                    }`}
                  />
                  <p className={`flex-1 font-body text-sm ${task.done ? 'text-ink-muted line-through' : 'text-ink'}`}>
                    {task.title}
                  </p>
                  <span className={`rounded-full px-3 py-1 font-body text-xs font-semibold ${priorityTone[task.priority]}`}>
                    {priorityLabel[task.priority]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.28}>
          <Card>
            <h2 className="font-display text-base font-bold text-ink">{format(today, 'MMMM yyyy')}</h2>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center font-body text-[10px] font-semibold text-ink-muted">
              {weekDayLabels.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((day) => {
                const inMonth = isSameMonth(day, today);
                const isToday = isSameDay(day, today);
                const hasEvent = eventDateSet.has(toISODate(day));
                return (
                  <Link
                    key={day.toISOString()}
                    href={`/calendar?date=${toISODate(day)}`}
                    className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-clay-sm font-body text-xs transition-colors ${
                      isToday
                        ? 'bg-eddy-500 font-bold text-white'
                        : inMonth
                        ? 'text-ink hover:bg-eddy-50'
                        : 'text-ink-muted/50 hover:bg-eddy-50'
                    }`}
                  >
                    {format(day, 'd')}
                    <span
                      className={`h-1 w-1 rounded-full ${
                        hasEvent ? (isToday ? 'bg-white' : 'bg-eddy-400') : 'bg-transparent'
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </Card>
        </Reveal>
      </section>

      {/* ---------- ตารางสัปดาห์ + กิจกรรมที่จะถึง ---------- */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2" delay={0.34}>
          <Card>
            <h2 className="font-display text-lg font-bold text-ink">ตารางสัปดาห์นี้</h2>
            <div className="mt-4 flex flex-col divide-y divide-eddy-100">
              {weekDays.map((day) => {
                const dayEvents = eventsByDate.get(toISODate(day)) ?? [];
                const isToday = isSameDay(day, today);
                return (
                  <div key={day.toISOString()} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="w-14 flex-shrink-0 text-center">
                      <p className={`font-display text-xs font-semibold ${isToday ? 'text-eddy-600' : 'text-ink-muted'}`}>
                        {weekDayLabels[day.getDay()]}
                      </p>
                      <p
                        className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-bold ${
                          isToday ? 'bg-eddy-500 text-white' : 'text-ink'
                        }`}
                      >
                        {format(day, 'd')}
                      </p>
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
                      {dayEvents.length === 0 ? (
                        <p className="font-body text-xs text-ink-muted">ไม่มีกิจกรรม</p>
                      ) : (
                        dayEvents.map((ev) => {
                          const cat = categoryById.get(ev.categoryId);
                          const dotClass = cat ? getColorOption(cat.color).dotClass : 'bg-eddy-200';
                          return (
                            <div key={ev.id} className="flex items-center gap-2">
                              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dotClass}`} />
                              <span className="font-body text-sm text-ink">{ev.title}</span>
                              {ev.startTime && <span className="font-body text-xs text-ink-muted">{ev.startTime}</span>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.4}>
          <Card>
            <h2 className="font-display text-base font-bold text-ink">กิจกรรมที่จะถึง</h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {upcomingEvents.length === 0 && (
                <p className="py-4 font-body text-sm text-ink-muted">ไม่มีกิจกรรมที่จะถึงเร็วๆ นี้</p>
              )}
              {upcomingEvents.map((ev) => {
                const cat = categoryById.get(ev.categoryId);
                const dotClass = cat ? getColorOption(cat.color).dotClass : 'bg-eddy-200';
                return (
                  <div key={ev.id} className="flex items-center gap-3 rounded-clay-sm px-2 py-1.5 transition-colors hover:bg-eddy-50">
                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotClass}`} />
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm text-ink">{ev.title}</p>
                      <p className="font-body text-xs text-ink-muted">
                        {toISODate(ev.date)} {ev.startTime ? `• ${ev.startTime}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
