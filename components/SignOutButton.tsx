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
      className="flex w-full items-center justify-center gap-2 rounded-full border border-eddy-200 bg-surface px-4 py-2.5 font-display text-sm font-semibold text-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark-soft transition-colors hover:border-pastel-pink-dark/40 hover:bg-pastel-pink/40 hover:text-chip-ink"
    >
      <LogOut size={16} /> ออกจากระบบ
    </button>
  );
}
