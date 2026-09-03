// scripts/backfill-category-kind.mjs
// --------------------------------------------------------------
// รันครั้งเดียวหลังเพิ่มคอลัมน์ Category.kind (npm run prisma:push)
// เพราะ `db push` ใส่ค่า default "non_academic" ให้หมวดหมู่เดิมทุกอันแบบไม่แยกแยะ
// สคริปต์นี้เดาใหม่จากชื่อหมวดหมู่ที่มีอยู่แล้ว (เหมือนตอนสร้างหมวดหมู่ใหม่)
//
// รัน: npm run backfill:category-kind
//
// หมายเหตุ: คัดลอกลิสต์คำจาก lib/categoryKind.ts มาไว้ที่นี่ เพราะสคริปต์นี้รันด้วย node
// ตรงๆ ไม่ผ่าน TypeScript - ถ้าแก้ลิสต์คำที่นั่น อย่าลืมแก้ที่นี่ด้วยถ้าจะรันซ้ำ
// --------------------------------------------------------------
import { PrismaClient } from '@prisma/client';

const ACADEMIC_KEYWORDS = [
  'เรียน', 'วิชา', 'การบ้าน', 'สอบ', 'ปริญญา', 'มหาวิทยาลัย', 'มหาลัย', "มหา'ลัย",
  'คลาส', 'บรรยาย', 'สัมมนา', 'ฝึกงาน', 'ห้องเรียน', 'ติวหนังสือ', 'ติวเตอร์',
  'นักเรียน', 'นักศึกษา', 'โรงเรียน', 'ป.ตรี', 'ป.โท', 'ปวช', 'ปวส', 'วิทยานิพนธ์',
  'lecture', 'class', 'course', 'study', 'studies', 'homework', 'assignment',
  'exam', 'quiz', 'thesis', 'seminar', 'university', 'college', 'school',
  'academic', 'capstone',
];

function guessCategoryKind(name) {
  const lower = name.toLowerCase();
  return ACADEMIC_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase())) ? 'academic' : 'non_academic';
}

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({ select: { id: true, name: true, kind: true } });
  let changed = 0;
  for (const cat of categories) {
    const guess = guessCategoryKind(cat.name);
    if (guess !== cat.kind) {
      await prisma.category.update({ where: { id: cat.id }, data: { kind: guess } });
      changed++;
      console.log(`  "${cat.name}" -> ${guess}`);
    }
  }
  console.log(`เสร็จแล้ว: แก้ ${changed}/${categories.length} หมวดหมู่`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
