'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import DeleteAccountModal from './DeleteAccountModal';

interface DeleteAccountButtonProps {
  usesPassword: boolean;
}

// ปุ่ม + modal ลบบัญชีถาวร แยกเป็นคอมโพเนนต์เดียวจบเหมือน ChangePasswordButton เพราะหน้าตั้งค่าบัญชี
// (app/(app)/settings/account/page.tsx) เป็น Server Component ใช้ useState เองไม่ได้
export default function DeleteAccountButton({ usesPassword }: DeleteAccountButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-pastel-pink-dark/30 bg-surface px-4 py-2.5 font-display text-sm font-semibold text-chip-ink transition-colors hover:border-pastel-pink-dark/50 hover:bg-pastel-pink/40 dark:text-pastel-pink-dark"
      >
        <Trash2 size={16} /> ลบบัญชี
      </button>
      <DeleteAccountModal open={open} onClose={() => setOpen(false)} usesPassword={usesPassword} />
    </>
  );
}
