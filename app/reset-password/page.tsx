'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/Input';
import Button from '@/components/Button';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'รีเซ็ตรหัสผ่านไม่สำเร็จ ลองใหม่อีกครั้งนะ');
        setLoading(false);
        return;
      }

      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setError('เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ');
      setLoading(false);
    }
  }

  // ไม่มี token ใน URL เลย (เข้าหน้านี้ตรงๆ โดยไม่ได้มาจากลิงก์ในอีเมล) - กันฟอร์มขึ้นมาแบบไม่มีความหมาย
  if (!token) {
    return (
      <div className="animate-fade-in-up text-center">
        <h2 className="font-display text-h1 text-ink">ลิงก์ไม่ถูกต้อง</h2>
        <p className="mt-1.5 font-body text-body text-ink-soft">
          ลิงก์รีเซ็ตรหัสผ่านนี้ไม่ถูกต้องหรือหมดอายุแล้ว ลองขอลิงก์ใหม่อีกครั้งนะ
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-block rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-6 py-2.5 font-display text-sm font-semibold text-white hover:brightness-110"
        >
          ขอลิงก์รีเซ็ตใหม่
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="animate-fade-in-up text-center">
        <h2 className="font-display text-h1 text-ink">ตั้งรหัสผ่านใหม่สำเร็จแล้ว 🎉</h2>
        <p className="mt-1.5 font-body text-body text-ink-soft">กำลังพาไปหน้าเข้าสู่ระบบ...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 text-center">
        <h2 className="font-display text-h1 text-ink">ตั้งรหัสผ่านใหม่</h2>
        <p className="mt-1.5 font-body text-body text-ink-soft">เลือกรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="รหัสผ่านใหม่"
            placeholder="อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข"
            icon={<Lock size={18} />}
            minLength={8}
            pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
            title="อย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                className="transition-colors hover:text-eddy-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            required
          />
          <PasswordStrengthMeter password={password} />
        </div>

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          label="ยืนยันรหัสผ่านใหม่"
          placeholder="กรอกรหัสผ่านอีกครั้ง"
          icon={<Lock size={18} />}
          minLength={8}
          required
        />

        {error && (
          <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 text-sm text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">{error}</p>
        )}

        <Button type="submit" fullWidth disabled={loading} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 hover:!brightness-110">
          {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      topRight={
        <Link href="/login" className="font-body text-sm font-semibold text-eddy-600 hover:text-eddy-700">
          เข้าสู่ระบบ
        </Link>
      }
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
