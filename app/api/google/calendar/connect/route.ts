import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { auth } from '@/auth';

// คุกกี้เก็บ state แบบสุ่มไว้สั้นๆ ระหว่าง redirect ไป-กลับ Google (ป้องกัน CSRF - กันไม่ให้ลิงก์ callback
// ที่ปลอมมาจากที่อื่นถูกใช้เชื่อมบัญชี Google ที่ผู้ใช้ไม่ได้เลือกเองเข้ากับ session นี้)
const STATE_COOKIE = 'google_link_state';

// GET /api/google/calendar/connect - เริ่ม flow เชื่อม Google Calendar แบบ explicit (แยกจากระบบ
// login ของ NextAuth โดยสิ้นเชิง - ดูเหตุผลที่ lib/google.ts) ไม่แตะ session ของผู้ใช้เลย ไม่ว่าจะ
// สำเร็จหรือล้มเหลว
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL('/login', req.nextUrl.origin));

  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) return NextResponse.redirect(new URL('/calendar?googleLink=error', req.nextUrl.origin));

  const state = randomBytes(24).toString('hex');
  const redirectUri = `${req.nextUrl.origin}/api/google/calendar/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email https://www.googleapis.com/auth/calendar.readonly');
  authUrl.searchParams.set('access_type', 'offline');
  // บังคับหน้า consent ทุกครั้ง (ไม่ใช่แค่ครั้งแรก) เพื่อการันตีว่าได้ refresh_token กลับมาเสมอ แม้ผู้ใช้
  // จะเคยอนุญาตแอปนี้ไปแล้วก่อนหน้า (สำคัญตอน "เชื่อมใหม่"/เปลี่ยนไปใช้อีกบัญชี - ไม่งั้น Google จะไม่ส่ง
  // refresh_token กลับมาให้อีกเพราะถือว่า consent ไว้แล้ว)
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
