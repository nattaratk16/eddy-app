import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const STATE_COOKIE = 'google_link_state';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

function redirectToCalendar(origin: string, status: string) {
  const url = new URL('/calendar', origin);
  url.searchParams.set('googleLink', status);
  const res = NextResponse.redirect(url);
  res.cookies.delete(STATE_COOKIE);
  return res;
}

// GET /api/google/calendar/callback - Google redirect กลับมาที่นี่หลัง consent เสร็จ
// ไม่ผ่านระบบ login ของ NextAuth เลย - สำเร็จหรือล้มเหลวก็ไม่กระทบ session ปัจจุบันของผู้ใช้
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL('/login', req.nextUrl.origin));

  const origin = req.nextUrl.origin;

  // ผู้ใช้กด "ยกเลิก" บนหน้า consent ของ Google เอง - ไม่ใช่ error ที่ต้องแจ้งอะไรพิเศษ
  if (req.nextUrl.searchParams.get('error')) return redirectToCalendar(origin, 'cancelled');

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectToCalendar(origin, 'error');
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return redirectToCalendar(origin, 'error');

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${origin}/api/google/calendar/callback`,
    }),
  });
  if (!tokenRes.ok) return redirectToCalendar(origin, 'error');
  const tokenData = await tokenRes.json();
  const accessToken: string | undefined = tokenData.access_token;
  const refreshToken: string | undefined = tokenData.refresh_token;
  if (!accessToken) return redirectToCalendar(origin, 'error');
  // ไม่ควรเกิดเพราะบังคับ prompt=consent ไว้แล้ว แต่ถ้าไม่ได้ refresh_token มาจริงๆ เชื่อมต่อไปก็ไร้
  // ประโยชน์ - จะต่ออายุอัตโนมัติไม่ได้ ใช้ได้แค่ชั่วคราว (~1 ชม.) แล้วพังเงียบๆ
  if (!refreshToken) return redirectToCalendar(origin, 'error');

  const userinfoRes = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!userinfoRes.ok) return redirectToCalendar(origin, 'error');
  const userinfo = await userinfoRes.json();
  const googleAccountId: string | undefined = userinfo.sub;
  const email: string | undefined = userinfo.email;
  if (!googleAccountId || !email) return redirectToCalendar(origin, 'error');

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (tokenData.expires_in ?? 3600);

  try {
    // ลบลิงก์เดิมของ user คนนี้ก่อนเสมอ (ถ้ามี) เผื่อกำลัง "เชื่อมใหม่" ด้วยบัญชี Google อื่น - ไม่ใช้
    // upsert ตรงๆ เพราะ unique constraint หลักอยู่ที่ userId แต่ googleAccountId เปลี่ยนไปด้วยได้
    // ครอบด้วย transaction กันเหลือสถานะ "ลบไปแล้วแต่สร้างใหม่ไม่สำเร็จ" ค้างไว้
    await prisma.$transaction([
      prisma.googleCalendarLink.deleteMany({ where: { userId: session.user.id } }),
      prisma.googleCalendarLink.create({
        data: {
          userId: session.user.id,
          googleAccountId,
          email,
          accessToken,
          refreshToken,
          expiresAt,
          scope: tokenData.scope ?? null,
        },
      }),
    ]);
  } catch (e) {
    // P2002 ชนกับ googleAccountId - บัญชี Google นี้ถูกเชื่อมกับ Eddy user คนอื่นไปแล้ว
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return redirectToCalendar(origin, 'conflict');
    }
    throw e;
  }

  return redirectToCalendar(origin, 'success');
}
