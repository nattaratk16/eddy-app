// หาเคส "พื้นสว่างที่ไม่พลิกโหมด อยู่ที่ element แม่ + ตัวอักษรที่พลิกโหมด อยู่ที่ลูก"
// สคริปต์ contrast.mjs เทียบได้แค่ใน className เดียวกัน เคสแม่-ลูกจึงหลุดไป
// ใช้ระดับการย่อหน้าเป็นตัวเดา "ขอบเขตของ element" ซึ่งพอใช้ได้กับ JSX ที่ format แล้ว
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
const ROOT = 'D:/Eddy-app';
const files = [];
for (const base of ['app', 'components']) (function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(e) && files.push(p);
  }
})(join(ROOT, base));

const LIGHT_BG = /\b!?(?:bg|from|via|to)-pastel-[\w-]+(?:\/\d+)?/;
const FLIP_TEXT = /\btext-(ink|ink-soft|eddy-[6789]00)\b/;
let found = 0;
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (!LIGHT_BG.test(L)) continue;
    if (/dark:(bg|from|to|text)-/.test(L)) continue;         // สั่ง dark ไว้เองแล้ว
    if (FLIP_TEXT.test(L)) continue;                          // อยู่บรรทัดเดียวกัน -> contrast.mjs จับได้อยู่แล้ว
    const indent = L.search(/\S/);
    for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
      const N = lines[j];
      if (!N.trim()) continue;
      if (N.search(/\S/) <= indent && /^\s*[<)}]/.test(N)) break;   // ออกนอกขอบเขต element แล้ว
      if (FLIP_TEXT.test(N) && !/dark:text-/.test(N)) {
        console.log(`${f.slice(ROOT.length + 1)}:${i + 1}  พื้น ${L.match(LIGHT_BG)[0]}`);
        console.log(`      -> บรรทัด ${j + 1}: ${N.trim().slice(0, 96)}`);
        found++;
        break;
      }
    }
  }
}
console.log(`\nรวม ${found} จุด`);
