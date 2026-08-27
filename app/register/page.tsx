'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Mail, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';
import SkyBackground from '@/components/SkyBackground';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const username = String(form.get('username') ?? '').trim();
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    if (!username) {
      setError('กรุณากรอกชื่อผู้ใช้');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านยืนยันไม่ตรงกัน');
      setLoading(false);
      return;
    }

    try {
      // ใช้ username เป็นชื่อที่แสดงใน Eddy (แก้ไขได้ภายหลังในหน้าโปรไฟล์)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'สมัครสมาชิกไม่สำเร็จ ลองใหม่อีกครั้งนะ');
        setLoading(false);
        return;
      }

      router.push('/login');
    } catch {
      setError('เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ');
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-white px-4 py-6">
      <SkyBackground />

      {/* โลโก้กลับหน้าแรก */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-20 flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink"
      >
        <Sparkles size={20} className="text-eddy-500" fill="currentColor" /> EDDY
      </Link>

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <div className="rounded-[24px] border border-white/80 bg-white/90 p-6 shadow-clay backdrop-blur-md">
          <div className="mb-4 text-center">
            <h2 className="font-display text-h2 text-ink">เริ่มต้นกับเอ็ดดี้ ✨</h2>
            <p className="mt-1 font-body text-body text-ink-soft">สร้างบัญชีฟรี แล้วจัดตารางชีวิตให้ลงตัว</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <Input
                id="username"
                name="username"
                type="text"
                label="ชื่อผู้ใช้"
                placeholder="ชื่อที่จะแสดงใน Eddy"
                icon={<User size={18} />}
                required
              />
              <p className="mt-1 font-body text-xs text-ink-muted">แก้ไขได้ภายหลังในหน้าโปรไฟล์</p>
            </div>

            <Input
              id="email"
              name="email"
              type="email"
              label="อีเมล"
              placeholder="you@example.com"
              icon={<Mail size={18} />}
              required
            />

            <div>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="รหัสผ่าน"
                placeholder="อย่างน้อย 8 ตัวอักษร"
                icon={<Lock size={18} />}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="mt-2 flex items-center gap-1 text-xs font-semibold text-eddy-600"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              </button>
            </div>

            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              label="ยืนยันรหัสผ่าน"
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              icon={<Lock size={18} />}
              minLength={8}
              required
            />

            {error && (
              <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 text-sm text-eddy-700">{error}</p>
            )}

            <Button type="submit" fullWidth disabled={loading} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 hover:!brightness-110">
              {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-eddy-100" />
            <span className="font-body text-xs text-ink-muted">หรือ</span>
            <span className="h-px flex-1 bg-eddy-100" />
          </div>

          <Button
            variant="secondary"
            fullWidth
            type="button"
            className="!rounded-full"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            สมัครสมาชิกด้วย Google
          </Button>

          <p className="mt-4 text-center font-body text-sm text-ink-muted">
            มีบัญชีอยู่แล้ว?{' '}
            <Link href="/login" className="font-semibold text-eddy-600 hover:text-eddy-700">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
