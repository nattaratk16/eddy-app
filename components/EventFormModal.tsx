'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import Button from './Button';
import EddyMascot from './EddyMascot';
import TimePicker from './TimePicker';
import { getColorOption } from '@/lib/colors';
import { checkScheduleConflict, suggestCategoryId, type ConflictResult } from '@/lib/aiMock';
import type { ScheduleAnalysis } from '@/lib/gemini';
import type { CalendarCategory, CalendarEvent } from '@/lib/types';

interface EventFormModalProps {
  categories: CalendarCategory[];
  /** กิจกรรมที่กำลังแก้ไข (ถ้ามี = โหมดแก้ไข) */
  initialEvent?: CalendarEvent;
  /** ข้อมูลเริ่มต้นบางส่วน เช่น จาก quick-add ในแชท หรือวันที่เลือกไว้ */
  prefill?: Partial<CalendarEvent>;
  defaultDate?: string; // ISO YYYY-MM-DD ใช้ตอนสร้างใหม่จากวันที่เลือกไว้
  /** กิจกรรมทั้งหมด ใช้สำหรับเช็คเวลาชนกัน (เฟส 2 - mock AI) */
  allEvents: CalendarEvent[];
  onSave: (event: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-clay-sm border border-eddy-200 bg-surface px-4 py-2.5 font-body text-sm text-ink transition-colors placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';
const labelClass = 'mb-1.5 block font-display text-sm font-semibold text-ink-soft';

export default function EventFormModal({
  categories,
  initialEvent,
  prefill,
  defaultDate,
  allEvents,
  onSave,
  onDelete,
  onClose,
}: EventFormModalProps) {
  const isEditing = Boolean(initialEvent);
  const seed = initialEvent ?? prefill;

  const [title, setTitle] = useState(seed?.title ?? '');
  const [categoryId, setCategoryId] = useState(seed?.categoryId ?? categories[0]?.id ?? '');
  const [date, setDate] = useState(seed?.date ?? defaultDate ?? '');
  const [startTime, setStartTime] = useState(seed?.startTime ?? '');
  const [endTime, setEndTime] = useState(seed?.endTime ?? '');
  const [location, setLocation] = useState(seed?.location ?? '');
  const [description, setDescription] = useState(seed?.description ?? '');
  const [error, setError] = useState('');

  // ถ้าเปิด modal ก่อนที่ categories จะโหลดเสร็จ (เช่น จาก quick-add ในแชท) categoryId จะ init เป็น ''
  // เพราะตอน mount ครั้งแรก categories ยังว่างอยู่ - พอ categories โหลดเสร็จทีหลัง ให้ตั้งค่าเริ่มต้นให้ใหม่
  // (เฉพาะตอนที่ยังไม่มีการเลือกอะไรเลยเท่านั้น ไม่ทับค่าที่ผู้ใช้เลือกเองแล้ว)
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  // เฟส 2 (mock AI): เช็คเวลาชนกัน
  const [conflict, setConflict] = useState<ConflictResult | null>(null);
  useEffect(() => {
    if (!date || !startTime) {
      setConflict(null);
      return;
    }
    // หมุดกำหนดส่งมีระยะเวลา 0 นาที ไม่ใช่เวลาที่ถูกจอง ไม่ต้องเอามาเช็คว่าชนกัน
    const sameDay = allEvents.filter((e) => e.date === date && !e.isDeadline);
    setConflict(checkScheduleConflict(startTime, endTime || undefined, sameDay, initialEvent?.id));
  }, [date, startTime, endTime, allEvents, initialEvent?.id]);

  // วิเคราะห์ตารางด้วย Gemini จริง (debounce ~800ms หลังมีวันที่+เวลาเริ่ม) - เสริมจากการเช็คแบบ local ด้านบน ไม่แทนที่
  const [aiAnalysis, setAiAnalysis] = useState<ScheduleAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const aiRequestSeq = useRef(0);
  useEffect(() => {
    if (!date || !startTime) {
      setAiAnalysis(null);
      setAiLoading(false);
      return;
    }
    setAiLoading(true);
    const timer = setTimeout(async () => {
      const seq = ++aiRequestSeq.current;
      try {
        const res = await fetch('/api/ai/analyze-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || 'กิจกรรมใหม่',
            date,
            startTime,
            endTime,
            categoryId,
            eventId: initialEvent?.id,
          }),
        });
        const data = await res.json();
        // เพิกเฉยถ้ามี request ใหม่กว่ายิงออกไปแล้วระหว่างรอ (กัน response เก่ามาทับผลใหม่)
        if (seq === aiRequestSeq.current) setAiAnalysis(data.analysis ?? null);
      } catch {
        if (seq === aiRequestSeq.current) setAiAnalysis(null);
      } finally {
        if (seq === aiRequestSeq.current) setAiLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [date, startTime, endTime, categoryId, title, initialEvent?.id]);

  function applyAiSuggestedTime() {
    if (!aiAnalysis?.suggestedStart || !aiAnalysis?.suggestedEnd) return;
    setStartTime(aiAnalysis.suggestedStart);
    setEndTime(aiAnalysis.suggestedEnd);
  }

  // เฟส 2 (mock AI): แนะนำหมวดหมู่อัตโนมัติจากชื่อกิจกรรม (เฉพาะถ้าผู้ใช้ยังไม่ได้เลือกเองตอนสร้างใหม่)
  const [categoryAutoSet, setCategoryAutoSet] = useState(!seed?.categoryId);
  const [autoSuggestedName, setAutoSuggestedName] = useState<string | null>(null);
  function handleTitleBlur() {
    if (!categoryAutoSet || !title.trim()) return;
    const guess = suggestCategoryId(title, categories);
    if (guess) {
      setCategoryId(guess);
      setAutoSuggestedName(categories.find((c) => c.id === guess)?.name ?? null);
    }
  }

  function applySuggestedTime() {
    if (!conflict) return;
    setStartTime(conflict.suggestedStart);
    setEndTime(conflict.suggestedEnd);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) return setError('กรุณากรอกชื่อกิจกรรม');
    if (!categoryId) return setError('กรุณาเลือกหมวดหมู่ (ถ้ายังไม่มี ให้เพิ่มหมวดหมู่ก่อนทางด้านซ้าย)');
    if (!date) return setError('กรุณาเลือกวันที่');

    const event: CalendarEvent = {
      id: initialEvent?.id ?? crypto.randomUUID(),
      title: title.trim(),
      categoryId,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
    };

    onSave(event);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className={labelClass} htmlFor="ev-title">ชื่อกิจกรรม</label>
        <input
          id="ev-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="เช่น ประชุมทีม Capstone"
          className={inputClass}
          autoFocus
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="ev-category">หมวดหมู่</label>
        {categories.length === 0 ? (
          <p className="rounded-clay-sm bg-pastel-yellow/50 px-3 py-2 font-body text-xs text-ink-soft dark:bg-pastel-yellow-dark/20 dark:text-pastel-yellow-dark">
            ยังไม่มีหมวดหมู่ — เพิ่มหมวดหมู่ปฏิทินทางด้านซ้ายก่อนนะ
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const color = getColorOption(cat.color);
                const active = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.id);
                      setCategoryAutoSet(false);
                      setAutoSuggestedName(null);
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs font-semibold transition-all ${color.chipClass} ${
                      active ? 'ring-2 ring-eddy-400' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${color.dotClass}`} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {autoSuggestedName && (
              <p className="mt-1.5 flex items-center gap-1 font-body text-xs text-eddy-600">
                <Sparkles size={12} /> เอ็ดดี้เดาว่าน่าจะเป็นหมวด &quot;{autoSuggestedName}&quot; เปลี่ยนได้ถ้าไม่ตรง
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="ev-date">วันที่</label>
          <input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="ev-start">เวลาเริ่ม</label>
          <TimePicker id="ev-start" value={startTime} onChange={setStartTime} />
        </div>
        <div>
          <label className={labelClass} htmlFor="ev-end">เวลาจบ</label>
          <TimePicker id="ev-end" value={endTime} onChange={setEndTime} />
        </div>
      </div>

      {conflict && (
        <div className="flex items-start gap-3 rounded-clay-sm bg-pastel-pink/50 dark:bg-pastel-pink-dark/15 p-3">
          <EddyMascot mood="think" size={36} float={false} />
          <div className="flex-1">
            <p className="font-body text-sm text-ink">
              ช่วงเวลานี้ชนกับ <span className="font-semibold">&quot;{conflict.conflictsWith.title}&quot;</span> นะ
              ลองเวลานี้ดูไหม: <span className="font-semibold">{conflict.suggestedStart}-{conflict.suggestedEnd}</span>
            </p>
            <button
              type="button"
              onClick={applySuggestedTime}
              className="mt-2 rounded-clay-sm bg-eddy-500 px-3 py-1.5 font-display text-xs font-semibold text-white"
            >
              ใช้เวลานี้แทน
            </button>
          </div>
        </div>
      )}

      {(aiLoading || aiAnalysis) && date && startTime && (
        <div className="flex items-start gap-3 rounded-clay-sm bg-pastel-lilac/50 dark:bg-pastel-lilac-dark/15 p-3">
          <EddyMascot character="nova" mood={aiLoading ? 'think' : 'happy'} size={36} float={false} />
          <div className="flex-1">
            <p className="flex items-center gap-1 font-display text-xs font-semibold text-eddy-700">
              <Sparkles size={12} /> เอ็ดดี้วิเคราะห์ตารางให้
            </p>
            {aiLoading ? (
              <p className="mt-1 font-body text-sm text-ink-muted">กำลังวิเคราะห์ตาราง...</p>
            ) : (
              aiAnalysis && (
                <>
                  <p className="mt-1 font-body text-sm text-ink">
                    {aiAnalysis.message}{' '}
                    <span className="font-semibold text-eddy-700">(วันนี้ {aiAnalysis.densityLevel})</span>
                  </p>
                  {aiAnalysis.suggestedStart && aiAnalysis.suggestedEnd && (
                    <button
                      type="button"
                      onClick={applyAiSuggestedTime}
                      className="mt-2 rounded-clay-sm bg-eddy-500 px-3 py-1.5 font-display text-xs font-semibold text-white"
                    >
                      ใช้เวลา {aiAnalysis.suggestedStart}-{aiAnalysis.suggestedEnd} แทน
                    </button>
                  )}
                </>
              )
            )}
          </div>
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="ev-location">สถานที่ (ไม่บังคับ)</label>
        <input
          id="ev-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="เช่น ห้อง LAB 301"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="ev-desc">รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
        <textarea
          id="ev-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="บันทึกเพิ่มเติม..."
          rows={3}
          className={inputClass}
        />
      </div>

      {error && (
        <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-sm text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">{error}</p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        {isEditing && onDelete ? (
          <button
            type="button"
            onClick={() => {
              if (initialEvent && confirm('ลบกิจกรรมนี้ใช่ไหม?')) {
                onDelete(initialEvent.id);
                onClose();
              }
            }}
            className="flex items-center gap-1 rounded-clay-sm px-3 py-2 font-display text-sm font-semibold text-eddy-700 dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark hover:bg-pastel-pink/40"
          >
            <Trash2 size={16} /> ลบกิจกรรม
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit">{isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มกิจกรรม'}</Button>
        </div>
      </div>
    </form>
  );
}
