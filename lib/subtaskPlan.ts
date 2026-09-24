/**
 * lib/subtaskPlan.ts
 * --------------------------------------------------------------
 * กระจาย "งานย่อย" ของงานหนึ่งชิ้นลงบนช่วงเวลาว่างจริง ตั้งแต่วันเริ่มถึงกำหนดส่ง
 *
 * ทำไมไม่ให้ AI ตอบวันเวลามาเลย: หลักเดียวกับ lib/schedule.ts และ freeTime.ts คือ
 * เรื่อง "เมื่อไหร่ / ว่างไหม" ต้องแม่นยำ ใช้อัลกอริทึมคำนวณจากปฏิทินจริง
 * ส่วน AI รับผิดชอบแค่ "งานนี้ควรซอยเป็นขั้นตอนอะไรบ้าง และแต่ละขั้นใช้เวลาเท่าไหร่"
 * (ดู breakdownTask ใน lib/gemini.ts)
 *
 * กลยุทธ์การวาง: กระจายให้ทั่วช่วง ไม่ใช่กองไว้วันแรก
 * เพราะจุดประสงค์ของฟีเจอร์นี้คือให้ผู้ใช้ "ทยอยทำ" ก่อนถึงกำหนดส่ง
 * --------------------------------------------------------------
 */
import { minutesToTime } from './calendarLayout';
import type { FreeSlot } from './freeTime';

export interface PlannedStep {
  title: string;
  estimatedMinutes: number;
  /** null = หาช่องว่างให้ไม่ได้ (ผู้ใช้ยังกรอกเองทีหลังได้) */
  date: string | null;
  startTime: string | null;
  endTime: string | null;
}

interface StepInput {
  title: string;
  estimatedMinutes: number;
}

/**
 * เลือกวันที่จะวางขั้นตอนที่ i จากทั้งหมด n ขั้น ให้กระจายทั่วช่วงวันที่มี
 *
 * ตัวอย่าง 4 ขั้นตอน / 8 วัน -> วันที่ดัชนี 0, 2, 4, 6 (เว้นวันสุดท้ายไว้เป็นกันชนก่อนส่ง)
 * ถ้าวันน้อยกว่าจำนวนขั้นตอน จะวนวางซ้ำวันเดิมได้ (แต่ยังเรียงตามลำดับ)
 */
function targetDayIndex(stepIndex: number, stepCount: number, dayCount: number): number {
  if (dayCount <= 1) return 0;
  if (stepCount <= 1) return 0;
  // กันชน: พยายามให้ขั้นสุดท้ายเสร็จก่อนวันกำหนดส่ง 1 วัน ถ้าช่วงยาวพอ
  const lastUsable = dayCount >= stepCount + 1 ? dayCount - 2 : dayCount - 1;
  const ratio = stepIndex / (stepCount - 1);
  return Math.min(lastUsable, Math.round(ratio * lastUsable));
}

/**
 * วางงานย่อยลงช่วงว่าง
 *
 * @param steps  ขั้นตอนเรียงตามลำดับที่ควรทำก่อน-หลัง
 * @param slots  ช่วงว่างของผู้ใช้ (จาก freeSlotsForUsers) — ฟังก์ชันนี้จะ mutate เพื่อกันวางทับกันเอง
 * @param dates  รายการวันที่ในช่วง startDate..dueDate เรียงจากน้อยไปมาก
 * @param bufferMin เว้นช่วงพักก่อน/หลังแต่ละขั้นตอน (นาที) - ไม่บังคับ ดูเหตุผลเดียวกับ lib/freeTime.ts::placeTask
 */
export function planSubtasks(steps: StepInput[], slots: FreeSlot[], dates: string[], bufferMin = 0): PlannedStep[] {
  const planned: PlannedStep[] = [];
  if (steps.length === 0) return planned;

  // จัดช่วงว่างตามวัน เพื่อให้เลือกวันเป้าหมายได้ตรงๆ
  const slotsByDate = new Map<string, FreeSlot[]>();
  for (const s of slots) {
    if (!dates.includes(s.date)) continue;
    const arr = slotsByDate.get(s.date) ?? [];
    arr.push(s);
    slotsByDate.set(s.date, arr);
  }

  // หาช่องว่างที่ยาวพอในวันที่กำหนด แล้วตัดเวลาที่ใช้ออก (mutate) กันขั้นถัดไปวางทับ
  // (เว้น bufferMin ก่อน+หลังเหมือน lib/freeTime.ts::placeTask ทุกประการ - ค่าเริ่มต้น 0 พฤติกรรมเดิมเป๊ะ)
  function takeSlotOn(date: string, durationMin: number): { startMin: number; endMin: number } | null {
    const daySlots = slotsByDate.get(date);
    if (!daySlots) return null;
    for (const slot of daySlots) {
      // slot.bufferedStart: กันบวก bufferMin ซ้ำถ้า slot นี้เคยถูกแกะไปแล้วในลูปนี้ (ดู lib/freeTime.ts::placeTask)
      const leadBuffer = slot.bufferedStart ? 0 : bufferMin;
      const start = slot.startMin + leadBuffer;
      const end = start + durationMin;
      if (end + bufferMin <= slot.endMin) {
        const placed = { startMin: start, endMin: end };
        slot.startMin = end + bufferMin;
        slot.bufferedStart = true;
        return placed;
      }
    }
    return null;
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const duration = step.estimatedMinutes;
    const preferredIndex = targetDayIndex(i, steps.length, dates.length);

    // ลองวันที่ตั้งใจไว้ก่อน ถ้าเต็มค่อยไล่หาวันถัดไป แล้วค่อยย้อนกลับมาวันก่อนหน้า
    // (ไล่ไปข้างหน้าก่อนเพราะขั้นตอนถัดไปควรอยู่หลังขั้นก่อนหน้าตามลำดับการทำงาน)
    const order: number[] = [preferredIndex];
    for (let d = 1; d < dates.length; d++) {
      if (preferredIndex + d < dates.length) order.push(preferredIndex + d);
      if (preferredIndex - d >= 0) order.push(preferredIndex - d);
    }

    let placed: { date: string; startMin: number; endMin: number } | null = null;
    for (const idx of order) {
      const date = dates[idx];
      const got = takeSlotOn(date, duration);
      if (got) {
        placed = { date, startMin: got.startMin, endMin: got.endMin };
        break;
      }
    }

    planned.push({
      title: step.title,
      estimatedMinutes: duration,
      date: placed ? placed.date : null,
      startTime: placed ? minutesToTime(placed.startMin) : null,
      endTime: placed ? minutesToTime(placed.endMin) : null,
    });
  }

  // เรียงตามวันเวลาจริงอีกครั้ง เพื่อให้ลำดับที่ผู้ใช้เห็นตรงกับลำดับที่ต้องลงมือทำ
  // (ขั้นที่หาช่องไม่ได้ ดันไปท้ายสุด)
  return planned
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      if (!a.p.date && !b.p.date) return a.i - b.i;
      if (!a.p.date) return 1;
      if (!b.p.date) return -1;
      if (a.p.date !== b.p.date) return a.p.date < b.p.date ? -1 : 1;
      return (a.p.startTime ?? '').localeCompare(b.p.startTime ?? '');
    })
    .map(({ p }) => p);
}

/** รายการวันที่แบบ "YYYY-MM-DD" ตั้งแต่ from ถึง to (รวมปลายทั้งสองฝั่ง) */
export function datesBetween(from: string, to: string, maxDays = 60): string[] {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const out: string[] = [];
  for (let t = start.getTime(); t <= end.getTime() && out.length < maxDays; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}
