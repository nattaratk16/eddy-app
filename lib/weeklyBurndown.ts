/**
 * lib/weeklyBurndown.ts
 * --------------------------------------------------------------
 * กราฟ Burndown สัปดาห์นี้ (หลัก Agile/Scrum) - เทียบ "เส้นอุดมคติ" (ควรเหลืองานเท่าไหร่ถ้าทำ
 * สม่ำเสมอ) กับ "เส้นจริง" (เหลือจริงกี่ชั่วโมงจากที่ปิดงานไปแล้ว) เพื่อดูล่วงหน้าว่าสัปดาห์นี้
 * จะทำงานเสร็จทันเดดไลน์หรือไม่
 *
 * รวมงานส่วนตัว (Task) + งานกลุ่มที่ได้รับมอบหมายและ approve แล้ว (GroupTaskAssignment)
 * เป็นเส้นเดียว นับเป็น "ชั่วโมงงาน" (estimatedMinutes) ไม่ใช่จำนวนชิ้น
 *
 * ข้อจำกัดที่ตั้งใจไว้ (บอกผู้ใช้ตรงๆ ใน UI เหมือนที่ WorkloadDistributionChart ทำกับ
 * "วันนี้นับเฉพาะเวลาที่เหลือ"): เส้นอุดมคติคำนวณจากยอดรวมงาน ณ ตอนนี้ ไม่ใช่ยอดตอนต้นสัปดาห์จริง
 * (to-do list เพิ่มงานได้ตลอดเวลา ไม่ใช่ sprint backlog ที่ปิดตายตอนเริ่ม) - เป็นการประมาณที่
 * เหมาะกับเครื่องมือส่วนตัวเบาๆ ไม่ใช่เครื่องมือ Scrum เต็มรูปแบบที่เก็บ snapshot ต้นสัปดาห์จริง
 * --------------------------------------------------------------
 */
import { prisma } from './prisma';
import { todayISOBangkok, dateKeyBangkok } from './thaiTime';
import { DEFAULT_TASK_MINUTES } from './groupWorkload';

export interface BurndownPoint {
  date: string; // YYYY-MM-DD
  minutes: number; // งานที่เหลือ (นาที) ณ วันนั้น
}

export interface BurndownSeries {
  ideal: BurndownPoint[]; // ครบทั้ง 7 วันของสัปดาห์เสมอ
  actual: BurndownPoint[]; // มีถึงแค่ "วันนี้" เท่านั้น (ทำนายอนาคตไม่ได้)
  totalMinutes: number;
}

/**
 * คำนวณเส้นอุดมคติ + เส้นจริง จากยอดงานรวมและ "งานที่ปิดไปแล้ววันไหนบ้าง"
 * แยกออกมาเป็น pure function ให้ทดสอบด้วยมือง่ายๆ ได้โดยไม่ต้องแตะ DB
 */
export function computeBurndownSeries(
  totalMinutes: number,
  weekDates: string[],
  todayISO: string,
  completedByDate: Map<string, number>,
): BurndownSeries {
  const n = weekDates.length;
  const ideal: BurndownPoint[] = weekDates.map((date, i) => ({
    date,
    minutes: n <= 1 ? 0 : Math.max(0, Math.round(totalMinutes * (1 - i / (n - 1)))),
  }));

  const actual: BurndownPoint[] = [];
  let cumulativeCompleted = 0;
  for (const date of weekDates) {
    if (date > todayISO) break; // ไม่โปรเจกต์เส้นจริงล่วงหน้าไปอนาคต
    cumulativeCompleted += completedByDate.get(date) ?? 0;
    actual.push({ date, minutes: Math.max(0, totalMinutes - cumulativeCompleted) });
  }

  return { ideal, actual, totalMinutes };
}

/**
 * ขอบเขตสัปดาห์นี้ (อาทิตย์-เสาร์ ตามธรรมเนียมเดิมของแอป) คำนวณด้วยเลขคณิต UTC ล้วนๆ
 * (ไม่ใช้ date-fns startOfWeek/endOfWeek เพราะฟังก์ชันนั้นตัดสิน "วันอะไร" จาก timezone ของ
 * เครื่องที่รันโค้ด - ถ้า deploy อยู่คนละ timezone กับไทย อาจนับสัปดาห์ผิดวันได้ ใช้ getUTCDay()
 * กับ anchor ที่เป็น "เที่ยงคืน UTC ของวันที่ตามเวลาไทย" แทน ปลอดภัยกว่าและตรงกับที่ Event.date/
 * Task.dueDate เก็บกันอยู่แล้ว (เที่ยงคืน UTC = ป้ายกำกับวันที่ ไม่ใช่เวลาจริง)
 */
function thisWeekDatesUTC(todayISO: string): { weekDates: string[]; weekEnd: Date } {
  const todayAnchor = new Date(`${todayISO}T00:00:00.000Z`);
  const dow = todayAnchor.getUTCDay(); // 0=อาทิตย์ .. 6=เสาร์
  const weekStart = new Date(todayAnchor.getTime() - dow * 86400000);
  const weekDates = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000).toISOString().slice(0, 10));
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
  return { weekDates, weekEnd };
}

/** ดึงข้อมูลจริงจาก DB มาคำนวณ Burndown สัปดาห์นี้ของผู้ใช้คนหนึ่ง (รวมงานส่วนตัว + งานกลุ่ม) */
export async function getWeeklyBurndown(userId: string): Promise<BurndownSeries> {
  const todayISO = todayISOBangkok();
  const { weekDates, weekEnd } = thisWeekDatesUTC(todayISO);

  // ขอบเขต: มีกำหนดส่งภายในสัปดาห์นี้เท่านั้น (รวมที่เลยกำหนดไปแล้วด้วย - ยังเป็นภาระค้างอยู่)
  // งานที่ไม่มีกำหนดส่งไม่มี "เดดไลน์" ให้ burndown เทียบด้วย เลยไม่นับเข้ามา
  const [tasks, assignments] = await Promise.all([
    prisma.task.findMany({
      where: { userId, dueDate: { not: null, lte: weekEnd } },
      select: { estimatedMinutes: true, completedAt: true },
    }),
    prisma.groupTaskAssignment.findMany({
      where: { assignedToUserId: userId, status: 'approved', groupTask: { dueDate: { not: null, lte: weekEnd } } },
      select: { groupTask: { select: { estimatedMinutes: true, completedAt: true } } },
    }),
  ]);

  let totalMinutes = 0;
  const completedByDate = new Map<string, number>();
  const addCompleted = (date: string, minutes: number) => completedByDate.set(date, (completedByDate.get(date) ?? 0) + minutes);

  for (const t of tasks) {
    const minutes = t.estimatedMinutes ?? DEFAULT_TASK_MINUTES;
    totalMinutes += minutes;
    if (t.completedAt) addCompleted(dateKeyBangkok(t.completedAt), minutes);
  }
  for (const a of assignments) {
    const minutes = a.groupTask.estimatedMinutes; // ไม่มี null ได้ (schema default 60)
    totalMinutes += minutes;
    if (a.groupTask.completedAt) addCompleted(dateKeyBangkok(a.groupTask.completedAt), minutes);
  }

  return computeBurndownSeries(totalMinutes, weekDates, todayISO, completedByDate);
}
