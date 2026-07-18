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
    <header className="flex flex-col gap-1 px-6 pt-8 md:px-10">
      <p className="font-body text-sm text-ink-muted">{dateLabel}</p>
      <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">
        สวัสดี, {userName} 👋
      </h1>
    </header>
  );
}
