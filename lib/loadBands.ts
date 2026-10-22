// เกณฑ์สี/ป้ายกำกับระดับภาระงาน (เขียว/ส้ม/แดง) สำหรับ badge "โหลดเยอะสุด" แบบสั้นๆ
// ใช้ตัวเลขเกณฑ์เดียวกับ BANDS ใน components/groups/WorkloadPanel.tsx (55% / 85%) เพื่อให้สี/ความหมาย
// ตรงกันทั้งแอป - แยกไฟล์มาจากที่นั่นเพราะใช้ทั้งใน app/(app)/admin/page.tsx (ข้ามคลาส) และ
// app/(app)/groups/[id]/admin/page.tsx (ต่อกลุ่ม) ไม่อยากก๊อปเลขซ้ำสองที่
export const LOAD_BANDS = [
  { max: 55, label: 'ยังว่าง', text: 'text-load-free', track: 'bg-load-free/15' },
  { max: 85, label: 'เริ่มแน่น', text: 'text-load-tight', track: 'bg-load-tight/15' },
  { max: Infinity, label: 'แน่นมาก', text: 'text-load-full', track: 'bg-load-full/15' },
] as const;

export function loadBandOf(pct: number) {
  return LOAD_BANDS.find((b) => pct < b.max) ?? LOAD_BANDS[LOAD_BANDS.length - 1];
}

/** committedMinutes/freeMinutes ของสมาชิกคนหนึ่ง -> % เวลาที่ถูกจองแล้ว (สูตรเดียวกับ WorkloadPanel) */
export function loadPct(committedMinutes: number, freeMinutes: number): number {
  const capacity = committedMinutes + freeMinutes;
  return capacity > 0 ? Math.round((committedMinutes / capacity) * 100) : 100;
}
