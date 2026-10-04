'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // ข้อความตอบกลับจาก server เหมือนกันเป๊ะไม่ว่าจะเจอบัญชีหรือไม่ (กัน enumeration) - โชว์ข้อความนี้
  // แทนฟอร์มเมื่อส่งสำเร็จ แทนที่จะบอกตรงๆ ว่า "เจอบัญชีนี้แล้ว" หรือ "ไม่เจอบัญชีนี้"
  const [sentMessage, setSentMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setSentMessage(data.message ?? 'ถ้าอีเมลนี้มีบัญชีอยู่ในระบบ เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้แล้ว');
    } catch {
      setError('เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      topRight={
        <Link href="/login" className="flex items-center gap-1 font-body text-sm font-semibold text-eddy-600 hover:text-eddy-700">
          <ArrowLeft size={15} /> กลับไปเข้าสู่ระบบ
        </Link>
      }
    >
      <div className="animate-fade-in-up">
        <div className="mb-6 text-center">
          <h2 className="font-display text-h1 text-ink">ลืมรหัสผ่าน?</h2>
          <p className="mt-1.5 font-body text-body text-ink-soft">กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p>
        </div>

        {sentMessage ? (
          <p className="rounded-clay-sm bg-pastel-mint/60 px-4 py-3 text-center text-sm text-chip-ink dark:bg-pastel-mint-dark/20 dark:text-pastel-mint-dark">
            {sentMessage}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="email"
              name="email"
              type="email"
              label="อีเมล"
              placeholder="you@example.com"
              icon={<Mail size={18} />}
              required
            />

            {error && (
              <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 text-sm text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">{error}</p>
            )}

            <Button type="submit" fullWidth disabled={loading} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 hover:!brightness-110">
              {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
