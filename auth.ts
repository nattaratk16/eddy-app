/**
 * auth.ts
 * --------------------------------------------------------------
 * ตั้งค่า NextAuth (Auth.js v5) แบบเต็ม สำหรับใช้ใน Server Components / API routes
 * (ต่างจาก auth.config.ts ที่เป็นส่วน Edge-safe สำหรับ middleware)
 *
 * ใช้ PrismaAdapter เพื่อให้ Google OAuth สร้าง/ผูก User row ใน Postgres ให้อัตโนมัติ
 * (Credentials provider ไม่ต้องพึ่ง adapter - authorize() ค้นหา/ตรวจสอบ user เองอยู่แล้ว)
 * --------------------------------------------------------------
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import authConfig from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    // อัปเดต token + scope ล่าสุดลงตาราง Account ทุกครั้งที่ล็อกอิน Google
    // จำเป็นเพราะ PrismaAdapter จะไม่เขียนทับ token ถ้าบัญชีถูกผูกไว้แล้ว (เก็บแค่ครั้งแรก)
    // ทำให้ตอนขอสิทธิ์ปฏิทินเพิ่มทีหลัง refresh_token + calendar scope จะไม่ถูกบันทึกถ้าไม่มี callback นี้
    async signIn({ account }) {
      if (account?.provider === 'google' && account.providerAccountId) {
        await prisma.account.updateMany({
          where: { provider: 'google', providerAccountId: account.providerAccountId },
          data: {
            access_token: account.access_token,
            // อย่าเขียนทับด้วย null ถ้ารอบนี้ Google ไม่ได้ส่ง refresh_token กลับมา
            refresh_token: account.refresh_token ?? undefined,
            expires_at: typeof account.expires_at === 'number' ? account.expires_at : undefined,
            scope: account.scope,
            token_type: account.token_type,
            id_token: account.id_token,
          },
        });
      }
      return true;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : null;
        const password = credentials?.password;
        if (!email || typeof password !== 'string') return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // user.password เป็น null ได้ถ้าสมัครผ่าน Google มา - บัญชีแบบนี้ login ด้วยรหัสผ่านไม่ได้
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // ขอสิทธิ์อ่าน Google Calendar (read-only) + offline เพื่อได้ refresh_token
    // ทำให้ผู้ใช้ที่ล็อกอินด้วย Google เชื่อมปฏิทิน Google มาแสดงใน Eddy ได้
    Google({
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          // access_type=offline: ขอ refresh_token (Google คืนให้ตอน consent ครั้งแรก)
          // ไม่ใส่ prompt=consent แล้ว เพื่อไม่ให้ต้องกดยืนยันทุกครั้ง - ผู้ใช้เดิมที่เคยอนุญาตแล้วจะล็อกอินผ่านเลย
          access_type: 'offline',
        },
      },
    }),
  ],
});
