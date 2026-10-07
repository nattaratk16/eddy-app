// ตัวช่วยเรียก Google Calendar API ด้วย token ของผู้ใช้
// มี token อยู่ได้ 2 ที่ตั้งใจแยกกัน (ดูเหตุผลที่ prisma/schema.prisma เหนือ model GoogleCalendarLink):
//   1. ตาราง GoogleCalendarLink - เชื่อมแบบ explicit ผ่านปุ่ม "เชื่อม Google Calendar" ที่หน้าปฏิทิน
//      (รองรับอีเมลไม่ตรงกับบัญชี Eddy ที่สมัครไว้ได้ เพราะแยกจากระบบ login โดยสิ้นเชิง)
//   2. ตาราง Account - ของ NextAuth เอง ติดมาอัตโนมัติถ้าผู้ใช้สมัคร/ล็อกอิน Eddy ด้วย Google ตั้งแต่แรก
// เช็คตารางแรกก่อนเสมอ ถ้าไม่มีค่อย fallback ไปตารางสอง
import { prisma } from './prisma';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number } | null> {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const accessToken: string | undefined = data.access_token;
    if (!accessToken) return null;
    return { accessToken, expiresIn: data.expires_in ?? 3600 };
  } catch {
    return null;
  }
}

/**
 * คืน access_token ของ Google ที่ยังใช้ได้ของผู้ใช้ (null ถ้ายังไม่ได้เชื่อม Google / ไม่มีสิทธิ์)
 * - ถ้า token หมดอายุและมี refresh_token จะขอ token ใหม่แล้วอัปเดตในฐานข้อมูลให้
 */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);

  const link = await prisma.googleCalendarLink.findUnique({ where: { userId } });
  if (link) {
    if (link.expiresAt && link.expiresAt - 60 > now) return link.accessToken;
    if (!link.refreshToken) return null;
    const refreshed = await refreshAccessToken(link.refreshToken);
    if (!refreshed) return null;
    await prisma.googleCalendarLink.update({
      where: { userId },
      data: { accessToken: refreshed.accessToken, expiresAt: now + refreshed.expiresIn },
    });
    return refreshed.accessToken;
  }

  const account = await prisma.account.findFirst({ where: { userId, provider: 'google' } });
  if (!account?.access_token) return null;
  if (account.expires_at && account.expires_at - 60 > now) return account.access_token;
  if (!account.refresh_token) return null;

  const refreshed = await refreshAccessToken(account.refresh_token);
  if (!refreshed) return null;
  await prisma.account.update({
    where: { id: account.id },
    data: { access_token: refreshed.accessToken, expires_at: now + refreshed.expiresIn },
  });
  return refreshed.accessToken;
}

/** ผู้ใช้เชื่อมบัญชี Google (มี access_token ใช้ได้จากที่ใดที่หนึ่ง) ไว้แล้วหรือยัง */
export async function hasGoogleAccount(userId: string): Promise<boolean> {
  const [link, account] = await Promise.all([
    prisma.googleCalendarLink.findUnique({ where: { userId }, select: { id: true } }),
    prisma.account.findFirst({ where: { userId, provider: 'google', access_token: { not: null } }, select: { id: true } }),
  ]);
  return !!link || !!account;
}

export interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
  // 'link' = เชื่อมแบบ explicit ผ่านปุ่มเชื่อม (ยกเลิก/เปลี่ยนบัญชีได้)
  // 'account' = ติดมาจากตอนสมัคร/ล็อกอิน Eddy ด้วย Google เอง (จัดการผ่านปุ่มเชื่อม/ยกเลิกนี้ไม่ได้
  // เพราะเป็นแถวเดียวกับที่ใช้ login อยู่ - ลบแล้วจะล็อกอินไม่ได้ถ้าไม่มีรหัสผ่านสำรอง)
  source: 'link' | 'account' | null;
}

/** สถานะการเชื่อม Google Calendar แบบละเอียด (ใช้ตัดสินใจ UI ว่าควรโชว์ปุ่มเปลี่ยน/ยกเลิกไหม) */
export async function getGoogleCalendarStatus(userId: string): Promise<GoogleCalendarStatus> {
  const link = await prisma.googleCalendarLink.findUnique({ where: { userId }, select: { email: true } });
  if (link) return { connected: true, email: link.email, source: 'link' };

  const account = await prisma.account.findFirst({ where: { userId, provider: 'google' }, select: { id: true } });
  if (account) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return { connected: true, email: user?.email ?? null, source: 'account' };
  }

  return { connected: false, email: null, source: null };
}
