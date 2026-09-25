'use client';

import { useCallback, useEffect, useState, use } from 'react';
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { ArrowRight, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import TimeGridView from '@/components/calendar/TimeGridView';
import { getColorOption } from '@/lib/colors';
import type { CalendarEvent, PastelColor } from '@/lib/types';

interface MemberInfo {
  id: string; // userId (ใช้เป็น categoryId ให้ TimeGridView)
  name: string;
  color: PastelColor;
  image?: string | null;
  isMe: boolean;
  showEventTitles: boolean;
}

const thMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function weekTitle(start: Date) {
  const end = addDays(start, 6);
  const be = end.getFullYear() + 543;
  if (start.getMonth() === end.getMonth())
    return `${start.getDate()} – ${end.getDate()} ${thMonthsShort[end.getMonth()]} ${be}`;
  return `${start.getDate()} ${thMonthsShort[start.getMonth()]} – ${end.getDate()} ${thMonthsShort[end.getMonth()]} ${be}`;
}

export default function GroupCalendarPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/groups/${params.id}/calendar?start=${format(weekStart, 'yyyy-MM-dd')}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setMembers(data.members ?? []);
      setEvents(data.events ?? []);
    } catch {
      // เน็ตหลุด/เซิร์ฟเวอร์พัง - ไม่งั้นจะค้างที่ "กำลังโหลดตารางกลุ่ม..." ตลอดไป (บั๊กเดียวกับที่แก้ไปแล้วในหน้ารวมกลุ่ม)
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [params.id, weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const me = members.find((m) => m.isMe);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  async function togglePrivacy() {
    if (!me || savingPrivacy) return;
    setSavingPrivacy(true);
    const next = !me.showEventTitles;
    setMembers((prev) => prev.map((m) => (m.isMe ? { ...m, showEventTitles: next } : m)));
    await fetch(`/api/groups/${params.id}/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showEventTitles: next }),
    });
    setSavingPrivacy(false);
  }

  if (notFound) return <p className="py-10 text-center font-body text-sm text-ink-muted">ไม่พบปฏิทินของกลุ่มนี้</p>;
  if (loadError)
    return (
      <EmptyState
        size="full"
        mood="think"
        title="โหลดปฏิทินกลุ่มไม่สำเร็จ"
        description="เชื่อมต่อไม่ได้ ลองใหม่อีกครั้งนะ"
        action={{ label: 'ลองใหม่', icon: <ArrowRight size={16} />, onClick: load }}
      />
    );

  return (
    <div>
      {/* แถบบน: เลือกสัปดาห์ + ความเป็นส่วนตัวของฉัน */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="rounded-full border border-eddy-100 bg-surface px-3.5 py-2 font-display text-xs font-semibold text-eddy-700 transition-colors hover:bg-eddy-50"
          >
            สัปดาห์นี้
          </button>
          <button onClick={() => setWeekStart((w) => subWeeks(w, 1))} className="rounded-full p-2 text-eddy-600 transition-colors hover:bg-eddy-50" aria-label="สัปดาห์ก่อน">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setWeekStart((w) => addWeeks(w, 1))} className="rounded-full p-2 text-eddy-600 transition-colors hover:bg-eddy-50" aria-label="สัปดาห์ถัดไป">
            <ChevronRight size={20} />
          </button>
          <h2 className="ml-1 font-display text-base font-bold text-ink">{weekTitle(weekStart)}</h2>
        </div>

        {/* toggle ความเป็นส่วนตัวของฉัน */}
        {me && (
          <button
            onClick={togglePrivacy}
            disabled={savingPrivacy}
            className="flex items-center gap-2 rounded-full border border-eddy-200 bg-surface px-3.5 py-2 font-display text-xs font-semibold text-ink-soft transition-colors hover:bg-eddy-50"
          >
            {me.showEventTitles ? <Eye size={15} /> : <EyeOff size={15} />}
            {me.showEventTitles ? 'เพื่อนเห็นชื่อกิจกรรมของฉัน' : 'เพื่อนเห็นแค่ว่าฉัน "ไม่ว่าง"'}
          </button>
        )}
      </div>

      {/* legend สมาชิก */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {members.map((m) => (
          <span key={m.id} className="flex items-center gap-1.5 font-body text-xs text-ink">
            <span className={`h-3 w-3 rounded-full ${getColorOption(m.color).dotClass}`} />
            {m.name}
            {m.isMe && <span className="text-ink-muted">(คุณ)</span>}
            {!m.showEventTitles && !m.isMe && <EyeOff size={11} className="text-ink-muted" />}
          </span>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <Card className="py-16 text-center font-body text-sm text-ink-muted">กำลังโหลดตารางกลุ่ม...</Card>
        ) : (
          <TimeGridView
            days={days}
            events={events}
            categories={members.map((m) => ({ id: m.id, name: m.name, color: m.color }))}
            readOnly
          />
        )}
      </div>
    </div>
  );
}
