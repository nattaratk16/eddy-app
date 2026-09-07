'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Mail, Lock, User, AtSign, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/Input';
import Button from '@/components/Button';
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal';
import GoogleIcon from '@/components/icons/GoogleIcon';

// ต้องตรงกับ USERNAME_RE ใน lib/validation.ts (regex เดียวกันฝั่ง client แค่เอาไว้ขึ้น error เร็วๆ
// ฝั่ง server ยังเป็นคนตัดสินจริงเสมอ)
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const username = String(form.get('username') ?? '').trim().toLowerCase();
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    if (!name) {
      setError('กรุณากรอกชื่อที่แสดง');
      setLoading(false);
      return;
    }
    if (!USERNAME_PATTERN.test(username)) {
      setError('ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข หรือ _ ยาว 3-20 ตัว');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านยืนยันไม่ตรงกัน');
      setLoading(false);
      return;
    }
    if (!agreedToTerms) {
      setError('กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password, acceptedTerms: agreedToTerms }),
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
    <>
    <AuthLayout
      maxWidth="max-w-md"
      topRight={
        <p className="font-body text-sm text-ink-muted">
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/login" className="font-semibold text-eddy-600 hover:text-eddy-700">
            เข้าสู่ระบบ
          </Link>
        </p>
      }
    >
      <div className="animate-fade-in-up">
          <div className="mb-5 text-center">
            <h2 className="font-display text-h1 text-ink">เริ่มต้นกับเอ็ดดี้ ✨</h2>
            <p className="mt-1.5 font-body text-body text-ink-soft">สร้างบัญชีฟรี แล้วจัดตารางชีวิตให้ลงตัว</p>
          </div>

          {/* ทางลัดที่ friction ต่ำสุด (ไม่ต้องพิมพ์อะไรเลย) ขึ้นก่อนฟอร์มกรอกมือเสมอ */}
          <Button
            variant="secondary"
            fullWidth
            type="button"
            className="!rounded-xl"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            <span className="flex items-center justify-center gap-2">
              <GoogleIcon size={18} /> สมัครสมาชิกด้วย Google
            </span>
          </Button>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-eddy-100" />
            <span className="font-body text-xs text-ink-muted">หรือกรอกด้วยตัวเอง</span>
            <span className="h-px flex-1 bg-eddy-100" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="name"
                name="name"
                type="text"
                label="ชื่อที่แสดง"
                placeholder="ชื่อใน Eddy"
                icon={<User size={18} />}
                required
              />

              <div>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  label="ชื่อผู้ใช้"
                  placeholder="username"
                  icon={<AtSign size={18} />}
                  pattern="[a-z0-9_]{3,20}"
                  title="ตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข หรือ _ ยาว 3-20 ตัว"
                  required
                />
                <p className="mt-1 font-body text-[11px] text-ink-muted">a-z, 0-9, _ (3-20 ตัว)</p>
              </div>
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
                placeholder="อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข"
                icon={<Lock size={18} />}
                minLength={8}
                pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
                title="อย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว"
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
              <p className="mt-1 font-body text-xs text-ink-muted">อย่างน้อย 8 ตัว ต้องมีทั้งตัวอักษรและตัวเลข</p>
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

            <label className="flex items-start gap-2.5 font-body text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-eddy-300 text-eddy-500 focus:ring-eddy-400"
                required
              />
              <span>
                ฉันได้อ่านและยอมรับ{' '}
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="font-semibold text-eddy-600 underline-offset-2 hover:text-eddy-700 hover:underline"
                >
                  นโยบายความเป็นส่วนตัว
                </button>{' '}
                ของ Eddy แล้ว
              </span>
            </label>

            {error && (
              <p className="rounded-clay-sm bg-pastel-pink/60 px-3 py-2 text-sm text-chip-ink dark:bg-pastel-pink-dark/20 dark:text-pastel-pink-dark">{error}</p>
            )}

            <Button type="submit" fullWidth disabled={loading || !agreedToTerms} className="!rounded-full !bg-gradient-to-r !from-eddy-500 !to-accent-500 hover:!brightness-110">
              {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
            </Button>
          </form>
      </div>
    </AuthLayout>

    {/* อยู่นอก <form> (และนอก AuthLayout) โดยตั้งใจ - ปุ่มปิดของ Modal ไม่ได้ระบุ type="button"
        ถ้าซ้อนอยู่ในฟอร์มจะกลายเป็น submit button โดยไม่ตั้งใจ (ดีฟอลต์ของ <button> ในฟอร์มคือ type="submit") */}
    <PrivacyPolicyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
}
