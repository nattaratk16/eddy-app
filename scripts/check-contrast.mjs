// ตรวจคอนทราสต์ทุกคู่ "พื้น + ตัวอักษร" ที่โผล่ใน className เดียวกันจริงๆ ในโค้ด
// อ่านค่าสีจาก app/globals.css (ตัวแปร) และ tailwind.config.js (สีที่ไม่พลิกตามโหมด)
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = process.argv[2] || 'D:/Eddy-app';
const MODE = process.argv[3] || 'dark';

// ---------- อ่านตัวแปรสีจาก globals.css ----------
const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');
function varsOf(selector) {
  const start = css.indexOf(selector + ' {');
  const body = css.slice(start, css.indexOf('\n}', start));
  const out = {};
  for (const m of body.matchAll(/--c-([\w-]+):\s*([\d]+ [\d]+ [\d]+);/g)) out[m[1]] = m[2].split(' ').map(Number);
  return out;
}
const V = MODE === 'dark' ? { ...varsOf(':root'), ...varsOf('.dark') } : varsOf(':root');

// ---------- สีที่เขียน hex ตรงๆ ใน tailwind config (ไม่พลิกตามโหมด) ----------
const cfg = readFileSync(join(ROOT, 'tailwind.config.js'), 'utf8');
const FLAT = { white: [255, 255, 255], black: [0, 0, 0] };
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
for (const m of cfg.matchAll(/'?([\w-]+)'?:\s*'(#[0-9A-Fa-f]{6})'/g)) FLAT[m[1]] = hex2rgb(m[2]);
// pastel.* ต้องแยก namespace - ชื่อ pink/yellow/coral ชนกับ brand.*/gold ในไฟล์เดียวกัน
const pastelBlock = cfg.slice(cfg.indexOf('pastel: {'), cfg.indexOf('// สีรอง'));
for (const m of pastelBlock.matchAll(/'?([\w-]+)'?:\s*'(#[0-9A-Fa-f]{6})'/g)) FLAT['pastel-' + m[1]] = hex2rgb(m[2]);

// ---------- แปลงชื่อคลาส -> [r,g,b,alpha] ----------
function resolve(token) {
  const [name, alphaRaw] = token.split('/');
  const alpha = alphaRaw ? Number(alphaRaw) / 100 : 1;
  const varKey = name.replace(/^(eddy|accent)-/, '$1-').replace(/^ink$/, 'ink');
  if (V[varKey]) return [...V[varKey], alpha];
  if (name === 'ink') return [...V.ink, alpha];
  if (FLAT[name]) return [...FLAT[name], alpha];
  return null;
}
const over = (fg, bg) => fg.slice(0, 3).map((c, i) => Math.round(c * fg[3] + bg[i] * (1 - fg[3])));
const s2lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * s2lin(r) + 0.7152 * s2lin(g) + 0.0722 * s2lin(b);
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

// ---------- ไล่หา className ที่มีทั้ง bg- และ text- ----------
const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e)) files.push(p);
  }
})(join(ROOT, 'app'));
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e)) files.push(p);
  }
})(join(ROOT, 'components'));
files.push(join(ROOT, 'lib/colors.ts'));

// สีพื้นหน้าเว็บ อ่านจาก globals.css โดยตรง (ใช้ผสมกับพื้นที่กึ่งโปร่งใส)
// ห้าม hardcode - เปลี่ยนโทนธีมเมื่อไหร่ตัวเลขคอนทราสต์จะเพี้ยนทันทีโดยไม่มีใครรู้
const pageBlock = MODE === 'dark' ? css.slice(css.indexOf('.dark {')) : css.slice(css.indexOf(':root {'), css.indexOf('.dark {'));
const PAGE = hex2rgb(pageBlock.match(/--c-page-mid:\s*(#[0-9a-fA-F]{6})/)[1]);
const rows = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  // จับสตริงที่ดูเหมือนรายการคลาส (อยู่ใน '...' หรือ "..." หรือ `...`)
  for (const m of src.matchAll(/['"`]([^'"`\n]*\b(?:bg|text)-[\w/-]+[^'"`\n]*)['"`]/g)) {
    const str = m[1];
    if (str.includes('dark:')) continue; // มี dark: กำกับเองแล้ว ไม่ต้องเช็ค
    const bgs = [...str.matchAll(/(?:^|\s)!?bg-([\w-]+(?:\/\d+)?)/g)].map((x) => x[1])
      .filter((b) => !/^gradient-/.test(b));
    // พื้นแบบไล่สี: ใช้จุดเริ่ม (from-) เป็นตัวแทนพื้น - ไม่งั้นคู่พวกนี้จะหลุดการตรวจไปเลย
    for (const g of str.matchAll(/(?:^|\s)!?from-([\w-]+(?:\/\d+)?)/g)) bgs.push(g[1]);
    const txts = [...str.matchAll(/(?:^|\s)text-([\w-]+(?:\/\d+)?)/g)].map((x) => x[1])
      .filter((t) => !/^(xs|sm|base|lg|xl|\dxl|left|right|center|body|caption|micro|h[123]|display|body-lg|\[)/.test(t));
    for (const b of bgs) for (const t of txts) {
      const bc = resolve(b), tc = resolve(t);
      if (!bc || !tc) continue;
      const bgSolid = over(bc, PAGE);
      const fgSolid = over(tc, bgSolid);
      const ratio = contrast(fgSolid, bgSolid);
      const key = `bg-${b} + text-${t}`;
      if (!rows.has(key)) rows.set(key, { key, ratio, bg: hex(bgSolid), fg: hex(fgSolid), files: new Set() });
      rows.get(key).files.add(f.replace(ROOT + '\\', '').replace(ROOT + '/', ''));
    }
  }
}

const all = [...rows.values()].sort((a, b) => a.ratio - b.ratio);
const bad = all.filter((r) => r.ratio < 4.5);
console.log(`โหมด ${MODE} — เจอคู่ที่ใช้จริง ${all.length} คู่, ต่ำกว่า AA (4.5:1) ${bad.length} คู่\n`);
for (const r of bad) {
  const tag = r.ratio < 3 ? 'อ่านไม่ออก' : 'จางไป';
  console.log(`${r.ratio.toFixed(2).padStart(5)}:1  ${tag.padEnd(11)} ${r.key.padEnd(42)} ${r.bg} / ${r.fg}`);
  console.log(`                          ${[...r.files].slice(0, 3).join(', ')}`);
}
