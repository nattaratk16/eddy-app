// ตัวช่วยเรียก Google Calendar API ด้วย token ของผู้ใช้ (เก็บไว้ในตาราง Account จาก Google OAuth)
// รีเฟรช access_token อัตโนมัติเมื่อหมดอายุ โดยใช้ refresh_token
import { prisma } from './prisma';

/**
 * คืน access_token ของ Google ที่ยังใช้ได้ของผู้ใช้ (null ถ้ายังไม่ได้เชื่อม Google / ไม่มีสิทธิ์)
 * - ถ้า token หมดอายุและมี refresh_token จะขอ token ใหม่แล้วอัปเดตในฐานข้อมูลให้
 */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({ where: { userId, provider: 'google' } });
  if (!account?.access_token) return null;

  const now = Math.floor(Date.now() / 1000);
  // ยังไม่หมดอายุ (เผื่อ 60 วินาที)
  if (account.expires_at && account.expires_at - 60 > now) return account.access_token;

  // หมดอายุแล้ว - ต้องมี refresh_token ถึงจะขอใหม่ได้
  if (!account.refresh_token) return null;

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const accessToken: string | undefined = data.access_token;
    if (!accessToken) return null;

    await prisma.account.update({
      where: { id: account.id },
      data: { access_token: accessToken, expires_at: now + (data.expires_in ?? 3600) },
    });
    return accessToken;
  } catch {
    return null;
  }
}

/** ผู้ใช้เชื่อมบัญชี Google (มี access_token) ไว้แล้วหรือยัง */
export async function hasGoogleAccount(userId: string): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google', access_token: { not: null } },
    select: { id: true },
  });
  return !!account;
}
