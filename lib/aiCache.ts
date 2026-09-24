/**
 * lib/aiCache.ts
 * --------------------------------------------------------------
 * Cache ผลลัพธ์ข้อความจาก Gemini ต่อ user ("workload-insight" / "weekly-summary") - endpoint
 * พวกนี้ถูกเรียกอัตโนมัติทุกครั้งที่เปิดหน้าแดชบอร์ด/ปฏิทิน (components/dashboard/WorkloadInsightText.tsx,
 * app/(app)/calendar/page.tsx) ไม่ใช่แค่ตอนผู้ใช้กดขอเอง ถ้าข้อมูลตั้งต้นไม่เปลี่ยน เปิดๆ ปิดๆ หน้า
 * ซ้ำก็ไม่ควรต้องยิง Gemini ใหม่ทุกรอบ - free tier มี RPM/RPD ต่ำมาก (ดู AI Studio dashboard)
 *
 * cacheKey = hash ของ input ทั้งหมดที่กำหนดคำตอบ (signals/events+categories+บริบทโปรไฟล์)
 * input เปลี่ยนก็ cache miss เองโดยธรรมชาติ ไม่ต้องมี TTL แยก
 *
 * cache เฉพาะคำตอบที่มาจาก Gemini จริงเท่านั้น (ไม่ cache mock fallback) กัน "ค้าง" อยู่กับ mock
 * ตลอดไปถ้า Gemini ล่มชั่วคราวแล้วกลับมาใช้ได้ใหม่ - ครั้งถัดไปจะยังลองยิงจริงเสมอถ้ายังไม่เคย cache
 * --------------------------------------------------------------
 */
import { createHash } from 'crypto';
import { prisma } from './prisma';

export function hashCacheInput(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export async function getCachedAiText(userId: string, kind: string, cacheKey: string): Promise<string | null> {
  const row = await prisma.aiCache.findUnique({
    where: { userId_kind_cacheKey: { userId, kind, cacheKey } },
    select: { value: true },
  });
  return row?.value ?? null;
}

export async function setCachedAiText(userId: string, kind: string, cacheKey: string, value: string): Promise<void> {
  await prisma.aiCache.upsert({
    where: { userId_kind_cacheKey: { userId, kind, cacheKey } },
    create: { userId, kind, cacheKey, value },
    update: { value },
  });
}
