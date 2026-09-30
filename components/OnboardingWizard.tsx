'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, CalendarDays, ListChecks, MessageCircle, Users } from 'lucide-react';
import SkyBackground from '@/components/SkyBackground';
import OnboardingStepper from '@/components/onboarding/OnboardingStepper';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_EMOJI, type UserRole } from '@/lib/roles';

const ROLES: UserRole[] = ['university', 'working'];

// ป้ายเล็กบอกธีมของแต่ละสเตป - ดึงมาจากภาพอ้างอิงที่ผู้ใช้ส่งมา (แอปแดชบอร์ดโทนม่วง-เขียวมะนาว)
// เอาแค่ "พลัง" ของชิปแคปซูลสีจัด มาปรับให้อยู่ในโทนฟ้า-พาสเทลเดิมของ EDDY ไม่ใช่ก็อปสีตรงๆ
const STEP_KICKER = ['เริ่มต้นกันเลย', 'ทำความรู้จักกัน', 'พร้อมลุยแล้ว'];

const TIPS = [
  { icon: CalendarDays, title: 'ปฏิทินอัจฉริยะ', desc: 'คลิกช่องเวลาเพื่อเพิ่มกิจกรรม เอ็ดดี้ช่วยเช็คเวลาชนให้' },
  { icon: ListChecks, title: 'สิ่งที่ต้องทำ', desc: 'เพิ่มงาน + ให้ AI แตกเป็นขั้นตอนย่อยและจัดลำดับความสำคัญ' },
  { icon: MessageCircle, title: 'คุยกับเอ็ดดี้', desc: 'พิมพ์ "นัดหมอพุธหน้าบ่ายสาม" แล้วเอ็ดดี้เพิ่มลงปฏิทินให้เลย' },
  { icon: Users, title: 'กลุ่ม', desc: 'สร้างกลุ่ม แชร์ตาราง ให้ AI หาเวลาว่างร่วมและกระจายงาน' },
];

// สไลด์เข้า/ออกตามทิศทางจริงที่กำลังไป (เดินหน้า = เด้งจากขวา, ย้อนกลับ = เด้งจากซ้าย)
// ใส่ rotate เล็กน้อยสวนทิศทางให้ความรู้สึก "เหวี่ยง" ไม่ใช่แค่เลื่อนตรงๆ
const stepVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 56 : -56, rotate: dir > 0 ? 4 : -4, scale: 0.96 }),
  center: { opacity: 1, x: 0, rotate: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -56 : 56, rotate: dir > 0 ? -4 : 4, scale: 0.96 }),
};

const tipListVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const tipItemVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 360, damping: 26 } },
};

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  function goTo(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

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
    // เต็มจอไล่เฉดฟ้าแบบเดียวกับ landing/auth แต่ไม่ใช้เชลล์การ์ดแยกซ้าย-ขวาเหมือน login/register อีกต่อไป
    // onboarding เป็นจุดต้อนรับครั้งแรกหลังสมัคร ตั้งใจให้รู้สึกคนละโหมดกับฟอร์ม - อิมเมอร์ซีฟเต็มจอ
    // มาสคอต+ก้อนลอยกระจายทั่วพื้นหลัง ไม่ใช่แค่แผงซ้าย 45%
    <div className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-[#F3F9FF] px-4 py-10 sm:px-6">
      <SkyBackground />

      {/* ก้อนพาสเทลลอยเพิ่ม - กระจายกว้างกว่า AuthLayout เพราะตอนนี้เป็นพื้นหลังเต็มจอ ไม่ใช่แผงแคบๆ */}
      <span className="pointer-events-none absolute left-[6%] top-[14%] hidden h-16 w-16 rotate-6 animate-float rounded-clay bg-pastel-lilac shadow-clay-sm opacity-90 md:block" />
      <span className="pointer-events-none absolute right-[8%] top-[20%] hidden h-11 w-11 animate-floatSlow rounded-full bg-accent-300 shadow-clay-sm opacity-90 md:block" />
      <span className="pointer-events-none absolute bottom-[16%] left-[10%] hidden h-10 w-10 -rotate-6 animate-floatSlow rounded-clay bg-pastel-peach shadow-clay-sm opacity-90 lg:block" />
      <span className="pointer-events-none absolute bottom-[12%] right-[10%] hidden h-12 w-12 animate-float rounded-full bg-pastel-mint-dark shadow-clay-sm opacity-90 lg:block" />

      {/* โลโก้ - ไม่ผูกเป็นลิงก์เหมือนหน้าอื่น (ยังไม่จบ onboarding กดหนีไปก็ถูกเด้งกลับมาอยู่ดี) */}
      <div className="absolute left-5 top-5 z-10 sm:left-8 sm:top-8">
        <Image src="/mascot/eddy-wordmark.png" alt="EDDY" width={900} height={411} className="h-6 w-auto sm:h-7" priority />
      </div>

      <motion.button
        onClick={skip}
        disabled={loading}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="absolute right-5 top-5 z-10 rounded-full bg-surface/80 px-4 py-2 font-display text-sm font-bold text-ink-soft shadow-clay-sm backdrop-blur-sm transition-colors hover:bg-surface hover:text-ink sm:right-8 sm:top-8"
      >
        ข้ามไปก่อน
      </motion.button>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        <div className="relative z-10 mb-7 w-full max-w-sm">
          <OnboardingStepper step={step} />
        </div>

        {/* แสงเรืองนุ่มๆ อมฟ้าแบรนด์อยู่หลังการ์ด - แทนที่จุดสนใจที่มาสคอตเคยให้ไว้ด้วยความรู้สึก
            "การ์ดลอยเปล่งแสง" แบบพรีเมียมแทน ไม่ใช่แค่เงาทึบธรรมดา */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-eddy-400/35 via-accent-300/25 to-pastel-lilac/30 blur-3xl"
        />

        {/* การ์ดป๊อปเข้าตอนโหลดหน้าครั้งแรก - เนื้อหาข้างในสไลด์แยกกันเองตาม AnimatePresence ด้านล่าง
            เงาเข้มกว่าเดิมและอมโทนน้ำเงินแบรนด์ (ไม่ใช่เงาเทาเฉยๆ) - ยืมพลังจากการ์ดลอยเงาหนักๆ
            ในภาพอ้างอิงที่ผู้ใช้ส่งมา แต่คุมสีให้อยู่ในโทนฟ้าเดิมของ EDDY
            ขยายกว้างขึ้น + padding มากขึ้น หลังเอามาสคอตออก ให้เนื้อหาข้างในมีที่หายใจแทน */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.12 }}
          className="w-full overflow-hidden rounded-clay-lg bg-surface p-7 shadow-[0_32px_72px_-16px_rgba(10,93,235,0.4),0_12px_28px_-8px_rgba(31,39,51,0.18)] sm:p-10"
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {/* ---------- สเตป 0: ต้อนรับ ---------- */}
            {step === 0 && (
              <motion.div
                key="welcome"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="text-center"
              >
                <span className="inline-flex items-center rounded-full bg-pastel-blue px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.08em] text-eddy-700">
                  {STEP_KICKER[0]}
                </span>
                <h1 className="mt-4 font-display text-4xl font-bold tracking-tighter text-ink sm:text-5xl">ยินดีต้อนรับสู่ Eddy 🎉</h1>
                <p className="mx-auto mt-3 max-w-md font-body text-base text-ink-soft">
                  มาตั้งค่าเล็กน้อยให้เอ็ดดี้รู้จักคุณกันก่อน จะได้ช่วยจัดตารางและแนะนำได้ตรงกับคุณมากขึ้น (ใช้เวลาแค่ 1 นาที)
                </p>
                <motion.button
                  onClick={() => goTo(1)}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-9 py-4 font-display text-lg font-bold text-white shadow-[0_14px_28px_-10px_rgba(10,93,235,0.5)] hover:brightness-110"
                >
                  เริ่มตั้งค่า <ArrowRight size={20} />
                </motion.button>
              </motion.div>
            )}

            {/* ---------- สเตป 1: เลือกบทบาท ---------- */}
            {step === 1 && (
              <motion.div
                key="role"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              >
                <div className="text-center">
                  <span className="inline-flex items-center rounded-full bg-pastel-lilac px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.08em] text-eddy-700">
                    {STEP_KICKER[1]}
                  </span>
                  <h2 className="mt-4 font-display text-3xl font-bold tracking-tighter text-ink sm:text-4xl">ตอนนี้คุณคือ?</h2>
                  <p className="mt-2 font-body text-base text-ink-soft">
                    เอ็ดดี้จะสร้างหมวดหมู่ปฏิทินและปรับคำแนะนำให้เหมาะกับคุณ
                  </p>
                </div>

                <div className="mt-7 flex flex-col gap-4">
                  {ROLES.map((r) => {
                    const active = role === r;
                    return (
                      <motion.button
                        key={r}
                        onClick={() => setRole(r)}
                        whileHover={{ scale: 1.015, y: -2 }}
                        whileTap={{ scale: 0.985 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                        className={`flex items-center gap-5 rounded-clay-lg border-2 p-5 text-left transition-colors ${
                          active
                            ? 'border-eddy-500 bg-eddy-50 shadow-[0_16px_32px_-12px_rgba(10,93,235,0.4)]'
                            : 'border-eddy-100 bg-surface shadow-clay-sm hover:border-eddy-300'
                        }`}
                      >
                        <motion.span
                          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-3xl transition-colors ${
                            active ? 'bg-gradient-to-br from-eddy-500 to-accent-500' : 'bg-pastel-blue'
                          }`}
                          animate={active ? { scale: [1, 1.2, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          {ROLE_EMOJI[r]}
                        </motion.span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-lg font-bold text-ink">{ROLE_LABELS[r]}</span>
                          <span className="block font-body text-sm text-ink-muted">{ROLE_DESCRIPTIONS[r]}</span>
                        </span>
                        <AnimatePresence>
                          {active && (
                            <motion.span
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-eddy-500 text-white"
                            >
                              <Check size={18} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <motion.button
                    onClick={() => goTo(0)}
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1 font-display text-base font-semibold text-ink-soft hover:text-ink"
                  >
                    <ArrowLeft size={18} /> ย้อนกลับ
                  </motion.button>
                  <motion.button
                    onClick={() => goTo(2)}
                    disabled={!role}
                    whileHover={role ? { scale: 1.04 } : undefined}
                    whileTap={role ? { scale: 0.95 } : undefined}
                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-7 py-3.5 font-display text-base font-bold text-white shadow-[0_14px_28px_-10px_rgba(10,93,235,0.5)] hover:brightness-110 disabled:cursor-not-allowed disabled:from-eddy-200 disabled:to-eddy-200 disabled:opacity-60 disabled:shadow-none"
                  >
                    ถัดไป <ArrowRight size={18} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ---------- สเตป 2: สอนใช้ ---------- */}
            {step === 2 && (
              <motion.div
                key="tutorial"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              >
                <div className="text-center">
                  <span className="inline-flex items-center rounded-full bg-pastel-mint px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.08em] text-eddy-700">
                    {STEP_KICKER[2]}
                  </span>
                  <h2 className="mt-4 font-display text-3xl font-bold tracking-tighter text-ink sm:text-4xl">ใช้ Eddy ยังไง? ✨</h2>
                  <p className="mt-2 font-body text-base text-ink-soft">4 อย่างหลักที่เอ็ดดี้ช่วยคุณได้</p>
                </div>

                <motion.div
                  variants={tipListVariants}
                  initial="hidden"
                  animate="show"
                  className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                  {TIPS.map((t) => {
                    const Icon = t.icon;
                    return (
                      <motion.div
                        key={t.title}
                        variants={tipItemVariants}
                        whileHover={{ scale: 1.04, y: -3 }}
                        className="flex items-start gap-4 rounded-clay-lg border border-eddy-100 bg-surface p-4 shadow-clay-sm transition-shadow hover:shadow-[0_16px_32px_-14px_rgba(10,93,235,0.4)]"
                      >
                        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-eddy-500 to-accent-500 text-white shadow-sm">
                          <Icon size={20} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-base font-bold text-ink">{t.title}</span>
                          <span className="block font-body text-sm text-ink-muted">{t.desc}</span>
                        </span>
                      </motion.div>
                    );
                  })}
                </motion.div>

                <div className="mt-7 flex items-center justify-between">
                  <motion.button
                    onClick={() => goTo(1)}
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1 font-display text-base font-semibold text-ink-soft hover:text-ink"
                  >
                    <ArrowLeft size={18} /> ย้อนกลับ
                  </motion.button>
                  <motion.button
                    onClick={finish}
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.04 } : undefined}
                    whileTap={!loading ? { scale: 0.95 } : undefined}
                    animate={
                      !loading
                        ? { boxShadow: ['0 0 0 0 rgba(10,93,235,0.45)', '0 0 0 12px rgba(10,93,235,0)'] }
                        : undefined
                    }
                    transition={{ boxShadow: { duration: 1.6, repeat: Infinity, ease: 'easeOut' } }}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-8 py-3.5 font-display text-base font-bold text-white hover:brightness-110 disabled:opacity-60"
                  >
                    {loading ? 'กำลังเริ่ม...' : 'เริ่มใช้งาน'} <ArrowRight size={18} />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
