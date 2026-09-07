'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { CalendarDays, Check, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import Modal from '@/components/Modal';
import Popover from '@/components/Popover';
import CategoryManager from '@/components/CategoryManager';
import EventFormModal from '@/components/EventFormModal';
import CalendarToolbar from '@/components/calendar/CalendarToolbar';
import MiniCalendar from '@/components/calendar/MiniCalendar';
import MonthView from '@/components/calendar/MonthView';
import DayTimeline from '@/components/calendar/DayTimeline';
import TimeGridView from '@/components/calendar/TimeGridView';
import WeeklySummaryPanel from '@/components/calendar/WeeklySummaryPanel';
import RecurringManager from '@/components/RecurringManager';
import { buildWeeklySummary } from '@/lib/aiMock';
import { expandRecurring } from '@/lib/recurring';
import type { CalendarCategory, CalendarEvent, CalendarView, PastelColor, RecurringEventInfo } from '@/lib/types';

const thMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const thMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function toISODate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

// ชื่อช่วงเวลาที่แสดงบน toolbar ตามมุมมองที่เลือก
function toolbarTitle(view: CalendarView, anchor: Date) {
  if (view === 'month') {
    return `${thMonths[anchor.getMonth()]} ${anchor.getFullYear() + 543}`;
  }
  if (view === 'day') {
    return `${anchor.getDate()} ${thMonths[anchor.getMonth()]} ${anchor.getFullYear() + 543}`;
  }
  // week
  const start = startOfWeek(anchor);
  const end = endOfWeek(anchor);
  const be = end.getFullYear() + 543;
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${thMonthsShort[end.getMonth()]} ${be}`;
  }
  return `${start.getDate()} ${thMonthsShort[start.getMonth()]} – ${end.getDate()} ${thMonthsShort[end.getMonth()]} ${be}`;
}

interface ModalState {
  open: boolean;
  editing?: CalendarEvent;
  prefill?: Partial<CalendarEvent>;
  defaultDate?: string;
}

// หมวดหมู่เสมือนสำหรับกิจกรรมที่ดึงมาจาก Google Calendar (อ่านอย่างเดียว)
const GOOGLE_CATEGORY_ID = '__google__';
const GOOGLE_CATEGORY: CalendarCategory = { id: GOOGLE_CATEGORY_ID, name: 'Google Calendar', color: 'sky' };
// หมวดหมู่เสมือนสำหรับ Loop ประจำที่ไม่ได้ผูกหมวดหมู่จริง
const LOOP_CATEGORY_ID = '__loop__';
const LOOP_CATEGORY: CalendarCategory = { id: LOOP_CATEGORY_ID, name: 'Loop ประจำ', color: 'lilac' };

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageContent />
    </Suspense>
  );
}

function CalendarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.email || 'เพื่อน';

  const [view, setView] = useState<CalendarView>('week');
  // วันอ้างอิงของมุมมองปัจจุบัน (มุมมองวัน = วันนั้น, สัปดาห์ = สัปดาห์ที่คร่อมวันนั้น, เดือน = เดือนของวันนั้น)
  const [anchor, setAnchor] = useState(new Date());

  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  // วันที่กำลังเปิดดูไทม์ไลน์ (จากการคลิกช่องวันในมุมมองเดือน) - null = ปิดอยู่
  const [timelineDay, setTimelineDay] = useState<Date | null>(null);

  // Loop ชีวิต (กิจกรรมประจำ)
  const [recurring, setRecurring] = useState<RecurringEventInfo[]>([]);

  // กิจกรรมจาก Google Calendar (อ่านอย่างเดียว)
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [showGoogle, setShowGoogle] = useState(true);
  // loading = กำลังเช็ค, connected = เชื่อม+ดึงได้, account-error = เชื่อมบัญชีแล้วแต่ดึงไม่ได้, off = ยังไม่เชื่อม
  const [googleStatus, setGoogleStatus] = useState<'loading' | 'connected' | 'account-error' | 'off'>('loading');

  // โหลดหมวดหมู่และกิจกรรมจริงจาก /api/categories และ /api/events (Prisma + PostgreSQL)
  useEffect(() => {
    (async () => {
      const [catRes, evRes] = await Promise.all([fetch('/api/categories'), fetch('/api/events')]);
      const catData = await catRes.json();
      const evData = await evRes.json();
      const loadedCategories: CalendarCategory[] = catData.categories ?? [];
      setCategories(loadedCategories);
      setEvents(evData.events ?? []);
      setVisibleIds(new Set(loadedCategories.map((c) => c.id)));
    })();
  }, []);

  // รับกิจกรรมที่ Eddy ช่วยแปลงจากแชท (quick-add) ผ่าน query param แล้วเปิด modal ให้ทันที
  useEffect(() => {
    const quickAdd = searchParams.get('quickAdd');
    if (!quickAdd) return;
    try {
      const draft = JSON.parse(decodeURIComponent(quickAdd));
      setModalState({ open: true, prefill: draft });
      if (draft.date) setAnchor(new Date(draft.date));
    } catch {
      // ignore malformed param
    }
    router.replace('/calendar');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // มาจาก mini calendar ในหน้า Dashboard - กระโดดไปวันที่ระบุ (เปิดเป็นมุมมองวัน)
  useEffect(() => {
    const date = searchParams.get('date');
    if (!date) return;
    setAnchor(new Date(date));
    setView('day');
    router.replace('/calendar');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const visibleEvents = useMemo(
    () => events.filter((ev) => visibleIds.has(ev.categoryId)),
    [events, visibleIds],
  );

  // โหลด Loop ชีวิต (กิจกรรมประจำ) - โหลดครั้งเดียว
  const loadRecurring = () => fetch('/api/recurring').then((r) => r.json()).then((d) => setRecurring(d.recurring ?? []));
  useEffect(() => {
    loadRecurring();
  }, []);

  // ดึงกิจกรรมจาก Google Calendar (โหลดช่วง ±45 วันรอบวันที่ดูอยู่ - รีเฟรชเมื่อเปลี่ยนเดือน)
  const monthKey = format(anchor, 'yyyy-MM');
  useEffect(() => {
    (async () => {
      const start = format(subDays(anchor, 45), 'yyyy-MM-dd');
      const end = format(addDays(anchor, 45), 'yyyy-MM-dd');
      try {
        const res = await fetch(`/api/google/calendar?start=${start}&end=${end}`);
        const data = await res.json();
        if (data.connected) {
          setGoogleStatus('connected');
          setGoogleEvents(
            (data.events ?? []).map((e: CalendarEvent) => ({ ...e, categoryId: GOOGLE_CATEGORY_ID })),
          );
        } else {
          setGoogleStatus(data.hasAccount ? 'account-error' : 'off');
          setGoogleEvents([]);
        }
      } catch {
        setGoogleStatus('off');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  // ขยาย Loop ประจำเป็นกิจกรรมจริงในช่วง ±45 วันรอบวันที่ดูอยู่
  const recurringEvents = useMemo(() => {
    const dates = Array.from({ length: 91 }, (_, i) => format(addDays(anchor, i - 45), 'yyyy-MM-dd'));
    return expandRecurring(recurring, dates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring, monthKey]);

  // กิจกรรม + หมวดหมู่ที่ส่งให้มุมมองปฏิทิน (รวม Loop ประจำ + Google ถ้าเปิดแสดง)
  const displayEvents = useMemo(
    () => [...visibleEvents, ...recurringEvents, ...(showGoogle ? googleEvents : [])],
    [visibleEvents, recurringEvents, googleEvents, showGoogle],
  );
  const displayCategories = useMemo(() => {
    const extra: CalendarCategory[] = [];
    if (recurringEvents.length > 0) extra.push(LOOP_CATEGORY);
    if (showGoogle && googleEvents.length > 0) extra.push(GOOGLE_CATEGORY);
    return extra.length ? [...categories, ...extra] : categories;
  }, [categories, recurringEvents.length, showGoogle, googleEvents.length]);

  // วันที่จะส่งให้มุมมอง time-grid: 1 วัน หรือ 7 วันของสัปดาห์
  const gridDays = useMemo(() => {
    if (view === 'day') return [anchor];
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, anchor]);

  // ---- สรุปสัปดาห์ด้วย AI (คงไว้จากเดิม แสดงแบบ local ก่อน แล้วสลับเป็น AI เมื่อโหลดเสร็จ) ----
  const weekEvents = useMemo(() => {
    const weekStart = startOfWeek(anchor);
    const weekEnd = endOfWeek(anchor);
    const inWeek = (ev: CalendarEvent) => {
      const d = new Date(ev.date);
      return d >= weekStart && d <= weekEnd;
    };
    // รวม Loop ประจำเข้าไปด้วย - คาบเรียนก็กินเวลาในสัปดาห์จริงๆ ถ้าไม่นับ สรุปจะบอกว่าว่างเกินจริง
    return [...events.filter((ev) => inWeek(ev) && visibleIds.has(ev.categoryId)), ...recurringEvents.filter(inWeek)];
  }, [events, visibleIds, anchor, recurringEvents]);

  const localWeeklySummary = useMemo(() => buildWeeklySummary(weekEvents, categories), [weekEvents, categories]);
  const [aiWeeklySummary, setAiWeeklySummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryRequestSeq = useRef(0);

  useEffect(() => {
    setAiWeeklySummary(null);
    if (weekEvents.length === 0) {
      setSummaryLoading(false);
      return;
    }
    // เดินเลขคิวทันทีตั้งแต่ยังไม่ยิง - คำขอที่ค้างอยู่จะกลายเป็นของเก่าทันทีที่เปลี่ยนสัปดาห์
    // (ถ้าไปเดินเลขข้างใน setTimeout คำขอเก่าที่เพิ่งกลับมาจะยังนับว่าเป็นคำขอปัจจุบันอยู่
    //  แล้วเอาสรุปของสัปดาห์ก่อนมาแปะทับสัปดาห์ใหม่ในช่วง 400ms ที่รออยู่)
    const seq = ++summaryRequestSeq.current;
    setSummaryLoading(true);

    // หน่วง 400ms ก่อนยิงจริง - กดลูกศรเลื่อนสัปดาห์รัวๆ จะเรียก Gemini แค่ครั้งเดียวตอนหยุดกด
    const timer = setTimeout(() => {
      (async () => {
        try {
          const res = await fetch('/api/ai/weekly-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekEvents, categories }),
          });
          const data = await res.json();
          if (seq === summaryRequestSeq.current && data.summary) setAiWeeklySummary(data.summary);
        } catch {
          // เงียบไว้ - ใช้ localWeeklySummary ต่อไป
        } finally {
          // เช็ค seq ด้วย ไม่งั้นคำขอเก่าที่เพิ่งกลับมาจะไปปิดสถานะ "กำลังโหลด" ของคำขอใหม่
          if (seq === summaryRequestSeq.current) setSummaryLoading(false);
        }
      })();
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekEvents, categories]);

  const weeklySummary = aiWeeklySummary ?? localWeeklySummary;

  // ---- Navigation ----
  function goPrev() {
    setAnchor((d) => (view === 'day' ? subDays(d, 1) : view === 'week' ? subWeeks(d, 1) : subMonths(d, 1)));
  }
  function goNext() {
    setAnchor((d) => (view === 'day' ? addDays(d, 1) : view === 'week' ? addWeeks(d, 1) : addMonths(d, 1)));
  }
  function goToday() {
    setAnchor(new Date());
  }
  function openDay(day: Date) {
    setAnchor(day);
    setView('day');
  }

  // คลิกช่องวันในมุมมองเดือน -> เปิดไทม์ไลน์ของวันนั้นก่อน (ไม่เด้งฟอร์มเพิ่มทันทีเหมือนเดิม)
  function openDayTimeline(day: Date) {
    setTimelineDay(day);
  }

  // ---- Category handlers ----
  async function addCategory(name: string, color: PastelColor) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setCategories((prev) => [...prev, data.category]);
    setVisibleIds((prev) => new Set(prev).add(data.category.id));
  }

  async function updateCategory(id: string, changes: Partial<CalendarCategory>) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
    await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
  }

  async function deleteCategory(id: string) {
    const hasEvents = events.some((ev) => ev.categoryId === id);
    const msg = hasEvents
      ? 'หมวดหมู่นี้มีกิจกรรมอยู่ ถ้าลบ กิจกรรมในหมวดนี้จะถูกลบไปด้วย ลบเลยไหม?'
      : 'ลบหมวดหมู่นี้ใช่ไหม?';
    if (!confirm(msg)) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setEvents((prev) => prev.filter((ev) => ev.categoryId !== id));
    setVisibleIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
  }

  function toggleVisible(id: string) {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---- Event handlers ----
  function openAddModal(date?: Date, startTime?: string) {
    setModalState({
      open: true,
      defaultDate: toISODate(date ?? anchor),
      prefill: startTime ? { startTime } : undefined,
    });
  }

  function openEditModal(ev: CalendarEvent) {
    // อ่านอย่างเดียว แก้ไม่ได้ในปฏิทินปกติ
    // isDeadline: แก้ผ่านฟอร์ม event ตรงๆ จะไม่ย้อนไปอัปเดต Task.dueDate/dueTime
    // แล้วรอบซิงก์ถัดไปจะเขียนทับกลับเป็นค่าเดิม ต้องแก้ที่หน้า To-do เท่านั้น
    if (ev.source === 'google' || ev.source === 'recurring' || ev.isDeadline) return;
    setModalState({ open: true, editing: ev });
  }

  function closeModal() {
    setModalState({ open: false });
  }

  async function saveEvent(ev: CalendarEvent) {
    const isExisting = events.some((e) => e.id === ev.id);
    if (isExisting) {
      setEvents((prev) => prev.map((e) => (e.id === ev.id ? ev : e)));
      await fetch(`/api/events/${ev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ev),
      });
      return;
    }
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ev),
    });
    const data = await res.json();
    if (!res.ok) return;
    setEvents((prev) => [data.event, ...prev]);
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
  }

  return (
    <div className="px-4 md:px-10">
      <Topbar userName={userName} />

      {/* minmax(0,1fr) กันคอลัมน์ปฏิทินดันกริดจนล้นจอ (1fr เฉยๆ ยอมให้ลูกกว้างเกินช่องได้) */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        {/* ---------- Sidebar ซ้าย (โล่ง: มินิปฏิทิน + หมวดหมู่) ----------
            ตรึงไว้ตอนเลื่อนหน้า - ปฏิทินฝั่งขวาสูงกว่าเสมอ ถ้าปล่อยให้เลื่อนตามจะเหลือช่องว่างยาวๆ ข้างล่าง */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          <Card className="!p-4">
            <MiniCalendar selectedDate={anchor} events={displayEvents} onSelectDate={setAnchor} />
          </Card>

          {/* หมวดหมู่ปฏิทิน + ตัวกรอง */}
          <Card className="!p-4">
            <h2 className="font-display text-h3 text-ink">ปฏิทินของฉัน</h2>
            <p className="mt-1 font-body text-caption text-ink-muted">ติ๊กออกเพื่อซ่อนหมวดหมู่จากปฏิทินชั่วคราว</p>
            <div className="mt-3">
              <CategoryManager
                categories={categories}
                visibleIds={visibleIds}
                onToggleVisible={toggleVisible}
                onAdd={addCategory}
                onUpdate={updateCategory}
                onDelete={deleteCategory}
              />
            </div>
          </Card>
        </aside>

        {/* ---------- ส่วนปฏิทินหลัก ---------- */}
        <div className="flex flex-col gap-4">
          {/* Loop / Google เคยเป็นแถวปุ่มลอยแยกอีกแถวเหนือ toolbar - ยุบมาไว้ในแถวเดียวกันแล้ว
              ส่วนสรุปสัปดาห์ย้ายไปแสดงค้างไว้เต็มความกว้างใต้ปฏิทิน ไม่ต้องกดเปิดเอง */}
          <CalendarToolbar
            view={view}
            title={toolbarTitle(view, anchor)}
            onViewChange={setView}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
            onAdd={() => openAddModal()}
            extra={
              <>
                {/* Loop ชีวิต (ตารางประจำ) */}
                <Popover label="Loop ประจำ" icon={<Repeat size={14} />} badge={recurring.length} width="w-80">
                  <RecurringManager categories={categories} onChange={loadRecurring} />
                </Popover>

                {/* เชื่อม Google Calendar (อ่านอย่างเดียว) */}
                <Popover
                  label="Google"
                  icon={<CalendarDays size={14} />}
                  dotClass={
                    googleStatus === 'connected'
                      ? 'bg-emerald-500'
                      : googleStatus === 'account-error'
                      ? 'bg-amber-500'
                      : 'bg-ink-muted/40'
                  }
                  width="w-72"
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-eddy-600" />
                    <h2 className="font-display text-sm font-bold text-ink">Google Calendar</h2>
                  </div>
                  {googleStatus === 'connected' ? (
                    <>
                      <p className="mt-1 flex items-center gap-1 font-body text-xs font-semibold text-emerald-600">
                        <Check size={13} /> เชื่อมต่อแล้ว
                      </p>
                      <label className="mt-2 flex cursor-pointer items-center gap-2 font-body text-xs text-ink-soft">
                        <input
                          type="checkbox"
                          checked={showGoogle}
                          onChange={(e) => setShowGoogle(e.target.checked)}
                          className="h-4 w-4 accent-eddy-500"
                        />
                        แสดงกิจกรรมจาก Google ({googleEvents.length})
                      </label>
                    </>
                  ) : googleStatus === 'account-error' ? (
                    <div className="mt-1">
                      <p className="flex items-center gap-1 font-body text-xs font-semibold text-emerald-600">
                        <Check size={13} /> เชื่อมบัญชี Google แล้ว
                      </p>
                      <p className="mt-1 font-body text-xs text-eddy-700">
                        แต่ยังดึงปฏิทินไม่ได้ — ต้องเปิดใช้ &quot;Google Calendar API&quot; ในโปรเจกต์ Google Cloud ก่อน แล้วรอ 1-2 นาที
                      </p>
                    </div>
                  ) : googleStatus === 'off' ? (
                    <>
                      <p className="mt-1 font-body text-xs text-ink-muted">
                        เชื่อมเพื่อดึงกิจกรรมจากปฏิทิน Google มาแสดงในที่เดียว
                      </p>
                      <button
                        onClick={() => signIn('google')}
                        className="mt-2 rounded-full bg-ink px-3 py-1.5 font-display text-xs font-semibold text-white transition-colors hover:bg-black"
                      >
                        เชื่อม Google Calendar
                      </button>
                    </>
                  ) : (
                    <p className="mt-1 font-body text-xs text-ink-muted">กำลังตรวจสอบ...</p>
                  )}
                </Popover>
              </>
            }
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {view === 'month' ? (
                <MonthView
                  currentMonth={anchor}
                  events={displayEvents}
                  categories={displayCategories}
                  onAddOnDay={(day) => openAddModal(day)}
                  onOpenDay={openDayTimeline}
                  onEventClick={openEditModal}
                />
              ) : (
                <TimeGridView
                  days={gridDays}
                  events={displayEvents}
                  categories={displayCategories}
                  onAddSlot={(day, startTime) => openAddModal(day, startTime)}
                  onEventClick={openEditModal}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* สรุปสัปดาห์จากเอ็ดดี้ - วางนอกกริดให้กว้างเต็มหน้า (คร่อมใต้ทั้งแถบซ้ายและปฏิทิน)
          สรุปสัปดาห์ที่คร่อมวันที่กำลังดูอยู่เสมอ ไม่ว่าจะเปิดมุมมองวัน/สัปดาห์/เดือน */}
      <div className="mt-6">
        <WeeklySummaryPanel
          summary={weeklySummary}
          rangeLabel={toolbarTitle('week', anchor)}
          weekEvents={weekEvents}
          categories={displayCategories}
          loading={summaryLoading}
        />
      </div>

      {/* ไทม์ไลน์ของวันที่คลิกในมุมมองเดือน - ดูก่อนว่ามีอะไร แล้วค่อยกดเข้าไปแก้ */}
      <Modal
        open={timelineDay !== null}
        onClose={() => setTimelineDay(null)}
        title={timelineDay ? toolbarTitle('day', timelineDay) : ''}
        maxWidth="max-w-lg"
      >
        {timelineDay && (
          <DayTimeline
            // ใช้เกณฑ์เดียวกับที่ MonthView ใช้กรองกิจกรรมลงช่องวัน จะได้ตรงกับที่เห็นในตารางเป๊ะ
            events={displayEvents.filter((ev) => isSameDay(new Date(ev.date), timelineDay))}
            categories={displayCategories}
            onEventClick={(ev) => {
              setTimelineDay(null);
              openEditModal(ev);
            }}
            onAdd={() => {
              const day = timelineDay;
              setTimelineDay(null);
              openAddModal(day);
            }}
            onOpenDayView={() => {
              const day = timelineDay;
              setTimelineDay(null);
              openDay(day);
            }}
          />
        )}
      </Modal>

      <Modal
        open={modalState.open}
        onClose={closeModal}
        title={modalState.editing ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรม'}
        maxWidth="max-w-lg"
      >
        <EventFormModal
          categories={categories}
          initialEvent={modalState.editing}
          prefill={modalState.prefill}
          defaultDate={modalState.defaultDate}
          allEvents={events}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={closeModal}
        />
      </Modal>
    </div>
  );
}
