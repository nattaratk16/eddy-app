/**
 * สคริปต์ตั้งธีมก่อนหน้าจอวาดครั้งแรก (ป้องกันจอขาวแวบ)
 * --------------------------------------------------------------
 * ต้องเป็น <script> ธรรมดาที่รันแบบ blocking ใน <head> - ถ้าไปตั้งใน useEffect
 * เบราว์เซอร์จะวาดธีมสว่างให้เห็นแวบหนึ่งก่อนแล้วค่อยกระพริบเป็นธีมมืด
 *
 * ลำดับการตัดสินใจ: หน้าที่บังคับสว่าง (LIGHT_ONLY_PATHS) > ค่าที่ผู้ใช้เลือกไว้ > ค่าของระบบ
 * เขียนเป็นสตริงเพราะโค้ดนี้ต้องรันบนเบราว์เซอร์ก่อน React จะ hydrate
 * --------------------------------------------------------------
 */
import { LIGHT_ONLY_PATHS, THEME_STORAGE_KEY } from '@/lib/theme';

const script = `
(function () {
  try {
    var path = location.pathname.replace(/[/]+$/, '') || '/';
    var lightOnly = ${JSON.stringify(LIGHT_ONLY_PATHS)};
    var saved = localStorage.getItem('${THEME_STORAGE_KEY}');
    var dark =
      lightOnly.indexOf(path) === -1 &&
      (saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches));
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    /* โหมดส่วนตัว/ปิดคุกกี้ -> ใช้ธีมสว่างตามค่าเริ่มต้น ไม่ต้องทำอะไร */
  }
})();
`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
