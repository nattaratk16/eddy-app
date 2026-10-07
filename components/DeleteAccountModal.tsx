'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { AlertTriangle, Lock } from 'lucide-react';
import Modal from './Modal';

const inputClass =
  'w-full rounded-clay-sm border border-eddy-200 bg-surface px-4 py-2.5 font-body text-sm text-ink transition-colors placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';
const labelClass = 'mb-1.5 block font-display text-sm font-semibold text-ink-soft';

const CONFIRM_PHRASE = 'ลบบัญชี';

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  usesPassword: boolean;
}

export default function DeleteAccountModal({ open, onClose, usesPassword }: DeleteAccountModalProps) {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  function reset() {
    setPassword('');
    setConfirmText('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (confirmText !== CONFIRM_PHRASE) {
      setError(`กรุณาพิมพ์ "${CONFIRM_PHRASE}" ให้ตรงเพื่อยืนยัน`);
      return;
    }

    setDeleting(true);
    const res = await fetch('/api/profile', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usesPassword ? { password } : {}),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'ลบบัญชีไม่สำเร็จ ลองใหม่อีกครั้งนะ');
      setDeleting(false);
      return;
    }

    // ออกจากระบบทันทีหลังลบสำเร็จ - กัน session เก่าค้างอยู่ในเบราว์เซอร์ (JWT ไม่รู้ว่า user ถูกลบ
    // ไปแล้ว ถ้าไม่ signOut ตรงนี้ จะเจอปัญหาเด้งวนหน้า onboarding/หน้าอื่นๆ เพราะ API เรียก user ที่ไม่มีอยู่จริง)
    await signOut({ callbackUrl: '/' });
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="ลบบัญชีถาวร"
    >
      <div className="mb-4 flex items-start gap-2.5 rounded-clay-sm bg-pastel-pink/60 px-3.5 py-3 dark:bg-pastel-pink-dark/20">
        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-chip-ink dark:text-pastel-pink-dark" />
        <p className="font-body text-sm text-chip-ink dark:text-pastel-pink-dark">
          ข้อมูลทั้งหมด (งาน หมวดหมู่ กิจกรรม ประวัติแชท การเชื่อมต่อ Google Calendar และสมาชิกภาพในกลุ่ม) จะถูกลบถาวร
          กู้คืนไม่ได้
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {usesPassword && (
          <div>
            <label className={labelClass} htmlFor="da-password">รหัสผ่าน</label>
            <div className="relative flex items-center">
              <Lock size={16} className="pointer-events-none absolute left-3.5 text-ink-muted" />
              <input
                id="da-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pl-9`}
                required
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="da-confirm">
            พิมพ์ &quot;{CONFIRM_PHRASE}&quot; เพื่อยืนยัน
          </label>
          <input
            id="da-confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {error && (
          <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-sm text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={deleting || confirmText !== CONFIRM_PHRASE}
          className="mt-1 rounded-full bg-chip-ink px-4 py-2.5 font-display text-sm font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 disabled:opacity-50"
        >
          {deleting ? 'กำลังลบ...' : 'ลบบัญชีถาวร'}
        </button>
      </form>
    </Modal>
  );
}
