'use client';

/**
 * RecurringManager — จัดการ "Loop ประจำ" (สิ่งที่ทำซ้ำทุกสัปดาห์)
 * --------------------------------------------------------------
 * Loop ไม่ใช่แค่กิจกรรมที่แสดงบนปฏิทิน แต่เป็น "เวลาไม่ว่างประจำ" ที่ระบบเอาไปใช้ต่อ:
 *   - หาช่วงว่างตอนจัดงาน To-do ลงปฏิทิน (lib/schedule.ts)
 *   - คิด Workload Score ของสมาชิกกลุ่ม (lib/groupWorkload.ts)
 *   - เตือนเวลาชนตอนเพิ่มกิจกรรมใหม่ (/api/ai/analyze-event)
 * เพราะงั้น Loop สองอันจึงลงเวลาทับกันไม่ได้ - ฝั่งเซิร์ฟเวอร์จะปฏิเสธและบอกว่าชนกับอันไหน
 *
 * เดิมอยู่ใน popover กว้าง 320px เลยต้องบีบตัวอักษรเหลือ text-xs/[10px] ทั้งแผง
 * ตอนนี้ย้ายมาอยู่ใน Modal กลางจอแล้ว จึงจัดเป็น 2 โหมดเต็มความกว้างแทน:
 *   editing === null -> โหมดรายการ (ดู Loop ทั้งหมด + ปุ่มเพิ่ม)
 *   editing !== null -> โหมดฟอร์ม (ซ่อนรายการไปเลย ฟอร์มจะได้ไม่ต้องแย่งพื้นที่กับรายการ
 *                       และ modal ไม่ยาวจนต้องสกรอลล์)
 * --------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, GraduationCap, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
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

/** เวลาที่ Loop นี้กินไปทั้งสัปดาห์ (ความยาวต่อครั้ง x จำนวนวัน) - null ถ้ายังกรอกไม่ครบ */
function weeklyLoad(days: number[], startTime: string, endTime: string): string | null {
  if (days.length === 0 || !startTime || !endTime) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const per = eh * 60 + em - (sh * 60 + sm);
  if (!Number.isFinite(per) || per <= 0) return null;
  const total = per * days.length;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} น./สัปดาห์`;
  return m === 0 ? `${h} ชม./สัปดาห์` : `${h} ชม. ${m} น./สัปดาห์`;
}

/** "2026-10-15" -> "15 ต.ค. 2569" (เป็นป้ายวันที่ล้วน อ่านเป็น UTC ไม่ให้เลื่อนตามโซนเวลาเครื่อง) */
function thaiDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** แถบ 7 วันของสัปดาห์ - วันที่เลือกไว้ทึบ ที่เหลือจาง (อ่านง่ายกว่าเขียน "จ,พ" เป็นข้อความ) */
function DayStrip({ days }: { days: number[] }) {
  return (
    <span className="flex flex-shrink-0 gap-0.5">
      {WEEKDAY_SHORT.map((label, d) => (
        <span
          key={d}
          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 font-body text-[10px] font-semibold ${
            days.includes(d) ? 'bg-eddy-500 text-white' : 'bg-eddy-50 text-ink-muted'
          }`}
        >
          {label}
        </span>
      ))}
    </span>
  );
}

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

  const chipOf = (catId?: string | null) => {
    const cat = catId ? categories.find((c) => c.id === catId) : null;
    return getColorOption((cat?.color as PastelColor) ?? 'lilac').chipClass;
  };

  const inputCls =
    'w-full rounded-clay-sm border border-eddy-200 bg-surface px-3.5 py-2.5 font-body text-body text-ink placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';
  const labelCls = 'mb-1.5 block font-display text-caption font-semibold text-ink-soft';

  // ---------------- โหมดฟอร์ม ----------------
  if (editing !== null) {
    const preview = weeklyLoad(form.days, form.startTime, form.endTime);

    return (
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={closeForm}
            aria-label="กลับไปหน้ารายการ"
            className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-eddy-50 hover:text-ink"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="font-display text-body font-bold text-ink">
            {editing === 'new' ? 'เพิ่ม Loop ใหม่' : 'แก้ไข Loop'}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
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
              <label className={labelCls} htmlFor="loop-code">รหัสวิชา</label>
              <input
                id="loop-code"
                value={form.courseCode}
                onChange={(e) => setForm((f) => ({ ...f, courseCode: e.target.value }))}
                placeholder="ใส่ถ้าเป็นคาบเรียน"
                maxLength={20}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <p className={labelCls}>วันที่ทำซ้ำ</p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_SHORT.map((label, d) => {
                const on = form.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    aria-pressed={on}
                    className={`h-11 min-w-[44px] rounded-clay-sm px-2 font-display text-caption font-semibold transition-all active:scale-95 ${
                      on
                        ? 'bg-gradient-to-br from-eddy-500 to-accent-500 text-white shadow-clay-sm'
                        : 'bg-eddy-50 text-ink-muted hover:bg-eddy-100 hover:text-ink-soft'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className={labelCls}>เริ่ม</p>
              <TimePicker id="recur-start" value={form.startTime} onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} />
            </div>
            <div>
              <p className={labelCls}>จบ</p>
              <TimePicker id="recur-end" value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} />
            </div>
            <div>
              <label className={labelCls} htmlFor="loop-cat">หมวดหมู่</label>
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
          </div>

          <div className="sm:max-w-[260px]">
            <label className={labelCls} htmlFor="loop-end">ใช้ถึงวันที่ (เช่น สิ้นเทอม)</label>
            <input
              id="loop-end"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className={inputCls}
            />
          </div>

          {/* สรุปสิ่งที่กรอกไว้ - เห็นทันทีว่า Loop นี้จะกินเวลาไปเท่าไรก่อนกดบันทึก */}
          {preview && (
            <p className="flex items-center gap-2 rounded-clay-sm bg-eddy-50 px-3.5 py-2.5 font-body text-caption text-ink-soft">
              <Repeat size={14} className="flex-shrink-0 text-eddy-500" />
              ซ้ำ {form.days.length} วัน/สัปดาห์ · {form.startTime} – {form.endTime} · รวม
              <span className="font-semibold text-ink">{preview}</span>
            </p>
          )}

          {error && (
            <p className="flex items-center gap-2 rounded-clay-sm bg-pastel-coral/60 px-3.5 py-2.5 font-body text-caption font-semibold text-chip-ink dark:bg-pastel-coral-dark/20 dark:text-pastel-coral-dark">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-eddy-100 pt-4">
          <button
            onClick={closeForm}
            className="rounded-full border border-eddy-200 px-4 py-2 font-display text-caption font-semibold text-ink-soft transition-colors hover:bg-eddy-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-5 py-2 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            <Check size={15} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    );
  }

  // ---------------- โหมดรายการ ----------------
  return (
    <div>
      <p className="font-body text-caption text-ink-muted">
        สิ่งที่ทำประจำทุกสัปดาห์ (คาบเรียน/เวลาทำงาน) — เอ็ดดี้ใช้เป็นเวลาไม่ว่างตอนหาช่องว่างและคิดภาระงาน
      </p>

      {items.length === 0 ? (
        <div className="mt-4 rounded-clay border border-dashed border-eddy-200 bg-eddy-50/50 px-6 py-10 text-center">
          <Repeat size={30} className="mx-auto text-eddy-300" />
          <p className="mt-3 font-display text-body font-semibold text-ink">ยังไม่มี Loop</p>
          <p className="mx-auto mt-1 max-w-sm font-body text-caption text-ink-muted">
            เพิ่มคาบเรียนหรือเวลาทำงานประจำไว้ แล้วเอ็ดดี้จะเลี่ยงช่วงเวลาพวกนี้ให้อัตโนมัติตอนจัดตาราง
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-clay border border-eddy-100 bg-surface px-3.5 py-3 transition-shadow hover:shadow-clay-sm"
            >
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-clay-sm ${chipOf(it.categoryId)}`}>
                {it.courseCode ? <GraduationCap size={17} /> : <Repeat size={16} />}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-display text-body font-semibold text-ink">
                  {it.courseCode && (
                    <span className="flex-shrink-0 rounded bg-eddy-50 px-1.5 py-0.5 font-display text-micro font-bold text-eddy-700">
                      {it.courseCode}
                    </span>
                  )}
                  <span className="truncate">{it.title}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-caption text-ink-muted">
                  <DayStrip days={it.days} />
                  <span className="text-ink-soft">{it.startTime} – {it.endTime}</span>
                  {weeklyLoad(it.days, it.startTime, it.endTime) && (
                    <span>· {weeklyLoad(it.days, it.startTime, it.endTime)}</span>
                  )}
                  {it.endDate && <span>· ถึง {thaiDate(it.endDate)}</span>}
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-0.5">
                <button
                  onClick={() => startEdit(it)}
                  aria-label={`แก้ไข ${it.title}`}
                  className="rounded-full p-2 text-ink-muted transition-colors hover:bg-eddy-50 hover:text-eddy-600"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => remove(it.id)}
                  aria-label={`ลบ ${it.title}`}
                  className="rounded-full p-2 text-ink-muted transition-colors hover:bg-pastel-coral/50 hover:text-chip-ink"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={startAdd}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-5 py-2.5 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 active:scale-95"
      >
        <Plus size={16} /> เพิ่ม Loop ใหม่
      </button>
    </div>
  );
}
