/** คีย์ที่เก็บธีมที่ผู้ใช้เลือกไว้ใน localStorage (ค่า: 'light' | 'dark' | ไม่มี = ตามระบบ) */
export const THEME_STORAGE_KEY = 'eddy-theme';

/**
 * หน้าที่บังคับใช้ธีมสว่างเสมอ ไม่ว่าผู้ใช้จะตั้งค่าไว้เป็นอะไร
 *
 * หน้าพวกนี้เป็นหน้าสาธารณะ/หน้าแรกเข้า ที่ออกแบบภาพประกอบ ก้อนแสงพาสเทล และมาสคอต
 * มาบนพื้นฟ้าอ่อนโดยเฉพาะ - พอเป็นพื้นมืดแล้วองค์ประกอบพวกนี้ลอยผิดที่ไปหมด
 *
 * ใช้ 2 ที่ให้ครบทั้งการโหลดหน้าใหม่และการกดลิงก์ในแอป:
 *   - ThemeScript (รันใน <head> ก่อนวาด) สำหรับตอนเปิด URL ตรงๆ/รีเฟรช
 *   - ForceLightTheme (คอมโพเนนต์ในหน้านั้น) สำหรับตอนเปลี่ยนหน้าแบบ client-side
 *     ซึ่งสคริปต์ใน <head> ไม่ได้รันซ้ำ
 */
export const LIGHT_ONLY_PATHS = ['/', '/login', '/register', '/onboarding'];

/** ธีมที่ควรใช้ตอนนี้ - ตรรกะเดียวกับที่ ThemeScript ฝังไว้เป็นสตริง */
export function resolveDark(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (LIGHT_ONLY_PATHS.includes(path)) return false;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    /* อ่าน localStorage ไม่ได้ -> ตกไปใช้ค่าของระบบ */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
