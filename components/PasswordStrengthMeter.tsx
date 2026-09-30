'use client';

import { getPasswordStrength, type PasswordStrengthLevel } from '@/lib/passwordStrength';

// ใช้พาเลต load.* ชุดเดียวกับกราฟภาระงาน (BurnoutGauge/WorkloadDistributionChart) แทนการตั้งสีใหม่
// - ผ่านการเช็ค CVD/contrast มาแล้วจากตอนออกแบบกราฟ และความหมาย เขียว-ส้ม-แดง ตรงกับ
//   "แข็งแรง-ปานกลาง-คาดเดาง่าย" พอดี (แค่เรียงสลับทิศทางกับ "ภาระงาน" เท่านั้น)
const BAR_CLASS: Record<PasswordStrengthLevel, string> = {
  weak: 'bg-load-full',
  medium: 'bg-load-tight',
  strong: 'bg-load-free',
};

const TEXT_CLASS: Record<PasswordStrengthLevel, string> = {
  weak: 'text-load-full',
  medium: 'text-load-tight',
  strong: 'text-load-free',
};

const FILLED_SEGMENTS: Record<PasswordStrengthLevel, number> = { weak: 1, medium: 2, strong: 3 };

export default function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!strength) return null;

  const filled = FILLED_SEGMENTS[strength.level];

  return (
    <div className="mt-1.5 flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < filled ? BAR_CLASS[strength.level] : 'bg-eddy-100'
            }`}
          />
        ))}
      </div>
      <span className={`flex-shrink-0 font-body text-[11px] font-semibold ${TEXT_CLASS[strength.level]}`}>
        {strength.label}
      </span>
    </div>
  );
}
