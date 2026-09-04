import { redirect } from 'next/navigation';

// /settings ไม่มีเนื้อหาของตัวเอง - ส่งต่อไปแท็บแรกเสมอ
export default function SettingsIndexPage() {
  redirect('/settings/profile');
}
