'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AtSign, Lock, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/Input';
import Button from '@/components/Button';
import GoogleIcon from '@/components/icons/GoogleIcon';

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
    const identifier = String(form.get('identifier') ?? '');
    const password = String(form.get('password') ?? '');

    const res = await signIn('credentials', { identifier, password, redirect: false });

    if (res?.error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <AuthLayout
      topRight={
        <p className="font-body text-sm text-ink-muted">
          ยังไม่มีบัญชี?{' '}
          <Link href="/register" className="font-semibold text-eddy-600 hover:text-eddy-700">
            สมัครสมาชิก
          </Link>
        </p>
      }
    >
      <div className="animate-fade-in-up">
          <div className="mb-6 text-center">
            <h2 className="font-display text-h1 text-ink">ยินดีต้อนรับกลับมา 👋</h2>
            <p className="mt-1.5 font-body text-body text-ink-soft">เข้าสู่ระบบเพื่อจัดตารางวันนี้กันต่อ</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="identifier"
              name="identifier"
              type="text"
              label="อีเมลหรือชื่อผู้ใช้"
              placeholder="you@example.com หรือ username"
              icon={<AtSign size={18} />}
              required
            />

            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="รหัสผ่าน"
              placeholder="••••••••"
              icon={<Lock size={18} />}
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

            {error && (
              <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 text-sm text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">{error}</p>
            )}

            <Button type="submit" fullWidth disabled={loading} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 hover:!brightness-110">
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
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
            className="!rounded-xl"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            <span className="flex items-center justify-center gap-2">
              <GoogleIcon size={18} /> เข้าสู่ระบบด้วย Google
            </span>
          </Button>

      </div>
    </AuthLayout>
  );
}
