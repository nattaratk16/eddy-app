/**
 * auth.config.ts
 * --------------------------------------------------------------
 * ส่วนของ config ที่ต้องรันบน Edge Runtime ได้ (ใช้ใน middleware.ts)
 * ห้าม import bcrypt หรือ Prisma ที่นี่ เพราะทั้งสองใช้ Node.js API ที่ Edge ไม่รองรับ
 * ส่วน Credentials provider จริง (ที่ต้องใช้ bcrypt/Prisma) อยู่ใน auth.ts แทน
 * --------------------------------------------------------------
 */
import type { NextAuthConfig } from 'next-auth';

export default {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === 'string') {
        session.user.id = token.id;
      }
      if (session.user) {
        session.user.avatarStyle = typeof token.avatarStyle === 'string' ? token.avatarStyle : null;
        session.user.avatarSeed = typeof token.avatarSeed === 'string' ? token.avatarSeed : null;
        session.user.avatarColor = typeof token.avatarColor === 'string' ? token.avatarColor : null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
