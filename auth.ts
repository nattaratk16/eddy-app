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
    Google,
  ],
});
