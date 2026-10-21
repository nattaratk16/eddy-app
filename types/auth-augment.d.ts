import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      // อวาตาร์การ์ตูน DiceBear (ดู lib/avatar.ts) - ต้องมีใน session ด้วย ไม่งั้น Sidebar และจุดอื่นที่
      // อ่านจาก useSession() จะไม่เห็นอวาตาร์ที่ผู้ใช้เลือกไว้เลย (เห็นแค่รูป Google/ตัวอักษร)
      avatarStyle?: string | null;
      avatarSeed?: string | null;
      avatarColor?: string | null;
      // บทบาท ("university" | "teacher" | null ถ้ายังไม่ onboard) - ดู lib/roles.ts
      // ต้องมีใน session ให้ Sidebar/หน้า admin เช็ค role ได้โดยไม่ต้อง query DB เพิ่ม
      role?: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    avatarStyle?: string | null;
    avatarSeed?: string | null;
    avatarColor?: string | null;
    role?: string | null;
  }
}

export {};
