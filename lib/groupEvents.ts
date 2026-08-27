/**
 * ชื่อ event กลางสำหรับบอกให้ทุกส่วนของหน้ากลุ่มโหลดข้อมูลใหม่
 * (เช่น เชิญสมาชิกจากหัวกลุ่มใน layout -> รายชื่อสมาชิกในแท็บภาพรวมต้องอัปเดตตาม)
 * ใช้ event แทนการยก state ทั้งหมดขึ้นไปไว้ที่ layout เพราะแต่ละแท็บโหลดข้อมูลของตัวเองอยู่แล้ว
 */
export const GROUP_UPDATED_EVENT = 'eddy:group-updated';

export function notifyGroupUpdated() {
  window.dispatchEvent(new Event(GROUP_UPDATED_EVENT));
}
