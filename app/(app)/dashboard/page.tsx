import Link from 'next/link';
import { CheckCircle2, ListTodo, CalendarClock, Sparkles } from 'lucide-react';
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
import EddyMascot from '@/components/EddyMascot';
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

      {/* Stat cards */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card tone="blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-sm text-eddy-700">งานวันนี้</p>
              <p className="font-display text-3xl font-bold text-ink">{todayTasks.length}</p>
            </div>
            <ListTodo className="text-eddy-600" size={32} />
          </div>
        </Card>
        <Card tone="mint">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-sm text-eddy-700">เสร็จแล้ว</p>
              <p className="font-display text-3xl font-bold text-ink">{doneCount}/{todayTasks.length}</p>
            </div>
            <CheckCircle2 className="text-eddy-600" size={32} />
          </div>
        </Card>
        <Card tone="peach">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-sm text-eddy-700">กิจกรรมที่จะถึง</p>
              <p className="font-display text-3xl font-bold text-ink">{upcomingEvents.length}</p>
            </div>
            <CalendarClock className="text-eddy-600" size={32} />
          </div>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: today's tasks + weekly timeline */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <h2 className="font-display text-lg font-bold text-ink">งานวันนี้</h2>
            <div className="mt-4 flex flex-col gap-3">
              {todayTasks.length === 0 && (
                <p className="py-4 text-center font-body text-sm text-ink-muted">ยังไม่มีงานเลย</p>
              )}
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-clay-sm bg-eddy-50 px-4 py-3"
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

          <Card>
            <h2 className="font-display text-lg font-bold text-ink">ตารางสัปดาห์นี้</h2>
            <div className="mt-4 flex flex-col divide-y divide-eddy-50">
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
                              {ev.startTime && (
                                <span className="font-body text-xs text-ink-muted">{ev.startTime}</span>
                              )}
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
        </div>

        {/* Right: Eddy tip + mini calendar + upcoming events */}
        <div className="flex flex-col gap-6">
          <Card tone="white" className="flex flex-col items-center text-center">
            <EddyMascot mood="think" size={88} />
            <p className="mt-3 font-display text-sm font-bold text-ink">เอ็ดดี้แนะนำ</p>
            <p className="mt-1 font-body text-sm text-ink-muted">
              {highPriorityUndone > 0
                ? `วันนี้คุณมีงาน "สำคัญมาก" ${highPriorityUndone} อย่าง ลองทำให้เสร็จก่อนช่วงบ่ายนะ!`
                : 'ตอนนี้ไม่มีงานสำคัญมากค้างอยู่ เก่งมาก!'}
            </p>
            <button className="mt-4 flex items-center gap-1 rounded-clay-sm bg-eddy-500 px-4 py-2 font-display text-sm font-semibold text-white">
              <Sparkles size={14} /> ถามเอ็ดดี้เพิ่ม
            </button>
          </Card>

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

          <Card>
            <h2 className="font-display text-base font-bold text-ink">กิจกรรมที่จะถึง</h2>
            <div className="mt-3 flex flex-col gap-2">
              {upcomingEvents.length === 0 && (
                <p className="font-body text-sm text-ink-muted">ไม่มีกิจกรรมที่จะถึงเร็วๆ นี้</p>
              )}
              {upcomingEvents.map((ev) => {
                const cat = categoryById.get(ev.categoryId);
                const dotClass = cat ? getColorOption(cat.color).dotClass : 'bg-eddy-200';
                return (
                  <div key={ev.id} className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                    <div>
                      <p className="font-body text-sm text-ink">{ev.title}</p>
                      <p className="font-body text-xs text-ink-muted">
                        {toISODate(ev.date)} {ev.startTime ? `• ${ev.startTime}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
