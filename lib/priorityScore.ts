/**
 * lib/priorityScore.ts
 * --------------------------------------------------------------
 * คำนวณ "Priority Score" ของงานแบบ local ล้วนๆ (ไม่เรียก Gemini เลย)
 * จาก 3 แกน: ความสำคัญ (importance), ความเร่งด่วน (urgency จาก dueDate),
 * ความยาก/ระยะเวลา (effort จาก estimatedMinutes) - หลักการคล้าย Eisenhower Matrix
 * ผสม weighted scoring ตามที่ระบุไว้ใน README
 *
 * คำนวณสดทุกครั้งที่เรียก ไม่เก็บลง DB เพราะ urgency เปลี่ยนทุกวันตามวันที่ใกล้ dueDate เข้ามา
 * --------------------------------------------------------------
 */
import type { Task } from './types';

const IMPORTANCE_SCORE: Record<Task['priority'], number> = {
  high: 1,
  medium: 0.6,
  low: 0.3,
};

const URGENCY_NO_DUE_DATE = 0.3; // งานไม่มีกำหนดส่ง ให้ baseline กลางๆค่อนไปทางต่ำ ไม่ให้จมหายไปเลย
const URGENCY_WINDOW_DAYS = 14; // ภายใน 14 วันถือว่ายิ่งใกล้ยิ่งเร่งด่วน
const EFFORT_NEUTRAL_MINUTES = 60; // ถ้าไม่ระบุเวลาโดยประมาณ ให้ถือว่ากลางๆ
const EFFORT_MAX_MINUTES = 240; // งานที่ยาวกว่านี้ถือว่า "ใหญ่" เต็มสเกล (คะแนน effort ต่ำสุด)

const WEIGHTS = { importance: 0.5, urgency: 0.35, effort: 0.15 };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function urgencyScore(dueDate?: string): number {
  if (!dueDate) return URGENCY_NO_DUE_DATE;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return URGENCY_NO_DUE_DATE;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const daysLeft = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  // เลยกำหนดส่งแล้ว (daysLeft ติดลบ) ให้ถือว่าเร่งด่วนสุด (clamp ที่ 1)
  return clamp(1 - daysLeft / URGENCY_WINDOW_DAYS, 0, 1);
}

function effortScore(estimatedMinutes?: number): number {
  const minutes = estimatedMinutes ?? EFFORT_NEUTRAL_MINUTES;
  // งานสั้นกว่า = คะแนนสูงกว่า (ทำง่าย/เร็ว ควรเก็บก่อนเป็น quick win)
  return 1 - clamp(minutes / EFFORT_MAX_MINUTES, 0, 1);
}

export function computePriorityScore(task: Task): number {
  const importance = IMPORTANCE_SCORE[task.priority] ?? IMPORTANCE_SCORE.medium;
  const urgency = urgencyScore(task.dueDate);
  const effort = effortScore(task.estimatedMinutes);
  return importance * WEIGHTS.importance + urgency * WEIGHTS.urgency + effort * WEIGHTS.effort;
}

// ---------- ลำดับงานที่ล็อกไว้ (ใช้ทั้งหน้า To-do และตอนจัดลงปฏิทิน) ----------
// เดิมเป็นปุ่มสลับ "เรียงตาม AI แนะนำ" ที่ใช้ Priority Score ด้านบน
// เปลี่ยนเป็นกฎตายตัวที่ผู้ใช้เดาผลได้: กำหนดส่งมาก่อน แล้วค่อยความสำคัญ
// (Priority Score ยังอยู่เพราะเป็นสูตรที่อธิบายไว้ใน README และใช้เป็นเกณฑ์อ้างอิงได้)
const PRIORITY_RANK: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };

/**
 * เปรียบเทียบงานสองชิ้นตามลำดับที่ล็อกไว้
 *
 *   1. งานที่มีกำหนดส่ง มาก่อนงานที่ไม่มีกำหนดส่งเสมอ
 *   2. มีกำหนดส่งทั้งคู่ -> วันที่ใกล้กว่ามาก่อน
 *   3. กำหนดส่งวันเดียวกัน (หรือไม่มีทั้งคู่) -> ความสำคัญมากกว่ามาก่อน
 *   4. เท่ากันหมด -> เรียงตามชื่อ เพื่อให้ลำดับคงที่ ไม่สลับไปมาเวลา re-render
 */
export function compareTasks(a: Task, b: Task): number {
  if (a.dueDate && b.dueDate) {
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  } else if (a.dueDate) {
    return -1;
  } else if (b.dueDate) {
    return 1;
  }
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;
  return a.title.localeCompare(b.title, 'th');
}
