'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, CalendarDays, ListChecks, MessageCircle, Users } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_EMOJI, type UserRole } from '@/lib/roles';

const ROLES: UserRole[] = ['school', 'university', 'working'];

const TIPS = [
  { icon: CalendarDays, title: 'ปฏิทินอัจฉริยะ', desc: 'คลิกช่องเวลาเพื่อเพิ่มกิจกรรม เอ็ดดี้ช่วยเช็คเวลาชนให้' },
  { icon: ListChecks, title: 'สิ่งที่ต้องทำ', desc: 'เพิ่มงาน + ให้ AI แตกเป็นขั้นตอนย่อยและจัดลำดับความสำคัญ' },
  { icon: MessageCircle, title: 'คุยกับเอ็ดดี้', desc: 'พิมพ์ "นัดหมอพุธหน้าบ่ายสาม" แล้วเอ็ดดี้เพิ่มลงปฏิทินให้เลย' },
  { icon: Users, title: 'กลุ่ม', desc: 'สร้างกลุ่ม แชร์ตาราง ให้ AI หาเวลาว่างร่วมและกระจายงาน' },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  async function finish() {
    if (!role) return;
    setLoading(true);
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    router.push('/dashboard');
    router.refresh();
  }

  async function skip() {
    setLoading(true);
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skip: true }),
    });
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <AuthLayout
      maxWidth="max-w-lg"
      topRight={
        <button
          onClick={skip}
          disabled={loading}
          className="rounded-full px-3 py-1.5 font-display text-sm font-semibold text-ink-soft transition-colors hover:bg-eddy-50 hover:text-ink"
        >
          ข้ามไปก่อน
        </button>
      }
    >
        <div>
          {/* จุดบอกสเตป */}
          <div className="mb-6 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-inverse' : 'w-1.5 bg-eddy-200'}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ---------- สเตป 0: ต้อนรับ ---------- */}
            {step === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <Image src="/mascot/eddy-wordmark.png" alt="EDDY" width={900} height={411} className="mx-auto h-12 w-auto" priority />
                <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">ยินดีต้อนรับสู่ Eddy 🎉</h1>
                <p className="mx-auto mt-2 max-w-sm font-body text-sm text-ink-soft">
                  มาตั้งค่าเล็กน้อยให้เอ็ดดี้รู้จักคุณกันก่อน จะได้ช่วยจัดตารางและแนะนำได้ตรงกับคุณมากขึ้น (ใช้เวลาแค่ 1 นาที)
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-inverse px-7 py-3 font-display font-semibold text-white transition-all hover:scale-[1.03] hover:bg-black active:scale-95"
                >
                  เริ่มตั้งค่า <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {/* ---------- สเตป 1: เลือกบทบาท ---------- */}
            {step === 1 && (
              <motion.div
                key="role"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-center font-display text-xl font-bold tracking-tight text-ink">ตอนนี้คุณคือ?</h2>
                <p className="mt-1 text-center font-body text-sm text-ink-soft">
                  เอ็ดดี้จะสร้างหมวดหมู่ปฏิทินและปรับคำแนะนำให้เหมาะกับคุณ
                </p>

                <div className="mt-5 flex flex-col gap-3">
                  {ROLES.map((r) => {
                    const active = role === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`flex items-center gap-4 rounded-clay border p-4 text-left transition-all ${
                          active ? 'border-ink bg-eddy-50 ring-2 ring-ink/10' : 'border-eddy-200 bg-surface hover:border-eddy-300'
                        }`}
                      >
                        <span className="text-3xl">{ROLE_EMOJI[r]}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-base font-bold text-ink">{ROLE_LABELS[r]}</span>
                          <span className="block font-body text-xs text-ink-muted">{ROLE_DESCRIPTIONS[r]}</span>
                        </span>
                        {active && <Check size={20} className="flex-shrink-0 text-ink" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button onClick={() => setStep(0)} className="flex items-center gap-1 font-display text-sm font-semibold text-ink-soft hover:text-ink">
                    <ArrowLeft size={16} /> ย้อนกลับ
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!role}
                    className="inline-flex items-center gap-2 rounded-full bg-inverse px-6 py-2.5 font-display text-sm font-semibold text-white transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ถัดไป <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ---------- สเตป 2: สอนใช้ ---------- */}
            {step === 2 && (
              <motion.div
                key="tutorial"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-center font-display text-xl font-bold tracking-tight text-ink">ใช้ Eddy ยังไง? ✨</h2>
                <p className="mt-1 text-center font-body text-sm text-ink-soft">4 อย่างหลักที่เอ็ดดี้ช่วยคุณได้</p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TIPS.map((t) => {
                    const Icon = t.icon;
                    return (
                      <div key={t.title} className="flex items-start gap-3 rounded-clay border border-eddy-100 bg-surface p-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-clay-sm bg-pastel-blue text-chip-ink">
                          <Icon size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-sm font-bold text-ink">{t.title}</span>
                          <span className="block font-body text-xs text-ink-muted">{t.desc}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 font-display text-sm font-semibold text-ink-soft hover:text-ink">
                    <ArrowLeft size={16} /> ย้อนกลับ
                  </button>
                  <button
                    onClick={finish}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-full bg-inverse px-7 py-2.5 font-display text-sm font-semibold text-white transition-all hover:scale-[1.03] hover:bg-black active:scale-95 disabled:opacity-60"
                  >
                    {loading ? 'กำลังเริ่ม...' : 'เริ่มใช้งาน'} <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </AuthLayout>
  );
}
