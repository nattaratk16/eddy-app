import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkles, ArrowRight, CalendarDays, ListChecks, Bot } from 'lucide-react';
import { auth } from '@/auth';
import SkyBackground from '@/components/SkyBackground';
import FaceBubble from '@/components/FaceBubble';

const features = [
  { icon: CalendarDays, label: 'ปฏิทินอัจฉริยะ', color: 'bg-pastel-blue text-eddy-700' },
  { icon: ListChecks, label: 'จัดการงาน', color: 'bg-pastel-mint text-eddy-700' },
  { icon: Bot, label: 'ผู้ช่วย AI', color: 'bg-pastel-lilac text-eddy-700' },
];

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-white">
      <SkyBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4">
        {/* Navbar แบบ pill ลอย */}
        <nav className="mx-auto mt-6 flex w-full items-center justify-between rounded-full border border-white/70 bg-white/80 px-3 py-2.5 shadow-clay backdrop-blur-md sm:px-5">
          <Link href="/" className="flex items-center gap-2 pl-1 font-display text-lg font-bold tracking-tight text-ink">
            <Sparkles size={20} className="text-eddy-500" fill="currentColor" />
            EDDY
          </Link>
          <div className="hidden items-center gap-7 font-display text-sm font-medium text-ink-soft md:flex">
            <a href="#features" className="transition-colors hover:text-ink">ฟีเจอร์</a>
            <a href="#features" className="transition-colors hover:text-ink">วิธีใช้งาน</a>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="rounded-full px-3.5 py-2 font-display text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-ink px-4 py-2 font-display text-sm font-semibold text-white transition-all hover:scale-[1.03] hover:bg-black active:scale-95"
            >
              เริ่มใช้งาน
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <span className="mb-6 inline-flex animate-fade-in-up items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-4 py-1.5 font-body text-sm text-ink-soft shadow-clay-sm backdrop-blur">
            <Sparkles size={14} className="text-eddy-500" /> ขับเคลื่อนด้วย Gemini AI
          </span>

          <h1 className="animate-fade-in-up font-display text-4xl font-bold leading-[1.15] tracking-tight text-ink sm:text-5xl md:text-6xl">
            จัดตารางชีวิต งาน
            <br />
            และสิ่งที่ต้องทำ{' '}
            <span className="mx-1 inline-flex -space-x-2 align-middle">
              <FaceBubble bg="bg-pastel-blue" />
              <FaceBubble bg="bg-pastel-peach" />
              <FaceBubble bg="bg-pastel-lilac" />
            </span>
            <br />
            ให้ลงตัวในที่เดียว
          </h1>

          <p className="mt-6 max-w-md animate-fade-in-up font-body text-lg text-ink-soft [animation-delay:80ms]">
            ผู้ช่วย AI ที่ช่วยจัดปฏิทิน วางแผนงาน และเตือนสิ่งที่ต้องทำ ให้ทุกวันของคุณเป็นระเบียบ
          </p>

          <div className="mt-9 flex animate-fade-in-up flex-col items-center gap-3 [animation-delay:160ms] sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 font-display text-base font-semibold text-white shadow-clay transition-all hover:scale-[1.03] hover:bg-black active:scale-95"
            >
              เริ่มต้นใช้งานฟรี
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="font-display text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
            </Link>
          </div>

          {/* ชิปฟีเจอร์ */}
          <div id="features" className="mt-14 flex animate-fade-in-up flex-wrap items-center justify-center gap-3 [animation-delay:240ms]">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="flex items-center gap-2 rounded-full border border-white/80 bg-white/80 py-2 pl-2 pr-4 shadow-clay-sm backdrop-blur"
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${f.color}`}>
                    <Icon size={16} />
                  </span>
                  <span className="font-display text-sm font-semibold text-ink">{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
