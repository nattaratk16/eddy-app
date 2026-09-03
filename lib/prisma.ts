import { PrismaClient } from '@prisma/client';

// Next.js dev mode reloads modules often - เก็บ instance ไว้ใน global เพื่อไม่สร้าง connection ซ้ำๆ
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // เดิมเปิด 'query' ไว้ ทำให้ทุก SQL ถูกพิมพ์ลง console ตอน dev
    // การเขียน console บน Windows เป็น synchronous I/O — หน้าที่ยิงหลายสิบ query จะถูกหน่วงตามไปด้วย
    // ตั้ง PRISMA_LOG_QUERIES=1 เมื่อต้องการดีบัก query จริงๆ
    log:
      process.env.NODE_ENV === 'development' && process.env.PRISMA_LOG_QUERIES
        ? ['query', 'error', 'warn']
        : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
