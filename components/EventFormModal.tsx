'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Sparkles, Check, CalendarRange } from 'lucide-react';
import Button from './Button';
import EddyMascot from './EddyMascot';
import TimePicker from './TimePicker';
import DateRangePicker from './DateRangePicker';
import Switch from './Switch';
import ConfirmDialog from './ConfirmDialog';
import { getColorOption } from '@/lib/colors';
import { eventDateRangeISO, isEventOnDateISO } from '@/lib/calendarLayout';
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
  // กิจกรรมหลายวันติดกัน (ไม่บังคับ) - ช่วงเวลาเดียวกันซ้ำทุกวันตั้งแต่ date ถึง endDate
  const [isMultiDay, setIsMultiDay] = useState(Boolean(seed?.endDate && seed.endDate !== seed?.date));
  const [endDate, setEndDate] = useState(seed?.endDate ?? seed?.date ?? defaultDate ?? '');
  const [startTime, setStartTime] = useState(seed?.startTime ?? '');
  const [endTime, setEndTime] = useState(seed?.endTime ?? '');
  const [location, setLocation] = useState(seed?.location ?? '');
  const [description, setDescription] = useState(seed?.description ?? '');
  const [error, setError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // ถ้าเปิด modal ก่อนที่ categories จะโหลดเสร็จ (เช่น จาก quick-add ในแชท) categoryId จะ init เป็น ''
  // เพราะตอน mount ครั้งแรก categories ยังว่างอยู่ - พอ categories โหลดเสร็จทีหลัง ให้ตั้งค่าเริ่มต้นให้ใหม่
  // (เฉพาะตอนที่ยังไม่มีการเลือกอะไรเลยเท่านั้น ไม่ทับค่าที่ผู้ใช้เลือกเองแล้ว)
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  // วันสิ้นสุดต้องไม่ก่อนวันเริ่มเสมอ - ขยับตามวันเริ่มถ้าพิมพ์วันเริ่มใหม่จนวันสิ้นสุดเดิมย้อนหลังไป
  useEffect(() => {
    setEndDate((prev) => (!prev || prev < date ? date : prev));
  }, [date]);

  const effectiveEndDate = isMultiDay && endDate > date ? endDate : undefined;

  // เฟส 2 (mock AI): เช็คเวลาชนกัน - กิจกรรมหลายวันต้องเช็คช่วงเวลาเดียวกันนี้ทุกวันในช่วง ไม่ใช่แค่วันเริ่ม
  const [conflict, setConflict] = useState<ConflictResult | null>(null);
  useEffect(() => {
    if (!date || !startTime) {
      setConflict(null);
      return;
    }
    const days = effectiveEndDate ? eventDateRangeISO(date, effectiveEndDate) : [date];
    let found: ConflictResult | null = null;
    for (const d of days) {
      // หมุดกำหนดส่งมีระยะเวลา 0 นาที ไม่ใช่เวลาที่ถูกจอง ไม่ต้องเอามาเช็คว่าชนกัน
      const sameDay = allEvents.filter((e) => e.id !== initialEvent?.id && !e.isDeadline && isEventOnDateISO(e, d));
      found = checkScheduleConflict(startTime, endTime || undefined, sameDay, initialEvent?.id);
      if (found) break;
    }
    setConflict(found);
  }, [date, effectiveEndDate, startTime, endTime, allEvents, initialEvent?.id]);

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
    if (isMultiDay && endDate < date) return setError('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');

    const event: CalendarEvent = {
      id: initialEvent?.id ?? crypto.randomUUID(),
      title: title.trim(),
      categoryId,
      date,
      endDate: effectiveEndDate,
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
                    {active ? (
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-white text-eddy-600">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-ink-muted" />
                    )}
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

      <div
        className={`flex items-center justify-between gap-3 rounded-clay-sm border px-4 py-3 transition-colors ${
          isMultiDay ? 'border-eddy-200 bg-eddy-50' : 'border-eddy-100 bg-surface'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white transition-colors ${
              isMultiDay ? 'bg-gradient-to-br from-eddy-500 to-accent-500' : 'bg-eddy-300'
            }`}
          >
            <CalendarRange size={17} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-ink">กิจกรรมหลายวันติดกัน</p>
            <p className="truncate font-body text-xs text-ink-muted">เช่น ค่าย ทริป ช่วงเวลาเดียวกันซ้ำทุกวัน</p>
          </div>
        </div>
        <Switch checked={isMultiDay} onChange={setIsMultiDay} aria-label="กิจกรรมหลายวันติดกัน" />
      </div>

      {/* โหมดวันเดียว (ปกติ) - เส้นเดิมไม่เปลี่ยน */}
      {!isMultiDay && (
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
      )}

      {/* โหมดหลายวัน - แยกออกมาเป็นแผงของตัวเอง (กรอบ+พื้นหลังไล่สี+เงาแยกจากฟอร์มรอบข้าง)
          แทนที่จะโผล่เป็นแถวเพิ่มเฉยๆ ให้ความรู้สึกเหมือน "เปิดช่องตั้งค่าเฉพาะ" ขึ้นมาจริงๆ
          เข้าจอด้วยการพลิก (rotateX) แกว่งไปมาก่อนตกไปนิ่งที่ 0 องศา (หน้าตรง) พอดี - ไม่ใช่แค่ fade/scale เฉยๆ
          transformPerspective ใส่ตรงนี้เลย (ไม่ต้องมี div ครอบ) ให้การพลิกเห็นเป็น 3 มิติจริง */}
      <AnimatePresence initial={false}>
        {isMultiDay && (
          <motion.div
            key="multi-day-panel"
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{ transformOrigin: 'top center' }}
            className="relative overflow-hidden rounded-clay-lg border border-eddy-200 bg-gradient-to-br from-eddy-50 via-surface to-pastel-lilac/30 p-4 shadow-clay-sm sm:p-5"
          >
            {/* แสงเรืองประดับมุม - ให้แผงนี้ดูมีมิติแยกจากพื้นหลังฟอร์มรอบๆ */}
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-eddy-300/25 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-pastel-lilac-dark/20 blur-2xl" />

            <div className="relative flex flex-col gap-4">
              <div>
                <label className={labelClass} htmlFor="ev-date-range">ช่วงวันที่</label>
                <DateRangePicker
                  id="ev-date-range"
                  startDate={date}
                  endDate={endDate}
                  onChange={(s, e) => {
                    setDate(s);
                    setEndDate(e);
                  }}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="ev-start">เวลาเริ่ม (ซ้ำทุกวัน)</label>
                  <TimePicker id="ev-start" value={startTime} onChange={setStartTime} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="ev-end">เวลาจบ (ซ้ำทุกวัน)</label>
                  <TimePicker id="ev-end" value={endTime} onChange={setEndTime} />
                </div>
              </div>

              {/* สรุปสดๆ ว่ากำลังตั้งค่าอะไรอยู่ - อัปเดตทันทีตามที่กรอก เป็นรางวัลเล็กๆ ให้รู้ว่ากรอกถูก */}
              <AnimatePresence mode="wait">
                {effectiveEndDate ? (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    className="flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 shadow-clay-sm"
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-eddy-500 to-accent-500 text-white">
                      <CalendarRange size={12} />
                    </span>
                    <p className="font-body text-xs font-medium text-ink">
                      รวม <span className="font-display font-bold text-eddy-700">{eventDateRangeISO(date, effectiveEndDate).length} วัน</span>
                      {startTime && (
                        <>
                          {' '}· ซ้ำเวลา <span className="font-display font-bold text-eddy-700">{startTime}{endTime ? `-${endTime}` : ''}</span> ทุกวัน
                        </>
                      )}
                    </p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-body text-xs text-ink-muted"
                  >
                    เลือกวันที่สิ้นสุดให้หลังวันที่เริ่ม เพื่อดูสรุปช่วงเวลา
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            onClick={() => setDeleteConfirmOpen(true)}
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

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="ลบกิจกรรมนี้?"
        message={`"${initialEvent?.title ?? ''}" จะถูกลบถาวร เอากลับไม่ได้`}
        confirmLabel="ลบเลย"
        onConfirm={() => {
          if (initialEvent && onDelete) {
            onDelete(initialEvent.id);
            onClose();
          }
        }}
        onClose={() => setDeleteConfirmOpen(false)}
      />
    </form>
  );
}
