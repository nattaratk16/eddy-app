/**
 * lib/donutGeometry.ts
 * --------------------------------------------------------------
 * คำนวณ stroke-dasharray/dashoffset สำหรับวาดกราฟโดนัท (วงกลมซ้อนกันหลายวง เทคนิคเดียวกับ
 * ที่เคยใช้ทำกราฟ Time Distribution ของกลุ่ม) - แยกออกมาเป็น pure function เพราะตอนนี้มี
 * โดนัท 2 อันในแดชบอร์ดส่วนตัว (Eisenhower + สัดส่วนเวลาตามหมวดหมู่) ใช้เรขาคณิตแบบเดียวกัน
 *
 * วิธีใช้: วาด <circle> วงเดียวกัน (cx,cy,r เท่ากันทุกวง) ซ้อนกันหลายอัน ห่อด้วย
 * <g transform="rotate(-90 cx cy)"> ให้เริ่มที่ 12 นาฬิกา แล้วใส่ dashArray/dashOffset ที่ได้
 * จากฟังก์ชันนี้ให้แต่ละวง
 * --------------------------------------------------------------
 */

export interface DonutSliceInput {
  id: string;
  label: string;
  minutes: number;
  /** class สี stroke ของ Tailwind (เช่น 'stroke-pastel-pink-dark') */
  colorClass: string;
}

export interface DonutSlice extends DonutSliceInput {
  pct: number;
  dashArray: string;
  dashOffset: number;
}

/** ช่องไฟบางๆ คั่นระหว่างเสี้ยว (surface gap) กันเสี้ยวติดกันจนดูเป็นก้อนเดียว */
const DEFAULT_GAP = 3;

/**
 * แปลงรายการ {minutes} ให้เป็นเสี้ยวโดนัทพร้อมพิกัด SVG
 * @param circumference เส้นรอบวงของวงกลมที่จะวาด (2πr) - ต้องคำนวณจาก r เดียวกับที่ใช้จริงใน SVG
 */
export function computeDonutSlices(entries: DonutSliceInput[], circumference: number, gap = DEFAULT_GAP): DonutSlice[] {
  const total = entries.reduce((sum, e) => sum + e.minutes, 0);
  if (total <= 0) return [];

  let cursorMin = 0;
  return entries
    .filter((e) => e.minutes > 0)
    .map((e) => {
      const startFraction = cursorMin / total;
      cursorMin += e.minutes;
      const dashLen = (e.minutes / total) * circumference;
      const trimmed = Math.max(dashLen - gap, 0);
      return {
        ...e,
        pct: Math.round((e.minutes / total) * 100),
        dashArray: `${trimmed} ${circumference - trimmed}`,
        dashOffset: -(startFraction * circumference),
      };
    });
}
