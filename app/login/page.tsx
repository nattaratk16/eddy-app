'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import EddyMascot from '@/components/EddyMascot';
import FloatingShapes from '@/components/FloatingShapes';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    const res = await signIn('credentials', { email, password, redirect: false });

    if (res?.error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col bg-eddy-50 md:flex-row">
      {/* Left panel - illustration / brand */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-eddy-400 via-eddy-500 to-eddy-600 px-8 py-16 text-white md:w-1/2">
        <FloatingShapes />
        <div className="relative z-10 flex flex-col items-center text-center">
          <EddyMascot mood="wave" size={180} />
          <h1 className="mt-6 font-display text-4xl font-extrabold">EDDY</h1>
          <p className="mt-3 max-w-xs font-body text-eddy-50/90">
            สวัสดี! ผมเอ็ดดี้ ผู้ช่วย AI ที่จะช่วยจัดตาราง งาน และสิ่งที่ต้องทำของคุณให้เป็นระเบียบ
          </p>
          <div className="mt-8 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-body text-sm">
            <Sparkles size={16} />
            <span>ขับเคลื่อนด้วย Gemini AI</span>
          </div>
        </div>
      </section>

      {/* Right panel - login form */}
      <section className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="clay-card p-8">
            <h2 className="font-display text-2xl font-bold text-ink">เข้าสู่ระบบ</h2>
            <p className="mt-1 font-body text-sm text-ink-muted">
              ยินดีต้อนรับกลับมา จัดตารางวันนี้ให้น่ารักกันต่อเลย
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
                  placeholder="••••••••"
                  icon={<Lock size={18} />}
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

              {error && (
                <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 text-sm text-eddy-700">
                  {error}
                </p>
              )}

              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-eddy-100" />
              <span className="font-body text-xs text-ink-muted">หรือ</span>
              <span className="h-px flex-1 bg-eddy-100" />
            </div>

            <Button
              variant="secondary"
              fullWidth
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            >
              เข้าสู่ระบบด้วย Google
            </Button>

            <p className="mt-6 text-center font-body text-sm text-ink-muted">
              ยังไม่มีบัญชี?{' '}
              <a href="/register" className="font-semibold text-eddy-600">
                สมัครสมาชิก
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
