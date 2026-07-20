'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import Modal from '@/components/Modal';
import CategoryManager from '@/components/CategoryManager';
import EventFormModal from '@/components/EventFormModal';
import EddyMascot from '@/components/EddyMascot';
import CalendarToolbar from '@/components/calendar/CalendarToolbar';
import MiniCalendar from '@/components/calendar/MiniCalendar';
import MonthView from '@/components/calendar/MonthView';
import TimeGridView from '@/components/calendar/TimeGridView';
import { buildWeeklySummary } from '@/lib/aiMock';
import type { CalendarCategory, CalendarEvent, CalendarView, PastelColor } from '@/lib/types';

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
    return events.filter((ev) => {
      const d = new Date(ev.date);
      return d >= weekStart && d <= weekEnd && visibleIds.has(ev.categoryId);
    });
  }, [events, visibleIds, anchor]);

  const localWeeklySummary = useMemo(() => buildWeeklySummary(weekEvents, categories), [weekEvents, categories]);
  const [aiWeeklySummary, setAiWeeklySummary] = useState<string | null>(null);
  const summaryRequestSeq = useRef(0);

  useEffect(() => {
    setAiWeeklySummary(null);
    if (weekEvents.length === 0) return;
    const seq = ++summaryRequestSeq.current;
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
      }
    })();
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

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* ---------- Sidebar ซ้าย (แบบ Google) ---------- */}
        <aside className="flex flex-col gap-5">
          <Card className="!p-4">
            <MiniCalendar selectedDate={anchor} events={visibleEvents} onSelectDate={setAnchor} />
          </Card>

          {/* หมวดหมู่ปฏิทิน + ตัวกรอง */}
          <Card className="!p-4">
            <h2 className="font-display text-sm font-bold text-ink">ปฏิทินของฉัน</h2>
            <p className="mt-1 font-body text-xs text-ink-muted">ติ๊กออกเพื่อซ่อนหมวดหมู่จากปฏิทินชั่วคราว</p>
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

          {/* สรุปสัปดาห์ด้วย AI */}
          <Card tone="white" className="flex items-start gap-3 !p-4">
            <EddyMascot mood="think" size={44} float={false} />
            <div>
              <p className="flex items-center gap-1 font-display text-sm font-bold text-ink">
                <Sparkles size={14} /> เอ็ดดี้สรุปสัปดาห์นี้
              </p>
              <p className="mt-1 font-body text-xs text-ink-muted">{weeklySummary}</p>
            </div>
          </Card>
        </aside>

        {/* ---------- ส่วนปฏิทินหลัก ---------- */}
        <div className="flex flex-col gap-4">
          <CalendarToolbar
            view={view}
            title={toolbarTitle(view, anchor)}
            onViewChange={setView}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
            onAdd={() => openAddModal()}
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
                  events={visibleEvents}
                  categories={categories}
                  onAddOnDay={(day) => openAddModal(day)}
                  onOpenDay={openDay}
                  onEventClick={openEditModal}
                />
              ) : (
                <TimeGridView
                  days={gridDays}
                  events={visibleEvents}
                  categories={categories}
                  onAddSlot={(day, startTime) => openAddModal(day, startTime)}
                  onEventClick={openEditModal}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

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
