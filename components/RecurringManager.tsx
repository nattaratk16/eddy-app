'use client';

/**
 * RecurringManager — จัดการ "Loop ประจำ" (สิ่งที่ทำซ้ำทุกสัปดาห์)
 * --------------------------------------------------------------
 * Loop ไม่ใช่แค่กิจกรรมที่แสดงบนปฏิทิน แต่เป็น "เวลาไม่ว่างประจำ" ที่ระบบเอาไปใช้ต่อ:
 *   - หาช่วงว่างตอนจัดงาน To-do ลงปฏิทิน (lib/schedule.ts)
 *   - คิด Workload Score ของสมาชิกกลุ่ม (lib/groupWorkload.ts)
 *   - เตือนเวลาชนตอนเพิ่มกิจกรรมใหม่ (/api/ai/analyze-event)
 * เพราะงั้น Loop สองอันจึงลงเวลาทับกันไม่ได้ - ฝั่งเซิร์ฟเวอร์จะปฏิเสธและบอกว่าชนกับอันไหน
 * --------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { Plus, Trash2, Repeat, Check, X, Pencil, GraduationCap } from 'lucide-react';
import TimePicker from './TimePicker';
import { getColorOption } from '@/lib/colors';
import { WEEKDAY_SHORT } from '@/lib/recurring';
import type { CalendarCategory, PastelColor, RecurringEventInfo } from '@/lib/types';

interface Props {
  categories: CalendarCategory[];
  onChange: () => void; // แจ้งให้ปฏิทินโหลด Loop ใหม่หลังเพิ่ม/แก้/ลบ
}

const EMPTY = {
  title: '',
  courseCode: '',
  days: [] as number[],
  startTime: '',
  endTime: '',
  categoryId: '',
  endDate: '',
};

export default function RecurringManager({ categories, onChange }: Props) {
  const [items, setItems] = useState<RecurringEventInfo[]>([]);
  /** null = ปิดฟอร์ม, 'new' = เพิ่มใหม่, อื่นๆ = id ของ Loop ที่กำลังแก้ */
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await fetch('/api/recurring').then((r) => r.json());
    setItems(d.recurring ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  function closeForm() {
    setForm({ ...EMPTY });
    setError('');
    setEditing(null);
  }

  function startAdd() {
    setForm({ ...EMPTY });
    setError('');
    setEditing('new');
  }

  function startEdit(it: RecurringEventInfo) {
    setForm({
      title: it.title,
      courseCode: it.courseCode ?? '',
      days: it.days,
      startTime: it.startTime,
      endTime: it.endTime,
      categoryId: it.categoryId ?? '',
      endDate: it.endDate ?? '',
    });
    setError('');
    setEditing(it.id);
  }

  function toggleDay(d: number) {
    setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));
  }

  async function save() {
    setError('');
    if (!form.title.trim()) return setError('กรุณากรอกชื่อกิจกรรม');
    if (form.days.length === 0) return setError('กรุณาเลือกวันอย่างน้อย 1 วัน');
    if (!form.startTime || !form.endTime) return setError('กรุณาเลือกเวลาเริ่มและจบ');
    if (form.endTime <= form.startTime) return setError('เวลาจบต้องหลังเวลาเริ่ม');

    setSaving(true);
    const isNew = editing === 'new';
    const res = await fetch(isNew ? '/api/recurring' : `/api/recurring/${editing}`, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        courseCode: form.courseCode,
        days: form.days,
        startTime: form.startTime,
        endTime: form.endTime,
        categoryId: form.categoryId,
        endDate: form.endDate || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? 'บันทึกไม่สำเร็จ');
    closeForm();
    load();
    onChange();
  }

  async function remove(id: string) {
    if (!confirm('ลบ Loop นี้?')) return;
    await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
    if (editing === id) closeForm();
    load();
    onChange();
  }

  const dotOf = (catId?: string | null) => {
    const cat = catId ? categories.find((c) => c.id === catId) : null;
    return getColorOption((cat?.color as PastelColor) ?? 'lilac').dotClass;
  };

  const inputCls =
    'w-full rounded-clay-sm border border-eddy-200 bg-white px-3 py-2 font-body text-sm text-ink focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';
  const labelCls = 'mb-1 block font-display text-xs font-semibold text-ink-soft';

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
          <Repeat size={15} /> Loop ประจำ
        </h2>
        {editing === null && (
          <button
            onClick={startAdd}
            className="flex items-center gap-0.5 font-body text-xs font-semibold text-eddy-600 hover:text-eddy-700"
          >
            <Plus size={13} /> เพิ่ม
          </button>
        )}
      </div>
      <p className="mt-1 font-body text-xs text-ink-muted">
        สิ่งที่ทำประจำทุกสัปดาห์ (คาบเรียน/เวลาทำงาน) — เอ็ดดี้ใช้เป็นเวลาไม่ว่างตอนหาช่องว่างและคิดภาระงาน
      </p>

      {/* รายการ */}
      <div className="mt-3 flex flex-col gap-1.5">
        {items.length === 0 && editing === null && (
          <p className="font-body text-xs text-ink-muted">ยังไม่มี Loop — เพิ่มตารางประจำได้เลย</p>
        )}
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 rounded-clay-sm bg-eddy-50 px-2.5 py-1.5">
            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotOf(it.categoryId)}`} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate font-body text-xs font-semibold text-ink">
                {it.courseCode && (
                  <span className="flex flex-shrink-0 items-center gap-0.5 rounded bg-white px-1.5 py-0.5 font-display text-[10px] font-bold text-eddy-700">
                    <GraduationCap size={10} /> {it.courseCode}
                  </span>
                )}
                <span className="truncate">{it.title}</span>
              </p>
              <p className="truncate font-body text-[11px] text-ink-muted">
                {it.days.map((d) => WEEKDAY_SHORT[d]).join(',')} · {it.startTime}-{it.endTime}
                {it.endDate ? ` · ถึง ${it.endDate}` : ''}
              </p>
            </div>
            <button
              onClick={() => startEdit(it)}
              aria-label={`แก้ไข ${it.title}`}
              className="rounded-full p-1 text-ink-muted hover:bg-white hover:text-eddy-600"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => remove(it.id)}
              aria-label={`ลบ ${it.title}`}
              className="rounded-full p-1 text-ink-muted hover:bg-white hover:text-eddy-700"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* ฟอร์มเพิ่ม/แก้ไข */}
      {editing !== null && (
        <div className="mt-3 flex flex-col gap-2.5 rounded-clay-sm border border-eddy-100 bg-white p-3">
          <p className="font-display text-xs font-bold text-ink">{editing === 'new' ? 'เพิ่ม Loop ใหม่' : 'แก้ไข Loop'}</p>

          <div>
            <label className={labelCls} htmlFor="loop-title">ชื่อ</label>
            <input
              id="loop-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="เช่น วิชา Database / เวลาทำงาน"
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="loop-code">รหัสวิชา (ใส่เฉพาะถ้าเป็นคาบเรียน)</label>
            <input
              id="loop-code"
              value={form.courseCode}
              onChange={(e) => setForm((f) => ({ ...f, courseCode: e.target.value }))}
              placeholder="เช่น 01076021"
              maxLength={20}
              className={inputCls}
            />
          </div>

          <div>
            <p className={labelCls}>วัน</p>
            <div className="flex flex-wrap gap-1">
              {WEEKDAY_SHORT.map((label, d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`h-7 w-7 rounded-full font-body text-xs font-semibold transition-colors ${
                    form.days.includes(d) ? 'bg-ink text-white' : 'bg-eddy-50 text-ink-muted hover:bg-eddy-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className={labelCls}>เริ่ม</p>
              <TimePicker id="recur-start" value={form.startTime} onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} />
            </div>
            <div>
              <p className={labelCls}>จบ</p>
              <TimePicker id="recur-end" value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="loop-cat">หมวดหมู่ (ไม่บังคับ)</label>
            <select
              id="loop-cat"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className={inputCls}
            >
              <option value="">— ไม่ระบุ —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} htmlFor="loop-end">ใช้ถึงวันที่ (เช่น สิ้นเทอม — ไม่บังคับ)</label>
            <input
              id="loop-end"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className={inputCls}
            />
          </div>

          {error && <p className="rounded-clay-sm bg-pastel-pink/50 px-2.5 py-1.5 font-body text-xs text-eddy-700">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 font-display text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              <Check size={13} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button
              onClick={closeForm}
              className="flex items-center gap-1 rounded-full border border-eddy-200 px-3 py-1.5 font-display text-xs font-semibold text-ink-muted hover:bg-eddy-50"
            >
              <X size={13} /> ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
