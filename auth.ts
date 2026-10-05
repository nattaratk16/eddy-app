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
import { checkRateLimit } from '@/lib/rateLimit';
import authConfig from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    // session ใช้ strategy 'jwt' - ชื่อ/รูป/อวาตาร์ถูกแช่ไว้ใน token ตั้งแต่ตอนล็อกอิน ถ้าผู้ใช้แก้ในหน้าตั้งค่า
    // แล้วไม่อ่านใหม่ตรงนี้ Sidebar กับคำทักทาย (ซึ่งอ่านจาก session) จะค้างเป็นของเก่าจนกว่าจะล็อกอินใหม่
    // ฝั่งฟอร์มเรียก useSession().update() หลังบันทึกสำเร็จ -> callback นี้ถูกเรียกด้วย trigger 'update'
    // ดึงใหม่ทั้งตอนล็อกอินครั้งแรก (user มีค่า) ด้วย ไม่ใช่แค่ trigger 'update' เพราะ authorize() ของ
    // Credentials provider คืนแค่ id/email/name ไม่มี avatarStyle/avatarSeed ฯลฯ ถ้าไม่ดึงตรงนี้
    // คนที่เคยตั้งอวาตาร์ไว้แล้ว ล็อกอินใหม่อีกรอบ (เช่น session หมดอายุ) จะไม่เห็นอวาตาร์ตัวเองจนกว่า
    // จะกดบันทึกที่หน้าตั้งค่าอีกครั้ง
    // (jwt callback อยู่ที่นี่ ไม่ใช่ auth.config.ts เพราะต้องใช้ Prisma ซึ่ง Edge Runtime รันไม่ได้)
    async jwt({ token, user, trigger }) {
      if (user) token.id = user.id;
      const id = user?.id ?? (typeof token.id === 'string' ? token.id : undefined);
      if (id && (user || trigger === 'update')) {
        const fresh = await prisma.user.findUnique({
          where: { id },
          select: { name: true, image: true, avatarStyle: true, avatarSeed: true, avatarColor: true },
        });
        if (fresh) {
          token.name = fresh.name;
          token.picture = fresh.image;
          token.avatarStyle = fresh.avatarStyle;
          token.avatarSeed = fresh.avatarSeed;
          token.avatarColor = fresh.avatarColor;
        }
      }
      return token;
    },
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
      // "identifier" รับได้ทั้งอีเมลและ username - authorize() ด้านล่างแยกกันเองตามรูปแบบ
      credentials: {
        identifier: { label: 'Email หรือ Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const identifier = typeof credentials?.identifier === 'string' ? credentials.identifier.trim().toLowerCase() : null;
        const password = credentials?.password;
        if (!identifier || typeof password !== 'string') return null;

        // กัน brute-force เดารหัสผ่านของบัญชีเดียวกันรัวๆ - ไม่มีอะไรจำกัดตรงนี้มาก่อนเลย
        // จำกัดต่อ identifier (ไม่ใช่ต่อ IP) เพราะเป้าหมายคือกันคนเดา "บัญชีนี้" ไม่ใช่กันคนคนเดียวล็อกอินถี่ๆ
        if (!checkRateLimit(`login:${identifier}`, 10, 5 * 60_000)) return null;
        // เพดานรวมทั้งระบบอีกชั้น - กันคนร้ายสลับ identifier ไปเรื่อยๆ (credential spraying) หลบ limit ต่อ
        // identifier ด้านบนไปได้ เพราะแต่ละ identifier นับแยกกันเอง
        if (!checkRateLimit('login:global', 200, 60_000)) return null;

        // มี @ ถือว่าพิมพ์อีเมลมา ไม่งั้นถือว่าเป็น username (username validate ไว้แล้วว่าห้ามมี @)
        // username เทียบแบบไม่สนพิมพ์เล็ก-ใหญ่ (mode: 'insensitive') เพราะตอนนี้เก็บตัวพิมพ์ตามที่ผู้ใช้
        // ตั้งไว้จริง (เช่น "JohnDoe") ถ้าเทียบตรงๆ แบบเดิม คนที่ตั้งพิมพ์ใหญ่ไว้แล้วพิมพ์คนละพิมพ์ตอน
        // ล็อกอินจะหาบัญชีตัวเองไม่เจอเลย
        const user = identifier.includes('@')
          ? await prisma.user.findUnique({ where: { email: identifier } })
          : await prisma.user.findFirst({ where: { username: { equals: identifier, mode: 'insensitive' } } });
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
