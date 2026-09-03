'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

/**
 * ปุ่มออกจากระบบสำหรับหน้าโปรไฟล์ - เหมือนปุ่มใน Sidebar.tsx ทุกประการ
 * แยกเป็นคอมโพเนนต์เล็กๆ เพราะ ProfilePage เป็น Server Component เรียก signOut() ตรงๆ ไม่ได้
 */
export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-eddy-200 bg-white px-4 py-2.5 font-display text-sm font-semibold text-ink-soft transition-colors hover:border-pastel-pink-dark/40 hover:bg-pastel-pink/40 hover:text-eddy-700"
    >
      <LogOut size={16} /> ออกจากระบบ
    </button>
  );
}
