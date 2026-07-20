// ตัวช่วยสำหรับมุมมองปฏิทินแบบ time-grid (วัน/สัปดาห์) สไตล์ Google/Apple Calendar
// - แปลงเวลา "HH:mm" เป็นนาที
// - วางบล็อกกิจกรรมที่เวลาเหลื่อมกันให้อยู่เคียงข้างกัน (column layout)
//
// หมายเหตุ: ไฟล์นี้ไม่มี Tailwind class string จึงไม่ต้องกังวลเรื่อง content glob

/** ความสูงต่อ 1 ชั่วโมงในตาราง (px) - ใช้ร่วมกันทั้งแกนเวลาและการวางบล็อก */
export const HOUR_HEIGHT = 48;
/** ระยะเวลาเริ่มต้นของกิจกรรมที่ไม่ได้กรอกเวลาจบ (นาที) */
export const DEFAULT_DURATION = 60;

/** แปลง "HH:mm" เป็นจำนวนนาทีตั้งแต่เที่ยงคืน; คืน null ถ้ารูปแบบไม่ถูกต้อง/ว่าง */
export function timeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** แปลงจำนวนนาทีกลับเป็น "HH:mm" (ตัดให้อยู่ในช่วง 0..1439) */
export function minutesToTime(min: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface TimedItem<T> {
  event: T;
  startMin: number;
  endMin: number;
}

export interface PositionedEvent<T> extends TimedItem<T> {
  /** ตำแหน่งซ้าย (%) ภายในคอลัมน์ของวันนั้น */
  leftPct: number;
  /** ความกว้าง (%) ภายในคอลัมน์ของวันนั้น */
  widthPct: number;
}

/**
 * วางบล็อกกิจกรรมที่มีเวลา (timed) ของ "หนึ่งวัน" ให้เหลื่อมกันแบบไม่ทับ
 * ใช้อัลกอริทึมจัดคอลัมน์แบบ greedy เหมือน Google Calendar:
 *   1. จัดกลุ่มกิจกรรมที่เวลาซ้อนต่อเนื่องกันเป็น cluster เดียว
 *   2. ในแต่ละ cluster วางแต่ละกิจกรรมลงคอลัมน์แรกที่ว่าง (กิจกรรมล่าสุดจบไปแล้ว)
 *   3. กว้าง = 1/จำนวนคอลัมน์ของ cluster, ซ้าย = index คอลัมน์ * ความกว้าง
 */
export function layoutDayEvents<T>(items: TimedItem<T>[]): PositionedEvent<T>[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const result: PositionedEvent<T>[] = [];

  let cluster: TimedItem<T>[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnd: number[] = []; // เวลาจบของกิจกรรมล่าสุดในแต่ละคอลัมน์
    const colOf: number[] = [];
    cluster.forEach((it, idx) => {
      let placed = false;
      for (let c = 0; c < colEnd.length; c++) {
        if (it.startMin >= colEnd[c]) {
          colEnd[c] = it.endMin;
          colOf[idx] = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        colEnd.push(it.endMin);
        colOf[idx] = colEnd.length - 1;
      }
    });
    const numCols = colEnd.length;
    cluster.forEach((it, idx) => {
      result.push({
        ...it,
        leftPct: (colOf[idx] / numCols) * 100,
        widthPct: (1 / numCols) * 100,
      });
    });
    cluster = [];
  };

  for (const it of sorted) {
    // ถ้ากิจกรรมนี้เริ่มหลังจากทุกกิจกรรมใน cluster ปัจจุบันจบแล้ว = ขึ้น cluster ใหม่
    if (cluster.length > 0 && it.startMin >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.endMin);
  }
  flush();
  return result;
}
