'use client';

const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const monthNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

interface TopbarProps {
  userName?: string;
}

export default function Topbar({ userName = 'เพื่อน' }: TopbarProps) {
  const now = new Date();
  const dateLabel = `วัน${dayNames[now.getDay()]}ที่ ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear() + 543}`;

  return (
    <header className="flex animate-fade-in-up flex-col gap-1 pt-8">
      <p className="font-body text-caption font-semibold uppercase tracking-[0.08em] text-ink-soft">{dateLabel}</p>
      <h1 className="font-display text-h1 text-ink">
        สวัสดี, {userName} <span className="text-eddy-500">👋</span>
      </h1>
    </header>
  );
}
