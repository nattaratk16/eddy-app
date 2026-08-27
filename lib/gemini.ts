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

// ---------- 4) แตกงานใหญ่เป็นรายการย่อยอัตโนมัติ ----------
const BREAKDOWN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    subtasks: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['subtasks'],
};

interface BreakdownTaskParams {
  title: string;
  description?: string;
}

export async function breakdownTask({ title, description }: BreakdownTaskParams): Promise<string[] | null> {
  const prompt = `
งานนี้: "${title}"${description ? `\nรายละเอียดเพิ่มเติม: ${description}` : ''}

ช่วยแตกงานนี้เป็นรายการย่อย (subtask) ที่ทำแล้วนำไปสู่งานหลักสำเร็จ
- ให้แต่ละรายการย่อยสั้นกระชับ เป็นภาษาไทย เริ่มด้วยคำกริยา (เช่น "เขียน...", "ทำ...", "เตรียม...")
- จำนวนรายการย่อยที่เหมาะสมคือ 3-6 รายการ ขึ้นอยู่กับความซับซ้อนของงาน
- เรียงลำดับตามที่ควรทำก่อน-หลัง
`.trim();

  const result = await callGeminiJSON<{ subtasks: string[] }>(prompt, BREAKDOWN_SCHEMA);
  if (!result || !Array.isArray(result.subtasks)) return null;

  const cleaned = result.subtasks.map((s) => s.trim()).filter(Boolean);
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
    .map(
      (m) =>
        `- id=${m.id} | ${m.name} | ว่าง ~${m.freeMinutes} นาที | งานที่มีอยู่แล้ว ~${m.committedMinutes} นาที` +
        ` | ภาระงาน(workload score) ${fmtScore(m.workloadScore)}${m.bio ? ` | นิสัย: ${m.bio}` : ''}`,
    )
    .join('\n');

  const prompt = `
คุณคือผู้ช่วยจัดสรรงานให้ทีม ช่วยมอบหมายงานกลุ่มต่อไปนี้ให้สมาชิกแต่ละคน "อย่างเป็นธรรม"

งานที่ต้องกระจาย:
${taskList}

สมาชิกในกลุ่ม:
${memberList}

กติกา:
- มอบหมายให้ครบทุกงาน งานละ 1 คน
- ดู "ภาระงาน (workload score)" เป็นหลัก = งานที่มีอยู่แล้ว ÷ เวลาว่าง
  คะแนนยิ่งต่ำ = ยิ่งมีพื้นที่ว่างเหลือ ควรได้รับงานใหม่ก่อน
  (อย่าดูแค่ "เวลาว่าง" อย่างเดียว คนที่ว่างเยอะแต่มีงานค้างเยอะกว่าถือว่าแน่นกว่า)
- ถ้านิสัย/ความถนัดของใครเข้ากับงานไหนเป็นพิเศษ ให้จับคู่ให้เหมาะได้
  แม้ภาระงานจะสูงกว่าเล็กน้อย แต่ห้ามกองงานหลายชิ้นไว้ที่คนที่ภาระงานสูงสุด
- ตอบเป็น assignments โดยใช้ id ที่ให้มาเท่านั้น (taskId ต้องมาจากรายการงาน, userId ต้องมาจากรายชื่อสมาชิก)
`.trim();

  const result = await callGeminiJSON<{ assignments: { taskId: string; userId: string }[] }>(prompt, DISTRIBUTE_SCHEMA);
  if (!result || !Array.isArray(result.assignments)) return null;
  return result.assignments.filter((a) => a?.taskId && a?.userId);
}
