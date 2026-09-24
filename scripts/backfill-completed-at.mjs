// scripts/backfill-completed-at.mjs
// --------------------------------------------------------------
// รันครั้งเดียวหลังเพิ่มคอลัมน์ Task.completedAt / GroupTask.completedAt (npm run prisma:push)
// งานที่ติ๊กเสร็จไปแล้ว "ก่อน" คอลัมน์นี้มีอยู่จะมี done=true แต่ completedAt=null
// ทำให้หายไปจากตัวนับ "เสร็จแล้ว X จาก Y" รายเดือนและ GET /api/tasks/done ทันทีที่ deploy
// (ทั้งสอง endpoint กรองด้วย completedAt ไม่ใช่ done เฉยๆ)
//
// ไม่มีเวลาที่ติ๊กเสร็จจริงเก็บไว้ที่ไหนเลย ใช้ updatedAt แทนเป็นค่าประมาณที่ใกล้เคียงที่สุด
// (แถวที่ done=true ส่วนใหญ่ updatedAt คือครั้งสุดท้ายที่ถูกแก้ ซึ่งมักจะเป็นตอนติ๊กเสร็จนั่นเอง)
//
// รัน: npm run backfill:completed-at
// --------------------------------------------------------------
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // updateMany ตั้งค่าจาก field อื่นของแถวเดียวกันไม่ได้ (ไม่มี SET completedAt = updatedAt ใน Prisma)
  // เลยต้องไล่ทีละแถวแทน
  const staleTasks = await prisma.task.findMany({
    where: { done: true, completedAt: null },
    select: { id: true, updatedAt: true },
  });
  for (const t of staleTasks) {
    await prisma.task.update({ where: { id: t.id }, data: { completedAt: t.updatedAt } });
  }
  console.log(`Task: แก้ ${staleTasks.length} แถว`);

  const staleGroupTasks = await prisma.groupTask.findMany({
    where: { done: true, completedAt: null },
    select: { id: true, updatedAt: true },
  });
  for (const gt of staleGroupTasks) {
    await prisma.groupTask.update({ where: { id: gt.id }, data: { completedAt: gt.updatedAt } });
  }
  console.log(`GroupTask: แก้ ${staleGroupTasks.length} แถว`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
