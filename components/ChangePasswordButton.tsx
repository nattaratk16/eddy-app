'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

// ปุ่ม + modal เปลี่ยนรหัสผ่าน แยกเป็นคอมโพเนนต์เดียวจบเหมือน SignOutButton เพราะหน้าโปรไฟล์
// (app/(app)/profile/page.tsx) เป็น Server Component ใช้ useState เองไม่ได้
export default function ChangePasswordButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-eddy-200 bg-surface px-4 py-2.5 font-display text-sm font-semibold text-ink-soft transition-colors hover:border-eddy-300 hover:bg-eddy-50 hover:text-eddy-700"
      >
        <KeyRound size={16} /> เปลี่ยนรหัสผ่าน
      </button>
      <ChangePasswordModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
