'use client';

import { useState } from 'react';
import { Lock, Check } from 'lucide-react';
import Modal from './Modal';

const inputClass =
  'w-full rounded-clay-sm border border-eddy-200 bg-white px-4 py-2.5 font-body text-sm text-ink transition-colors placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25';
const labelClass = 'mb-1.5 block font-display text-sm font-semibold text-ink-soft';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function reset() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่ยืนยันไม่ตรงกัน');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/profile/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'เปลี่ยนรหัสผ่านไม่สำเร็จ ลองใหม่อีกครั้งนะ');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="เปลี่ยนรหัสผ่าน"
    >
      {saved ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-mint text-eddy-700">
            <Check size={22} />
          </span>
          <p className="font-body text-sm text-ink">เปลี่ยนรหัสผ่านเรียบร้อยแล้ว</p>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="mt-1 rounded-full bg-eddy-50 px-4 py-2 font-display text-sm font-semibold text-eddy-600 hover:bg-eddy-100"
          >
            ปิด
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className={labelClass} htmlFor="cp-current">รหัสผ่านปัจจุบัน</label>
            <div className="relative flex items-center">
              <Lock size={16} className="pointer-events-none absolute left-3.5 text-ink-muted" />
              <input
                id="cp-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`${inputClass} pl-9`}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="cp-new">รหัสผ่านใหม่</label>
            <div className="relative flex items-center">
              <Lock size={16} className="pointer-events-none absolute left-3.5 text-ink-muted" />
              <input
                id="cp-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข"
                minLength={8}
                className={`${inputClass} pl-9`}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="cp-confirm">ยืนยันรหัสผ่านใหม่</label>
            <div className="relative flex items-center">
              <Lock size={16} className="pointer-events-none absolute left-3.5 text-ink-muted" />
              <input
                id="cp-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                className={`${inputClass} pl-9`}
                required
              />
            </div>
          </div>

          {error && <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 font-body text-sm text-eddy-700">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-4 py-2.5 font-display text-sm font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 disabled:opacity-60"
          >
            {saving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>
      )}
    </Modal>
  );
}
