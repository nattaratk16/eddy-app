'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AtSign, Lock, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/Input';
import Button from '@/components/Button';
import GoogleIcon from '@/components/icons/GoogleIcon';

// ข้อความ error ที่ NextAuth แปะมาใน query string ตอน redirect กลับมาหน้านี้ (เช่นตอนเชื่อม Google
// Calendar จากหน้าปฏิทินแล้วอีเมลของบัญชี Google ไม่ตรงกับบัญชีอื่นที่มีอยู่แล้ว - ปกติ NextAuth จะ
// ปฏิเสธการเชื่อมแบบเงียบๆ แล้วเด้งมาที่นี่พร้อม ?error=... โดยไม่มีข้อความอะไรเลยถ้าเราไม่จับเอง)
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    'บัญชี Google นี้ผูกกับอีเมลอื่นอยู่แล้ว ลองใช้บัญชี Google ที่ตรงกับอีเมลที่สมัครไว้ หรือเข้าสู่ระบบด้วยอีเมล/ชื่อผู้ใช้แทน',
};
const DEFAULT_OAUTH_ERROR_MESSAGE = 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองใหม่อีกครั้ง';

function LoginForm() {
  const router = useRouter();
  const oauthError = useSearchParams().get('error');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    oauthError ? OAUTH_ERROR_MESSAGES[oauthError] ?? DEFAULT_OAUTH_ERROR_MESSAGE : '',
  );

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

            <div>
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
              <Link href="/forgot-password" className="mt-1.5 inline-block font-body text-xs font-semibold text-eddy-600 hover:text-eddy-700">
                ลืมรหัสผ่าน?
              </Link>
            </div>

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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
