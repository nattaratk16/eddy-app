'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Repeat, Check, X } from 'lucide-react';
import TimePicker from './TimePicker';
import { getColorOption } from '@/lib/colors';
import { WEEKDAY_SHORT } from '@/lib/recurring';
import type { CalendarCategory, PastelColor, RecurringEventInfo } from '@/lib/types';

interface Props {
  categories: CalendarCategory[];
  onChange: () => void; // แจ้งให้ปฏิทินโหลด Loop ใหม่หลังเพิ่ม/ลบ
}

export default function RecurringManager({ categories, onChange }: Props) {
  const [items, setItems] = useState<RecurringEventInfo[]>([]);
  const [adding, setAdding] = useState(false);

  const [title, setTitle] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await fetch('/api/recurring').then((r) => r.json());
    setItems(d.recurring ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  function reset() {
    setTitle('');
    setDays([]);
    setStartTime('');
    setEndTime('');
    setCategoryId('');
    setEndDate('');
    setError('');
    setAdding(false);
  }

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function add() {
    setError('');
    if (!title.trim()) return setError('กรุณากรอกชื่อกิจกรรม');
    if (days.length === 0) return setError('กรุณาเลือกวันอย่างน้อย 1 วัน');
    if (!startTime || !endTime) return setError('กรุณาเลือกเวลาเริ่มและจบ');
    setSaving(true);
    const res = await fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, days, startTime, endTime, categoryId: categoryId || undefined, endDate: endDate || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error ?? 'บันทึกไม่สำเร็จ');
    reset();
    load();
    onChange();
  }

  async function remove(id: string) {
    if (!confirm('ลบ Loop นี้?')) return;
    await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
    load();
    onChange();
  }

  const dotOf = (catId?: string | null) => {
    const cat = catId ? categories.find((c) => c.id === catId) : null;
    return getColorOption((cat?.color as PastelColor) ?? 'lilac').dotClass;
  };

  const inputCls =
    'w-full rounded-clay-sm border border-eddy-200 bg-white px-3 py-2 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
          <Repeat size={15} /> Loop ประจำ
        </h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-0.5 font-body text-xs font-semibold text-eddy-600 hover:text-eddy-700">
            <Plus size={13} /> เพิ่ม
          </button>
        )}
      </div>
      <p className="mt-1 font-body text-xs text-ink-muted">กิจกรรมที่ทำซ้ำทุกสัปดาห์ (ตารางเรียน/เวลาทำงาน)</p>

      {/* รายการ */}
      <div className="mt-3 flex flex-col gap-1.5">
        {items.length === 0 && !adding && <p className="font-body text-xs text-ink-muted">ยังไม่มี Loop — เพิ่มตารางประจำได้เลย</p>}
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 rounded-clay-sm bg-eddy-50 px-2.5 py-1.5">
            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotOf(it.categoryId)}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-xs font-semibold text-ink">{it.title}</p>
              <p className="truncate font-body text-[11px] text-ink-muted">
                {it.days.map((d) => WEEKDAY_SHORT[d]).join(',')} · {it.startTime}-{it.endTime}
                {it.endDate ? ` · ถึง ${it.endDate}` : ''}
              </p>
            </div>
            <button onClick={() => remove(it.id)} aria-label="ลบ" className="rounded-full p-1 text-ink-muted hover:bg-white hover:text-eddy-700">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* ฟอร์มเพิ่ม */}
      {adding && (
        <div className="mt-3 flex flex-col gap-2.5 rounded-clay-sm border border-eddy-100 bg-white p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อ เช่น วิชา Data / งาน" className={inputCls} autoFocus />
          <div>
            <p className="mb-1 font-display text-xs font-semibold text-ink-soft">วัน</p>
            <div className="flex flex-wrap gap-1">
              {WEEKDAY_SHORT.map((label, d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`h-7 w-7 rounded-full font-body text-xs font-semibold transition-colors ${
                    days.includes(d) ? 'bg-ink text-white' : 'bg-eddy-50 text-ink-muted hover:bg-eddy-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 font-display text-xs font-semibold text-ink-soft">เริ่ม</p>
              <TimePicker id="recur-start" value={startTime} onChange={setStartTime} />
            </div>
            <div>
              <p className="mb-1 font-display text-xs font-semibold text-ink-soft">จบ</p>
              <TimePicker id="recur-end" value={endTime} onChange={setEndTime} />
            </div>
          </div>
          <div>
            <p className="mb-1 font-display text-xs font-semibold text-ink-soft">หมวดหมู่ (ไม่บังคับ)</p>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
              <option value="">— ไม่ระบุ —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 font-display text-xs font-semibold text-ink-soft">ใช้ถึงวันที่ (เช่น สิ้นเทอม — ไม่บังคับ)</p>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
          {error && <p className="font-body text-xs text-eddy-700">{error}</p>}
          <div className="flex gap-2">
            <button onClick={add} disabled={saving} className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 font-display text-xs font-semibold text-white hover:bg-black disabled:opacity-60">
              <Check size={13} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button onClick={reset} className="flex items-center gap-1 rounded-full border border-eddy-200 px-3 py-1.5 font-display text-xs font-semibold text-ink-muted hover:bg-eddy-50">
              <X size={13} /> ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
