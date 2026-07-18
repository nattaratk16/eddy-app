'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Pencil, Sparkles, Trash2, MapPin } from 'lucide-react';
import Topbar from '@/components/Topbar';
import Card from '@/components/Card';
import Modal from '@/components/Modal';
import CategoryManager from '@/components/CategoryManager';
import EventFormModal from '@/components/EventFormModal';
import EddyMascot from '@/components/EddyMascot';
import { getColorOption } from '@/lib/colors';
import { buildWeeklySummary } from '@/lib/aiMock';
import type { CalendarCategory, CalendarEvent, PastelColor } from '@/lib/types';

const weekDayLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const thMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
function thMonthYear(d: Date) {
  return `${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function thFullDate(d: Date) {
  return `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function toISODate(d: Date) {
  return format(d, 'yyyy-MM-dd');
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

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

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
  // ใช้ searchParams เป็น dependency (ไม่ใช่ []) เพราะ ChatWidget อยู่ใน layout ที่ mount ค้างไว้ตลอด
  // ถ้าผู้ใช้กด "เพิ่มลงปฏิทิน" ตอนอยู่หน้า /calendar อยู่แล้ว จะเป็นแค่ soft navigation ไม่ remount หน้านี้ใหม่
  useEffect(() => {
    const quickAdd = searchParams.get('quickAdd');
    if (!quickAdd) return;
    try {
      const draft = JSON.parse(decodeURIComponent(quickAdd));
      setModalState({ open: true, prefill: draft });
      if (draft.date) setSelectedDay(new Date(draft.date));
    } catch {
      // ignore malformed param
    }
    router.replace('/calendar');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // มาจาก mini calendar ในหน้า Dashboard - เลือกวันที่ระบุมาให้ทันที (ไม่เปิด modal)
  useEffect(() => {
    const date = searchParams.get('date');
    if (!date) return;
    const d = new Date(date);
    setSelectedDay(d);
    setCurrentMonth(d);
    router.replace('/calendar');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const result: Date[] = [];
    let day = start;
    while (day <= end) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [currentMonth]);

  function categoryOf(ev: CalendarEvent) {
    return categories.find((c) => c.id === ev.categoryId);
  }

  function eventsForDay(day: Date) {
    return events
      .filter((ev) => isSameDay(new Date(ev.date), day))
      .filter((ev) => visibleIds.has(ev.categoryId));
  }

  const selectedDayEvents = eventsForDay(selectedDay);

  // สรุปภาพรวมสัปดาห์ของวันที่เลือกอยู่ - แสดงแบบ local ทันที แล้วค่อยสลับเป็นเวอร์ชัน AI เมื่อโหลดเสร็จ
  const weekEvents = useMemo(() => {
    const weekStart = startOfWeek(selectedDay);
    const weekEnd = endOfWeek(selectedDay);
    return events.filter((ev) => {
      const d = new Date(ev.date);
      return d >= weekStart && d <= weekEnd && visibleIds.has(ev.categoryId);
    });
  }, [events, visibleIds, selectedDay]);

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
        // เพิกเฉยถ้ามี request ใหม่กว่ายิงออกไปแล้วระหว่างรอ (กัน response เก่ามาทับผลใหม่)
        if (seq === summaryRequestSeq.current && data.summary) setAiWeeklySummary(data.summary);
      } catch {
        // เงียบไว้ - ใช้ localWeeklySummary ต่อไป
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekEvents, categories]);

  const weeklySummary = aiWeeklySummary ?? localWeeklySummary;

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
  function openAddModal(date?: Date) {
    setModalState({ open: true, defaultDate: toISODate(date ?? selectedDay) });
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

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">{thMonthYear(currentMonth)}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                className="rounded-full bg-eddy-50 p-2 text-eddy-600 hover:bg-eddy-100"
                aria-label="เดือนก่อนหน้า"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                className="rounded-full bg-eddy-50 p-2 text-eddy-600 hover:bg-eddy-100"
                aria-label="เดือนถัดไป"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => openAddModal()}
                className="ml-2 flex items-center gap-1 rounded-clay-sm bg-eddy-500 px-3 py-2 font-display text-xs font-semibold text-white"
              >
                <Plus size={14} /> เพิ่มกิจกรรม
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center font-body text-xs font-semibold text-ink-muted">
            {weekDayLabels.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayEvents = eventsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDay);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  onDoubleClick={() => openAddModal(day)}
                  title="คลิกเพื่อดู วันคลิกสองครั้งเพื่อเพิ่มกิจกรรม"
                  className={`flex min-h-[78px] flex-col items-start gap-1 rounded-clay-sm p-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-eddy-500 shadow-clay-sm'
                      : inMonth
                      ? 'bg-eddy-50 hover:bg-eddy-100'
                      : 'bg-transparent opacity-40'
                  }`}
                >
                  <span className={`font-display text-sm font-semibold ${isSelected ? 'text-white' : 'text-ink'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const cat = categoryOf(ev);
                      const chipClass = cat ? getColorOption(cat.color).chipClass : 'bg-eddy-100 text-ink-muted';
                      return (
                        <span
                          key={ev.id}
                          className={`truncate rounded-full px-2 py-0.5 font-body text-[10px] ${chipClass} ${
                            isSelected ? 'ring-1 ring-white/60' : ''
                          }`}
                        >
                          {ev.title}
                        </span>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className={`font-body text-[10px] ${isSelected ? 'text-white/80' : 'text-ink-muted'}`}>
                        +{dayEvents.length - 2} เพิ่มเติม
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          {/* เฟส 2 (mock AI): สรุปภาพรวมสัปดาห์ */}
          <Card tone="white" className="flex items-start gap-3">
            <EddyMascot mood="think" size={48} float={false} />
            <div>
              <p className="flex items-center gap-1 font-display text-sm font-bold text-ink">
                <Sparkles size={14} /> เอ็ดดี้สรุปสัปดาห์นี้
              </p>
              <p className="mt-1 font-body text-sm text-ink-muted">{weeklySummary}</p>
            </div>
          </Card>

          {/* Category manager */}
          <Card>
            <h2 className="font-display text-base font-bold text-ink">หมวดหมู่ปฏิทิน</h2>
            <p className="mt-1 font-body text-xs text-ink-muted">
              ติ๊กออกเพื่อซ่อนหมวดหมู่นั้นจากปฏิทินชั่วคราว
            </p>
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

          {/* Selected day detail panel */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink">{thFullDate(selectedDay)}</h2>
                <p className="font-body text-xs text-ink-muted">
                  {selectedDayEvents.length > 0
                    ? `วันนี้มี ${selectedDayEvents.length} กิจกรรม`
                    : 'ยังไม่มีกิจกรรมในวันนี้'}
                </p>
              </div>
              <button
                onClick={() => openAddModal(selectedDay)}
                className="flex items-center gap-1 rounded-clay-sm bg-eddy-500 px-3 py-2 font-display text-xs font-semibold text-white hover:bg-eddy-600"
              >
                <Plus size={13} /> เพิ่ม
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {selectedDayEvents.length === 0 && (
                <p className="rounded-clay-sm bg-eddy-50 px-4 py-6 text-center font-body text-sm text-ink-muted">
                  ว่างทั้งวัน — ดับเบิลคลิกวันในปฏิทิน หรือกด &quot;เพิ่ม&quot; เพื่อสร้างกิจกรรมได้เลย
                </p>
              )}
              {selectedDayEvents.map((ev) => {
                const cat = categoryOf(ev);
                const color = cat ? getColorOption(cat.color) : null;
                return (
                  <div key={ev.id} className="flex gap-3 rounded-clay-sm bg-eddy-50 p-3">
                    <span className={`w-1.5 flex-shrink-0 self-stretch rounded-full ${color ? color.dotClass : 'bg-eddy-200'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-body text-sm font-semibold text-ink">{ev.title}</p>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <button
                            onClick={() => openEditModal(ev)}
                            aria-label="แก้ไขกิจกรรม"
                            className="rounded-full p-1 text-ink-muted hover:bg-white hover:text-eddy-600"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('ลบกิจกรรมนี้ใช่ไหม?')) deleteEvent(ev.id);
                            }}
                            aria-label="ลบกิจกรรม"
                            className="rounded-full p-1 text-ink-muted hover:bg-white hover:text-eddy-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {ev.startTime && (
                        <p className="mt-0.5 font-body text-xs text-ink-muted">
                          {ev.startTime}
                          {ev.endTime ? `–${ev.endTime}` : ''} น.
                        </p>
                      )}
                      {ev.location && (
                        <p className="mt-0.5 flex items-center gap-1 font-body text-xs text-ink-muted">
                          <MapPin size={11} /> {ev.location}
                        </p>
                      )}
                      {ev.description && (
                        <p className="mt-1 truncate font-body text-xs text-ink-muted">{ev.description}</p>
                      )}
                      <span className={`mt-2 inline-block rounded-full px-2 py-0.5 font-body text-[10px] ${color ? color.chipClass : 'bg-eddy-100 text-ink-muted'}`}>
                        {cat?.name ?? 'ไม่มีหมวดหมู่'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
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
