// สไตล์ช่องกรอกที่ฟอร์มในหน้าตั้งค่าใช้ร่วมกัน (ย้ายมาจาก components/ProfileForm.tsx เดิม
// ตอนแยกฟอร์มเดียวยาวๆ ออกเป็นหลายหน้า) - รวมไว้ที่เดียวเพื่อให้ทุกแท็บหน้าตาเหมือนกัน
export const inputClass =
  'w-full rounded-clay-sm border border-eddy-200 bg-white px-4 py-2.5 font-body text-sm text-ink transition-colors placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';

export const labelClass = 'mb-1.5 block font-display text-sm font-semibold text-ink-soft';

/** ปุ่มตัวเลือกแบบ segmented (ค่าสำเร็จรูป เช่น 30/45/60 นาที) */
export function segBtnClass(active: boolean) {
  return `rounded-full px-4 py-2 font-body text-sm font-medium transition-colors ${
    active ? 'bg-eddy-500 text-white' : 'bg-eddy-50 text-ink-soft hover:bg-eddy-100'
  }`;
}
