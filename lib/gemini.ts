/**
 * lib/gemini.ts
 * --------------------------------------------------------------
 * ตัวช่วยสำหรับเรียก Gemini API (Google AI) เพื่อให้ Eddy วิเคราะห์/ตอบคำถามจริง
 * ทุกฟังก์ชันคืนค่า null เมื่อไม่มี GEMINI_API_KEY หรือเรียก API ไม่สำเร็จ
 * (ให้ผู้เรียกใช้ fallback ไปที่ lib/aiMock.ts แทน ไม่ให้แอปพังเพราะ AI ล่ม)
 * --------------------------------------------------------------
 */
import type { CalendarCategory, CalendarEvent } from './types';
import { ROLE_AI_CONTEXT, isUserRole } from './roles';
import type { BurnoutBandKey, BurnoutSignals } from './burnoutRisk';

// ใช้ alias "-latest" แทนเวอร์ชันวันที่ตายตัว เพื่อไม่ให้ค้างรุ่นเก่าที่ถูกเลิกใช้ (เช่น gemini-1.5-flash ที่ถูกปลดระวางไปแล้ว)
// ใช้รุ่น "flash-lite" เพราะงานในแอปนี้ (แชท/แยกข้อความ/วิเคราะห์ตาราง) ไม่ต้องการ "คิดนาน" แบบรุ่น flash เต็ม
// ซึ่งพบว่าตอบช้ากว่ามาก (~30 วินาที เทียบกับ ~1 วินาทีของ flash-lite) เพราะเป็นโมเดลที่ "คิดก่อนตอบ" โดย default
const GEMINI_MODEL = 'gemini-flash-lite-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EDDY_SYSTEM_PROMPT = `
คุณคือ "Eddy" ผู้ช่วย AI ที่เป็นมิตร พูดสุภาพ ให้กำลังใจ และช่วยผู้ใช้จัดตารางชีวิตประจำวัน
งาน และสิ่งที่ต้องทำ ตอบให้กระชับ เป็นกันเอง และเป็นภาษาไทยเสมอ
`;

interface AskEddyParams {
  message: string;
  /** ใส่ข้อมูล task/event ปัจจุบันของผู้ใช้ เพื่อให้ Eddy ตอบได้ตรงบริบทมากขึ้น */
  context?: string;
}

export async function askEddy({ message, context }: AskEddyParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // ยังไม่ตั้งค่า API key - ส่ง mock กลับไปก่อน เพื่อให้ UI ทำงานต่อได้
    return 'ตอนนี้ยังไม่ได้เชื่อมต่อ Gemini API นะ (ยังไม่มี GEMINI_API_KEY ใน .env.local) ลองตั้งค่าแล้วลองใหม่ดูได้เลย!';
  }

  const prompt = `${EDDY_SYSTEM_PROMPT}\n\n${context ? `บริบทปัจจุบันของผู้ใช้:\n${context}\n\n` : ''}ผู้ใช้พิมพ์ว่า: "${message}"`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  return reply ?? 'ขออภัย ผมตอบคำถามนี้ไม่ได้ในขณะนี้';
}

// --------------------------------------------------------------
// ตัวช่วยเรียก Gemini แบบขอผลลัพธ์เป็น JSON ตาม schema ที่กำหนด (structured output)
// คืนค่า null ถ้าไม่มี key หรือ parse ไม่สำเร็จ - ให้ผู้เรียก fallback เอง
// --------------------------------------------------------------
async function callGeminiJSON<T>(prompt: string, schema: object): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ---------- 1) แปลงข้อความแชทเป็นกิจกรรม/สิ่งที่ต้องทำ ----------
export interface ParsedMessageIntent {
  intent: 'event' | 'task' | 'none';
  title: string;
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  categoryId?: string;
}

const PARSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: { type: 'STRING', enum: ['event', 'task', 'none'] },
    title: { type: 'STRING' },
    date: { type: 'STRING', nullable: true },
    startTime: { type: 'STRING', nullable: true },
    categoryId: { type: 'STRING', nullable: true },
  },
  required: ['intent', 'title'],
};

interface ParseMessageParams {
  message: string;
  todayISO: string; // YYYY-MM-DD ของวันนี้ ใช้คำนวณ "พรุ่งนี้" "วันศุกร์หน้า" ฯลฯ
  categories: CalendarCategory[];
}

export async function parseMessageToEvent({
  message,
  todayISO,
  categories,
}: ParseMessageParams): Promise<ParsedMessageIntent | null> {
  const catList = categories.map((c) => `- ${c.id}: ${c.name}`).join('\n') || '(ผู้ใช้ยังไม่มีหมวดหมู่)';
  const prompt = `
วันนี้คือวันที่ ${todayISO} (รูปแบบ YYYY-MM-DD)
รายชื่อหมวดหมู่ปฏิทินของผู้ใช้ (ใช้ id ที่ให้มาเท่านั้นถ้าจะระบุ categoryId):
${catList}

วิเคราะห์ข้อความต่อไปนี้ที่ผู้ใช้พิมพ์ในแชท แล้วบอกว่า:
- ถ้าข้อความนี้พูดถึงกิจกรรมที่มีวัน/เวลาชัดเจน (เช่น นัดหมาย, ประชุม, ไปหาหมอ) ให้ intent = "event"
- ถ้าเป็นสิ่งที่ต้องทำแต่ไม่ได้ระบุเวลาตายตัว (เช่น งานที่ต้องทำ, task ทั่วไป) ให้ intent = "task"
- ถ้าข้อความนี้เป็นแค่การพูดคุยทั่วไป ไม่ได้ต้องการสร้างกิจกรรม/สิ่งที่ต้องทำ ให้ intent = "none"

ถ้า intent เป็น "event" หรือ "task" ให้ระบุ title (ชื่อกิจกรรม/งาน แบบสั้นกระชับ ตัดคำวันเวลาออก)
ถ้ามีการระบุวันที่ ให้แปลงเป็น date แบบ YYYY-MM-DD (คำนวณจากวันนี้ที่ให้ไว้)
ถ้ามีการระบุเวลา ให้แปลงเป็น startTime แบบ HH:mm (24 ชั่วโมง)
ถ้าพอเดาได้ว่าควรอยู่หมวดหมู่ไหนจากรายชื่อหมวดหมู่ข้างบน ให้ใส่ categoryId เป็น id นั้น ไม่งั้นเว้นว่างไว้

ข้อความ: "${message}"
`.trim();

  const result = await callGeminiJSON<ParsedMessageIntent>(prompt, PARSE_SCHEMA);
  // เช็คว่า field ที่จำเป็นไม่ใช่แค่ผ่าน schema แต่ต้องมีเนื้อหาจริงด้วย ไม่งั้น caller จะไม่ fallback ไป local
  if (!result || !result.intent || !result.title.trim()) return null;
  return result;
}

// ---------- 2) วิเคราะห์ตารางตอนเพิ่ม/แก้ไขกิจกรรม ----------
export interface ScheduleAnalysis {
  hasConflict: boolean;
  densityLevel: 'ว่าง' | 'ปกติ' | 'ค่อนข้างแน่น' | 'แน่นมาก';
  message: string;
  suggestedStart?: string;
  suggestedEnd?: string;
}

const ANALYZE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    hasConflict: { type: 'BOOLEAN' },
    densityLevel: { type: 'STRING', enum: ['ว่าง', 'ปกติ', 'ค่อนข้างแน่น', 'แน่นมาก'] },
    message: { type: 'STRING' },
    suggestedStart: { type: 'STRING', nullable: true },
    suggestedEnd: { type: 'STRING', nullable: true },
  },
  required: ['hasConflict', 'densityLevel', 'message'],
};

// สร้างบริบทเกี่ยวกับตัวผู้ใช้ (นิสัย + เวลาที่สะดวก) ให้ AI เอาไปปรับคำแนะนำให้เข้ากับแต่ละคน
export function buildUserProfileContext(user: {
  role?: string | null;
  bio?: string | null;
  dayStart?: string | null;
  dayEnd?: string | null;
  timezone?: string | null;
}): string {
  return [
    isUserRole(user.role) ? ROLE_AI_CONTEXT[user.role] : '',
    user.bio ? `นิสัย/ตัวตนของผู้ใช้: ${user.bio}` : '',
    user.dayStart || user.dayEnd
      ? `ช่วงเวลาที่ผู้ใช้สะดวกทำงาน: ${user.dayStart || '—'}-${user.dayEnd || '—'} น. (${user.timezone || 'Asia/Bangkok'})`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

interface AnalyzeEventParams {
  newEvent: { title: string; date: string; startTime?: string; endTime?: string; categoryName?: string };
  sameDayEvents: CalendarEvent[];
  categories: CalendarCategory[];
  /** บริบทผู้ใช้ (นิสัย+เวลาว่าง) จาก buildUserProfileContext */
  userProfile?: string;
}

export async function analyzeEventSchedule({
  newEvent,
  sameDayEvents,
  categories,
  userProfile,
}: AnalyzeEventParams): Promise<ScheduleAnalysis | null> {
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'ไม่ระบุหมวดหมู่';
  const existingList =
    sameDayEvents
      .map((e) => `- ${e.title} (${e.startTime ?? '?'}${e.endTime ? `-${e.endTime}` : ''}, หมวด ${categoryName(e.categoryId)})`)
      .join('\n') || '(วันนี้ยังไม่มีกิจกรรมอื่น)';

  const prompt = `
คุณคือผู้ช่วยวิเคราะห์ตารางเวลาสำหรับแอปปฏิทิน Eddy
ผู้ใช้กำลังจะเพิ่มกิจกรรมนี้:
- ชื่อ: ${newEvent.title}
- วันที่: ${newEvent.date}
- เวลา: ${newEvent.startTime ?? 'ไม่ระบุ'}${newEvent.endTime ? `-${newEvent.endTime}` : ''}
- หมวดหมู่: ${newEvent.categoryName ?? 'ไม่ระบุ'}

กิจกรรมอื่นที่มีอยู่แล้วในวันเดียวกัน:
${existingList}
${userProfile ? `\nเกี่ยวกับผู้ใช้ (ใช้ช่วยปรับคำแนะนำและเวลาที่แนะนำให้เข้ากับนิสัย/ช่วงเวลาที่เขาสะดวก):\n${userProfile}\n` : ''}
วิเคราะห์และตอบเป็น:
- hasConflict: ช่วงเวลาของกิจกรรมใหม่ชนกับกิจกรรมอื่นในวันเดียวกันหรือไม่ (ประมาณเวลาให้สมเหตุสมผลถ้าไม่ระบุเวลาจบ ให้ถือว่ายาว 1 ชั่วโมง)
- densityLevel: ประเมินความหนาแน่นของวันนี้โดยรวม (นับกิจกรรมทั้งหมดรวมกิจกรรมใหม่) เลือกจาก "ว่าง" "ปกติ" "ค่อนข้างแน่น" "แน่นมาก"
- message: คำแนะนำสั้นๆ เป็นภาษาไทย เป็นกันเอง อาจพูดถึงเวลาชนกัน หรือวันนี้แน่นแค่ไหน หรือให้กำลังใจถ้าตารางโอเค
- suggestedStart/suggestedEnd: ถ้ามีเวลาชนกัน ให้แนะนำช่วงเวลาว่างที่ใกล้เคียงและเหมาะสม (รูปแบบ HH:mm) ไม่งั้นเว้นว่างไว้
`.trim();

  const result = await callGeminiJSON<ScheduleAnalysis>(prompt, ANALYZE_SCHEMA);
  if (!result || !result.densityLevel || !result.message.trim()) return null;
  return result;
}

// ---------- 3) สรุปภาพรวมสัปดาห์ด้วย AI ----------
interface WeeklySummaryParams {
  weekEvents: CalendarEvent[];
  categories: CalendarCategory[];
  /** บริบทผู้ใช้ (นิสัย+เวลาว่าง) จาก buildUserProfileContext */
  userProfile?: string;
}

export async function generateWeeklySummary({ weekEvents, categories, userProfile }: WeeklySummaryParams): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'ไม่ระบุหมวดหมู่';
  const list =
    weekEvents
      .map((e) => `- ${e.date} ${e.startTime ?? ''} ${e.title} (${categoryName(e.categoryId)})`)
      .join('\n') || '(สัปดาห์นี้ไม่มีกิจกรรมเลย)';

  const prompt = `${EDDY_SYSTEM_PROMPT}

นี่คือรายการกิจกรรมทั้งหมดของผู้ใช้ในสัปดาห์นี้:
${list}
${userProfile ? `\nเกี่ยวกับผู้ใช้ (ใช้ช่วยให้คำแนะนำเข้ากับเขา):\n${userProfile}\n` : ''}
เขียนสรุปภาพรวมสัปดาห์นี้แบบสั้นๆ 1-2 ประโยค เป็นภาษาไทย เป็นกันเอง พูดถึงว่าสัปดาห์นี้มีกิจกรรมมากน้อยแค่ไหน
วันไหนแน่นที่สุด หรือหมวดหมู่ไหนเยอะที่สุด แล้วให้คำแนะนำหรือให้กำลังใจสั้นๆ (ปรับให้เข้ากับนิสัย/เวลาที่เขาสะดวกถ้ามีข้อมูล) ท้ายประโยค`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ?? null;
}

// ---------- 3b) วิเคราะห์ภาระงาน/ความเสี่ยงหมดไฟด้วย AI (แดชบอร์ดส่วนตัว) ----------
interface WorkloadInsightParams {
  signals: BurnoutSignals;
  band: BurnoutBandKey;
  /** บริบทผู้ใช้ (นิสัย+เวลาว่าง) จาก buildUserProfileContext */
  userProfile?: string;
}

const BURNOUT_BAND_TEXT: Record<BurnoutBandKey, string> = { low: 'เบา', medium: 'ปานกลาง', high: 'หนัก' };

/**
 * ส่งแค่ "ตัวเลขสรุป" ให้ Gemini ไม่ส่งรายการงาน/กิจกรรมจริงไป (ไม่จำเป็นต้องรู้รายละเอียด
 * แค่ตัวเลขก็เพียงพอให้วิเคราะห์และให้คำแนะนำได้แล้ว เป็นการลดข้อมูลที่ส่งออกไปโดยไม่จำเป็น)
 */
export async function generateWorkloadInsight({ signals, band, userProfile }: WorkloadInsightParams): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `${EDDY_SYSTEM_PROMPT}

นี่คือสรุปภาระงานของผู้ใช้ใน 7 วันข้างหน้า (คำนวณจากปฏิทิน+สิ่งที่ต้องทำแล้ว ไม่ต้องคำนวณเอง):
- เวลาที่ถูกจองไว้แล้วเฉลี่ยต่อวัน: ${Math.round(signals.avgUtilizationPct)}% ของเวลาที่มี
- จำนวนวันที่งานแน่นเกินเวลาที่มีจริง (overload): ${signals.overloadDays} วัน จาก 7 วัน
- งานที่เลยกำหนดส่งไปแล้ว: ${signals.overdueCount} งาน
- งานสำคัญที่ใกล้ครบกำหนด (ภายใน 3 วัน): ${signals.urgentPileupCount} งาน
- ระดับความเสี่ยงหมดไฟที่คำนวณได้: ${BURNOUT_BAND_TEXT[band]}
${userProfile ? `\nเกี่ยวกับผู้ใช้ (ใช้ช่วยให้คำแนะนำเข้ากับเขา):\n${userProfile}\n` : ''}
เขียนความเห็นสั้นๆ 1-2 ประโยค เป็นภาษาไทย เป็นกันเอง บอกตรงๆ ว่าตอนนี้รับงานเกินตัวหรือไม่และหนักแค่ไหน
แล้วให้คำแนะนำที่ทำได้จริงสั้นๆ ท้ายประโยค (เช่น เลื่อนงานไม่เร่งด่วนออกไป พักบ้าง หรือถ้าตารางโอเคก็ให้กำลังใจ)`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ?? null;
}

// ---------- 4) แตกงานใหญ่เป็นรายการย่อยอัตโนมัติ ----------
// คืนทั้งชื่อขั้นตอนและ "ประมาณว่าใช้เวลากี่นาที"
// เวลาที่ได้ตรงนี้ยังไม่ใช่วันเวลาจริง — ตัวจัดวันจริงคือ lib/subtaskPlan.ts ที่คำนวณ local
// จากช่องว่างในปฏิทินจริง (หลักเดียวกับที่อื่นในโปรเจกต์: AI ตัดสิน "เนื้องาน" ส่วน "เมื่อไหร่" คำนวณเอง)
const BREAKDOWN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    subtasks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          estimatedMinutes: { type: 'INTEGER' },
        },
        required: ['title', 'estimatedMinutes'],
      },
    },
  },
  required: ['subtasks'],
};

interface BreakdownTaskParams {
  title: string;
  description?: string;
  /** จำนวนวันตั้งแต่วันเริ่มถึงกำหนดส่ง - ช่วยให้ AI ซอยขั้นตอนให้พอดีกับเวลาที่มี */
  spanDays?: number | null;
  /** เวลารวมที่ผู้ใช้ประเมินไว้สำหรับงานหลัก (ถ้ามี) */
  totalMinutes?: number | null;
  /**
   * ระยะเวลาโฟกัสต่อเนื่องสูงสุดของผู้ใช้ (นาที) จากโปรไฟล์ - ไม่บังคับ
   * ใช้จำกัดเพดานเวลาต่อขั้นตอนแทน MAX_STEP_MINUTES เดิม (ถ้าตั้งค่าไว้และน้อยกว่า)
   * เพราะ Task/Subtask หนึ่งชิ้นลงปฏิทินได้แค่ 1 ช่วงเวลาเดียว (ไม่มีกลไกแบ่งงานเดียวเป็นหลายรอบ
   * ในปฏิทิน) การจำกัดตอนแตกงานเป็นจุดเดียวที่ทำได้จริงโดยไม่ต้องเปลี่ยนโครงสร้างข้อมูล
   */
  maxSessionMinutes?: number | null;
}

export interface BreakdownStep {
  title: string;
  estimatedMinutes: number;
}

const MIN_STEP_MINUTES = 15;
const MAX_STEP_MINUTES = 240;

export async function breakdownTask({
  title,
  description,
  spanDays,
  totalMinutes,
  maxSessionMinutes,
}: BreakdownTaskParams): Promise<BreakdownStep[] | null> {
  // เพดานจริง (บังคับด้วยโค้ด ไม่ใช่แค่ขอ AI เฉยๆ) - ใช้ค่าที่น้อยกว่าระหว่างเพดานเดิมกับที่ผู้ใช้ตั้งไว้
  const stepCap =
    typeof maxSessionMinutes === 'number' && maxSessionMinutes > 0
      ? Math.min(MAX_STEP_MINUTES, maxSessionMinutes)
      : MAX_STEP_MINUTES;

  // บอก AI ว่ามีเวลากี่วัน เพื่อให้ซอยขั้นตอนสมเหตุผล
  // (งานที่มีเวลา 2 วัน ไม่ควรถูกซอยเป็น 6 ขั้นตอนยาวๆ)
  const spanHint =
    typeof spanDays === 'number' && spanDays > 0
      ? `\nผู้ใช้มีเวลาทำงานนี้ทั้งหมด ${spanDays} วัน (นับจากวันเริ่มถึงกำหนดส่ง) ` +
        `ให้ซอยจำนวนขั้นตอนให้เหมาะกับเวลาที่มี - เวลาน้อยให้ขั้นตอนน้อยและสั้นลง`
      : '';
  const totalHint =
    typeof totalMinutes === 'number' && totalMinutes > 0
      ? `\nผู้ใช้ประเมินว่างานนี้ใช้เวลารวมประมาณ ${totalMinutes} นาที ให้ผลรวมของทุกขั้นตอนใกล้เคียงค่านี้`
      : '';
  const focusHint =
    stepCap < MAX_STEP_MINUTES
      ? `\nผู้ใช้โฟกัสงานต่อเนื่องได้ไม่เกิน ${stepCap} นาทีต่อครั้ง ถ้างานยาวกว่านี้ให้ซอยเป็นหลายขั้นตอนแทน`
      : '';

  const prompt = `
งานนี้: "${title}"${description ? `\nรายละเอียดเพิ่มเติม: ${description}` : ''}${spanHint}${totalHint}${focusHint}

ช่วยแตกงานนี้เป็นรายการย่อย (subtask) ที่ทำแล้วนำไปสู่งานหลักสำเร็จ
- ให้แต่ละรายการย่อยสั้นกระชับ เป็นภาษาไทย เริ่มด้วยคำกริยา (เช่น "เขียน...", "ทำ...", "เตรียม...")
- จำนวนรายการย่อยที่เหมาะสมคือ 3-6 รายการ ขึ้นอยู่กับความซับซ้อนของงาน
- เรียงลำดับตามที่ควรทำก่อน-หลัง
- ใส่ estimatedMinutes ของแต่ละขั้นตอนเป็นจำนวนนาทีที่สมจริง (ระหว่าง ${MIN_STEP_MINUTES} ถึง ${stepCap} นาที)
`.trim();

  const result = await callGeminiJSON<{ subtasks: { title: string; estimatedMinutes: number }[] }>(
    prompt,
    BREAKDOWN_SCHEMA,
  );
  if (!result || !Array.isArray(result.subtasks)) return null;

  const cleaned: BreakdownStep[] = result.subtasks
    .map((s) => ({
      title: typeof s?.title === 'string' ? s.title.trim() : '',
      // กันค่าเพี้ยนจาก AI (ติดลบ / ยาวเป็นวัน) ด้วยการหนีบให้อยู่ในกรอบที่วางลงปฏิทินได้จริง
      // (ใช้ stepCap แทน MAX_STEP_MINUTES ตรงๆ - นี่คือจุดที่บังคับจริง ไม่ใช่แค่บอก AI เฉยๆ)
      estimatedMinutes: Math.min(
        stepCap,
        Math.max(MIN_STEP_MINUTES, Number.isFinite(s?.estimatedMinutes) ? Math.round(s.estimatedMinutes) : 30),
      ),
    }))
    .filter((s) => s.title.length > 0);

  return cleaned.length > 0 ? cleaned : null;
}

// ---------- 5) กระจายงานกลุ่มให้สมาชิก (เฟส 3c) ----------
// AI ตัดสินแค่ "ใครควรทำงานไหน" (จากเวลาว่าง + นิสัย) ส่วนการวางเวลาจริงคำนวณ local เพื่อการันตีว่าไม่ชน
const DISTRIBUTE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    assignments: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          taskId: { type: 'STRING' },
          userId: { type: 'STRING' },
        },
        required: ['taskId', 'userId'],
      },
    },
  },
  required: ['assignments'],
};

interface DistributeInput {
  tasks: { id: string; title: string; durationMin: number; dueDate?: string | null }[];
  members: {
    id: string;
    name: string;
    freeMinutes: number;
    /** งานที่มีอยู่แล้วในช่วงเวลานั้น (ปฏิทิน + To-do ค้าง + งานกลุ่มอื่นที่รอยืนยัน) */
    committedMinutes: number;
    /** Workload Score = committed / free (ยิ่งต่ำยิ่งมีที่ว่าง) - คำนวณ local ใน lib/workload.ts */
    workloadScore: number;
    bio?: string | null;
    /** ทักษะ/ความถนัดจากโปรไฟล์ - ใช้จับคู่กับเนื้องานย่อยโดยตรง (คนละเรื่องกับ bio ที่เป็นข้อความอิสระ) */
    skills?: string[] | null;
  }[];
}

export async function distributeGroupTasks(
  input: DistributeInput,
): Promise<{ taskId: string; userId: string }[] | null> {
  const taskList = input.tasks
    .map((t) => `- id=${t.id} | "${t.title}" | ใช้เวลา ~${t.durationMin} นาที${t.dueDate ? ` | ต้องเสร็จก่อน ${t.dueDate}` : ''}`)
    .join('\n');
  const fmtScore = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : 'ไม่เหลือเวลาว่าง');
  const memberList = input.members
    .map((m) => {
      const skillsText = m.skills && m.skills.length > 0 ? ` | ทักษะ: ${m.skills.join(', ')}` : '';
      return (
        `- id=${m.id} | ${m.name} | ว่าง ~${m.freeMinutes} นาที | งานที่มีอยู่แล้ว ~${m.committedMinutes} นาที` +
        ` | ภาระงาน(workload score) ${fmtScore(m.workloadScore)}${skillsText}${m.bio ? ` | นิสัย: ${m.bio}` : ''}`
      );
    })
    .join('\n');

  const prompt = `
คุณคือผู้ช่วยจัดสรรงานให้ทีม ช่วยมอบหมายงานกลุ่มต่อไปนี้ให้สมาชิกแต่ละคน "อย่างเป็นธรรม"

งานที่ต้องกระจาย:
${taskList}

สมาชิกในกลุ่ม:
${memberList}

กติกา:
- มอบหมายให้ครบทุกงาน งานละ 1 คน
- ดู "ทักษะ" ของแต่ละคนเทียบกับเนื้องานย่อยเป็นอันดับแรก - ถ้าชื่องานสื่อถึงทักษะเฉพาะ (เช่น
  "ออกแบบ...", "เขียนโค้ด...", "นำเสนอ...") ให้เลือกคนที่มีทักษะนั้นตรงที่สุดก่อนคนอื่น
- จากนั้นดู "ภาระงาน (workload score)" = งานที่มีอยู่แล้ว ÷ เวลาว่าง
  คะแนนยิ่งต่ำ = ยิ่งมีพื้นที่ว่างเหลือ ควรได้รับงานใหม่ก่อน (ในกลุ่มคนที่ทักษะพอกัน)
  (อย่าดูแค่ "เวลาว่าง" อย่างเดียว คนที่ว่างเยอะแต่มีงานค้างเยอะกว่าถือว่าแน่นกว่า)
- ทักษะที่ตรงกว่าสำคัญกว่าภาระงานที่ต่ำกว่าเล็กน้อย แต่ห้ามกองงานหลายชิ้นไว้ที่คนคนเดียว
  เพราะทักษะตรงเพียงอย่างเดียว ถ้าภาระงานสูงกว่าคนอื่นมากๆ ให้เลือกคนที่ว่างกว่าแทน
- ถ้าไม่มีใครมีทักษะที่ตรงชัดเจน หรือทักษะไม่ได้ระบุไว้ ให้ใช้นิสัย/ความถนัดจาก "นิสัย" ประกอบได้
- ตอบเป็น assignments โดยใช้ id ที่ให้มาเท่านั้น (taskId ต้องมาจากรายการงาน, userId ต้องมาจากรายชื่อสมาชิก)
`.trim();

  const result = await callGeminiJSON<{ assignments: { taskId: string; userId: string }[] }>(prompt, DISTRIBUTE_SCHEMA);
  if (!result || !Array.isArray(result.assignments)) return null;
  return result.assignments.filter((a) => a?.taskId && a?.userId);
}
