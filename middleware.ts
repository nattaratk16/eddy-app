import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import authConfig from '@/auth.config';

// ใช้ config แบบ Edge-safe (ไม่มี bcrypt/Prisma) เพราะ middleware รันบน Edge Runtime
const { auth } = NextAuth(authConfig);

// ป้องกันทุกหน้าที่ต้อง login แล้ว (กลุ่ม (app)) — ไม่ยุ่งกับ /login, /register, หรือ /api/auth/*
export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ['/dashboard/:path*', '/calendar/:path*', '/todo/:path*'],
};
