/**
 * lib/aiMock.ts
 * --------------------------------------------------------------
 * ฟังก์ชัน "แสร้งทำเป็น AI" สำหรับฟีเจอร์ในหน้าปฏิทัน ใช้ logic ธรรมดา (ไม่เรียก Gemini จริง)
 * เพื่อให้สร้าง UX ได้ก่อนระหว่างที่ยังไม่พร้อมต่อ Gemini API จริง
 *
 * เมื่อพร้อมต่อจริง ให้แทนที่ฟังก์ชันด้านล่างด้วยการเรียก askEddy() จาก lib/gemini.ts
 * (ส่ง prompt ที่มีบริบทเดียวกัน เช่น รายการกิจกรรมในวันนั้น แล้วให้ Gemini ตอบเป็นภาษาธรรมดาหรือ JSON)
 * --------------------------------------------------------------
 */

import type { CalendarCategory, CalendarEvent } from './types';
import type { BurnoutRisk } from './burnoutRisk';

// ---------- ตัวช่วยแปลงเวลา "HH:mm" <-> นาที ----------
function timeToMinutes(t?: string): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
// เวลาจบน้อยกว่าเวลาเริ่ม = ข้ามเที่ยงคืน (เช่น 23:00-01:00) ให้บวก 24 ชม. แทนที่จะปล่อยเป็นค่าลบ
// (ค่าลบทำให้ duration ของกิจกรรมใหม่โดนปัดลงเหลือ 15 นาทีเสมอ และกิจกรรมเดิมได้ช่วงเวลากลับหัว
// ซึ่งหลุดจากการตรวจจับเวลาชนกันไปเลย)
function wrapDuration(startMin: number, endMin: number): number {
  const d = endMin - startMin;
  return d < 0 ? d + 24 * 60 : d;
}

// ---------- 1) เช็คเวลาชนกัน + แนะนำเวลาใหม่ ----------
export interface ConflictResult {
  conflictsWith: CalendarEvent;
  suggestedStart: string;
  suggestedEnd: string;
}

const DAY_START = 7 * 60; // 07:00
const DAY_END = 22 * 60; // 22:00
const DEFAULT_DURATION = 60; // ถ้าไม่ได้ระบุเวลาจบ ให้ถือว่ากิจกรรมยาว 1 ชม.

/**
 * เช็คว่ากิจกรรมใหม่ (newStart-newEnd) ชนกับกิจกรรมอื่นในวันเดียวกันไหม
 * ถ้าชน จะหาช่วงเวลาว่างที่ใกล้ที่สุดมาแนะนำ
 */
export function checkScheduleConflict(
  newStart: string,
  newEnd: string | undefined,
  sameDayEvents: CalendarEvent[],
  excludeEventId?: string
): ConflictResult | null {
  const start = timeToMinutes(newStart);
  if (start === null) return null;
  const rawNewEnd = newEnd ? timeToMinutes(newEnd) : null;
  const duration = rawNewEnd !== null ? wrapDuration(start, rawNewEnd) : DEFAULT_DURATION;
  const end = start + Math.max(duration, 15);

  const others = sameDayEvents.filter((e) => e.id !== excludeEventId && e.startTime);
  const busy = others
    .map((e) => {
      const s = timeToMinutes(e.startTime)!;
      const rawEnd = e.endTime ? timeToMinutes(e.endTime) : null;
      const d = rawEnd !== null ? wrapDuration(s, rawEnd) : DEFAULT_DURATION;
      return { event: e, start: s, end: s + d };
    })
    .sort((a, b) => a.start - b.start);

  const collision = busy.find((b) => start < b.end && end > b.start);
  if (!collision) return null;

  // หาช่องว่างถัดไปที่พอสำหรับ duration นี้
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  let cursor = DAY_START;
  let suggestedStart: number | null = null;
  for (const b of sorted) {
    if (b.start - cursor >= duration) {
      suggestedStart = cursor;
      break;
    }
    cursor = Math.max(cursor, b.end);
  }
  if (suggestedStart === null && DAY_END - cursor >= duration) {
    suggestedStart = cursor;
  }
  if (suggestedStart === null) {
    // วันนี้แน่นทั้งวัน - แนะนำช่วงเย็นสุดที่เหลือเป็น fallback
    suggestedStart = DAY_END - duration;
  }

  return {
    conflictsWith: collision.event,
    suggestedStart: minutesToTime(suggestedStart),
    suggestedEnd: minutesToTime(suggestedStart + duration),
  };
}

// ---------- 2) แนะนำหมวดหมู่อัตโนมัติจากชื่อกิจกรรม ----------
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  เรียน: ['เรียน', 'สอบ', 'การบ้าน', 'ส่งงาน', 'นำเสนอ', 'lab', 'แลป', 'project', 'โปรเจกต์', 'อ่านหนังสือ'],
  งาน: ['ประชุม', 'งาน', 'ลูกค้า', 'meeting', 'project', 'ทีม', 'ส่งงาน'],
  ออกกำลังกาย: ['ออกกำลังกาย', 'วิ่ง', 'ฟิตเนส', 'โยคะ', 'ยิม', 'gym', 'ปั่นจักรยาน'],
  ส่วนตัว: ['หมอ', 'ทันตแพทย์', 'นัด', 'ธนาคาร', 'ครอบครัว', 'เพื่อน'],
};

export function suggestCategoryId(title: string, categories: CalendarCategory[]): string | null {
  const lower = title.toLowerCase();
  for (const [keywordGroup, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) {
      const match = categories.find((c) => c.name.includes(keywordGroup));
      if (match) return match.id;
    }
  }
  return null;
}

// ---------- 3) แปลงข้อความภาษาธรรมดาเป็นกิจกรรม (แบบ rule-based ง่ายๆ) ----------
export interface ParsedEventDraft {
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
}

const THAI_WEEKDAYS: Record<string, number> = {
  อาทิตย์: 0,
  จันทร์: 1,
  อังคาร: 2,
  พุธ: 3,
  พฤหัสบดี: 4,
  พฤหัส: 4,
  ศุกร์: 5,
  เสาร์: 6,
};

const TIME_WORD_MAP: Record<string, string> = {
  เช้า: '08:00',
  สาย: '10:00',
  เที่ยง: '12:00',
  บ่ายโมง: '13:00',
  บ่ายสอง: '14:00',
  บ่ายสาม: '15:00',
  บ่ายสี่: '16:00',
  บ่าย: '13:00',
  เย็น: '17:00',
  ค่ำ: '19:00',
  ดึก: '22:00',
};

function findDate(text: string): { date: Date; matched: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (text.includes('พรุ่งนี้')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return { date: d, matched: 'พรุ่งนี้' };
  }
  if (text.includes('มะรืนนี้')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return { date: d, matched: 'มะรืนนี้' };
  }
  if (text.includes('วันนี้')) {
    return { date: today, matched: 'วันนี้' };
  }

  for (const [name, weekday] of Object.entries(THAI_WEEKDAYS)) {
    const idx = text.indexOf(name);
    if (idx === -1) continue;
    const hasNextWeekWord = text.slice(idx, idx + name.length + 5).includes('หน้า');
    const hasDayPrefix = text.slice(Math.max(0, idx - 3), idx) === 'วัน';
    const d = new Date(today);
    const diff = (weekday - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff)); // ถ้าตรงกับวันนี้พอดี ให้หมายถึงสัปดาห์หน้า
    if (hasNextWeekWord) d.setDate(d.getDate() + 7);
    const matched = `${hasDayPrefix ? 'วัน' : ''}${name}${hasNextWeekWord ? 'หน้า' : ''}`;
    return { date: d, matched };
  }
  return null;
}

function findTime(text: string): { time: string; matched: string } | null {
  const explicit = text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (explicit) {
    const h = explicit[1].padStart(2, '0');
    return { time: `${h}:${explicit[2]}`, matched: explicit[0] };
  }
  // เรียงจากคำยาวไปสั้น เพื่อให้ "บ่ายสาม" แมตช์ก่อน "บ่าย"
  const words = Object.keys(TIME_WORD_MAP).sort((a, b) => b.length - a.length);
  for (const w of words) {
    if (text.includes(w)) {
      return { time: TIME_WORD_MAP[w], matched: w };
    }
  }
  return null;
}

/**
 * พยายามอ่านข้อความที่ผู้ใช้พิมพ์ในแชท เช่น "นัดหมอฟันพุธหน้าบ่ายสาม"
 * แล้วแยกเป็น ชื่อกิจกรรม / วันที่ / เวลา
 * คืนค่า null ถ้าไม่เจอวันที่หรือเวลาเลย (แปลว่าไม่ใช่ข้อความตั้งกิจกรรม)
 */
export function parseEventFromText(text: string): ParsedEventDraft | null {
  const dateMatch = findDate(text);
  const timeMatch = findTime(text);

  // "วันนี้" เพียงคำเดียวเป็นสัญญาณที่อ่อนเกินไป (พบได้บ่อยในแชทพูดคุยทั่วไปที่ไม่ได้ตั้งใจสร้างกิจกรรม)
  // จึงต้องมีเวลาประกบด้วย ถ้าไม่มีเวลาเลยและวันที่ที่เจอมีแค่ "วันนี้" ให้ถือว่าไม่ใช่ข้อความตั้งกิจกรรม
  const hasStrongDateSignal = dateMatch && dateMatch.matched !== 'วันนี้';
  if (!timeMatch && !hasStrongDateSignal) return null;

  let title = text;
  if (dateMatch) title = title.replace(dateMatch.matched, '');
  if (timeMatch) title = title.replace(timeMatch.matched, '');
  title = title.replace(/\s+/g, ' ').trim();
  if (!title) title = 'กิจกรรมใหม่';

  const baseDate = dateMatch?.date ?? new Date();
  const yyyy = baseDate.getFullYear();
  const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
  const dd = String(baseDate.getDate()).padStart(2, '0');

  return {
    title,
    date: `${yyyy}-${mm}-${dd}`,
    startTime: timeMatch?.time,
  };
}

// ---------- 4) สรุปภาพรวมสัปดาห์ ----------
export function buildWeeklySummary(
  weekEvents: CalendarEvent[],
  categories: CalendarCategory[]
): string {
  if (weekEvents.length === 0) {
    return 'สัปดาห์นี้ยังไม่มีกิจกรรมเลย ว่างมากๆ เลยนะ ลองวางแผนอะไรเพิ่มไหม?';
  }

  const countByDate: Record<string, number> = {};
  const countByCategory: Record<string, number> = {};
  for (const ev of weekEvents) {
    countByDate[ev.date] = (countByDate[ev.date] ?? 0) + 1;
    countByCategory[ev.categoryId] = (countByCategory[ev.categoryId] ?? 0) + 1;
  }

  const busiestDate = Object.entries(countByDate).sort((a, b) => b[1] - a[1])[0];
  const topCategoryId = Object.entries(countByCategory).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topCategory = categories.find((c) => c.id === topCategoryId);

  const busiestLabel = busiestDate
    ? new Date(busiestDate[0]).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    `สัปดาห์นี้มีกิจกรรมทั้งหมด ${weekEvents.length} รายการ ` +
    (busiestDate ? `วันที่แน่นที่สุดคือ${busiestLabel} (${busiestDate[1]} รายการ) ` : '') +
    (topCategory ? `ส่วนใหญ่เป็นหมวด "${topCategory.name}" ลองจัดเวลาพักผ่อนสลับด้วยนะ` : '')
  );
}

// ---------- 5) วิเคราะห์ภาระงาน/ความเสี่ยงหมดไฟ (แดชบอร์ดส่วนตัว) ----------
/** ใช้แทนตอน generateWorkloadInsight (lib/gemini.ts) เรียกไม่สำเร็จ/ไม่มี API key */
export function buildWorkloadInsight(risk: BurnoutRisk): string {
  // ไม่มีภาระอะไรเลย - ให้ข้อความที่ต่างจากระดับ "เบา" ทั่วไป จะได้ไม่ฟังดูเหมือนมีงานอยู่บ้าง
  if (risk.avgUtilizationPct === 0 && risk.overloadDays === 0 && risk.overdueCount === 0 && risk.urgentPileupCount === 0) {
    return 'ตอนนี้ยังไม่มีภาระอะไรเลยในสัปดาห์นี้ พักผ่อนได้เต็มที่ หรือจะเริ่มวางแผนอะไรใหม่ก็ได้นะ';
  }

  if (risk.band === 'low') {
    return `สัปดาห์นี้ภาระงานยังอยู่ในระดับที่ไหว (เฉลี่ยจองเวลาไว้ ${Math.round(risk.avgUtilizationPct)}%) รักษาจังหวะนี้ไว้ได้เลย`;
  }
  if (risk.band === 'medium') {
    return (
      `สัปดาห์นี้เริ่มแน่นแล้ว (เฉลี่ยจองเวลาไว้ ${Math.round(risk.avgUtilizationPct)}%` +
      (risk.overdueCount > 0 ? `, มีงานเลยกำหนด ${risk.overdueCount} ชิ้น` : '') +
      `) ลองเลื่อนงานที่ไม่เร่งด่วนออกไปบ้างนะ`
    );
  }
  return (
    `ตอนนี้ภาระงานหนักเกินตัวแล้ว (เฉลี่ยจองเวลาไว้ ${Math.round(risk.avgUtilizationPct)}% และมีวันที่งานล้นถึง ${risk.overloadDays} วัน)` +
    (risk.overdueCount > 0 ? ` มีงานเลยกำหนดสะสม ${risk.overdueCount} ชิ้นด้วย` : '') +
    ` ลองจัดลำดับความสำคัญใหม่และพักบ้างนะ ก่อนจะหมดไฟ`
  );
}
