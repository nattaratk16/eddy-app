'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Mail, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';
import EddyMascot from '@/components/EddyMascot';
import FloatingShapes from '@/components/FloatingShapes';
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
    const name = String(form.get('name') ?? '');
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
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
    <main className="flex min-h-screen flex-col bg-eddy-50 md:flex-row">
      {/* Left panel - illustration / brand */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-eddy-400 via-eddy-500 to-eddy-600 px-8 py-16 text-white md:w-1/2">
        <FloatingShapes />
        <div className="relative z-10 flex flex-col items-center text-center">
          <EddyMascot mood="wave" size={180} />
          <h1 className="mt-6 font-display text-4xl font-extrabold">EDDY</h1>
          <p className="mt-3 max-w-xs font-body text-eddy-50/90">
            สร้างบัญชีใหม่แล้วเริ่มจัดตาราง งาน และสิ่งที่ต้องทำกับเอ็ดดี้ได้เลย
          </p>
          <div className="mt-8 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-body text-sm">
            <Sparkles size={16} />
            <span>ขับเคลื่อนด้วย Gemini AI</span>
          </div>
        </div>
      </section>

      {/* Right panel - register form */}
      <section className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="clay-card p-8">
            <h2 className="font-display text-2xl font-bold text-ink">สมัครสมาชิก</h2>
            <p className="mt-1 font-body text-sm text-ink-muted">
              ยินดีต้อนรับ! กรอกข้อมูลเพื่อเริ่มต้นใช้งานเอ็ดดี้
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <Input
                id="name"
                name="name"
                type="text"
                label="ชื่อ (ไม่บังคับ)"
                placeholder="ชื่อของคุณ"
                icon={<User size={18} />}
              />

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

              {error && (
                <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 text-sm text-eddy-700">
                  {error}
                </p>
              )}

              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
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
              สมัครสมาชิกด้วย Google
            </Button>

            <p className="mt-6 text-center font-body text-sm text-ink-muted">
              มีบัญชีอยู่แล้ว?{' '}
              <a href="/login" className="font-semibold text-eddy-600">
                เข้าสู่ระบบ
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
