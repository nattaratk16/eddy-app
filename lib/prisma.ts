import { PrismaClient } from '@prisma/client';

// Next.js dev mode reloads modules often - เก็บ instance ไว้ใน global เพื่อไม่สร้าง connection ซ้ำๆ
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
