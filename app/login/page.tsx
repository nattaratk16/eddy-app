'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import SkyBackground from '@/components/SkyBackground';
import LoginIntro from '@/components/LoginIntro';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIntro, setShowIntro] = useState(true); // splash intro เด้งก่อนเข้าฟอร์ม login

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
    <>
      <AnimatePresence>
        {showIntro && <LoginIntro key="login-intro" onEnter={() => setShowIntro(false)} />}
      </AnimatePresence>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-white px-4 py-10">
      <SkyBackground />

      {/* โลโก้กลับหน้าแรก */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-20 flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink"
      >
        <Sparkles size={20} className="text-eddy-500" fill="currentColor" /> EDDY
      </Link>

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <div className="rounded-[28px] border border-white/80 bg-white/90 p-8 shadow-clay backdrop-blur-md">
          <div className="mb-6 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">ยินดีต้อนรับกลับมา 👋</h2>
            <p className="mt-1 font-body text-sm text-ink-soft">เข้าสู่ระบบเพื่อจัดตารางวันนี้กันต่อ</p>
          </div>

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
              <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 text-sm text-eddy-700">{error}</p>
            )}

            <Button type="submit" fullWidth disabled={loading} className="!rounded-full !bg-ink hover:!bg-black">
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
            className="!rounded-full"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            เข้าสู่ระบบด้วย Google
          </Button>

          <p className="mt-6 text-center font-body text-sm text-ink-muted">
            ยังไม่มีบัญชี?{' '}
            <Link href="/register" className="font-semibold text-eddy-600 hover:text-eddy-700">
              สมัครสมาชิก
            </Link>
          </p>
        </div>
      </div>
      </main>
    </>
  );
}
