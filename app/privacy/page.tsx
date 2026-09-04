import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import PrivacyPolicyContent from '@/components/PrivacyPolicyContent';

export const metadata = { title: 'นโยบายความเป็นส่วนตัว - Eddy' };

// หน้านี้เก็บไว้เป็นลิงก์ตรงถาวร (เช่นกรอกใน Google OAuth consent screen) แม้ว่าตอนสมัครสมาชิก
// จะเปิดเนื้อหาเดียวกันนี้เป็นป็อปอัปแทนแล้วก็ตาม (ดู components/PrivacyPolicyModal.tsx)
export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#CDE7FB] via-[#E9F4FD] to-white px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Image src="/mascot/eddy-wordmark.png" alt="EDDY" width={900} height={411} className="h-7 w-auto" />
          </Link>
          <Link href="/register" className="flex items-center gap-1.5 font-body text-sm font-semibold text-eddy-600 hover:text-eddy-700">
            <ArrowLeft size={15} /> กลับไปสมัครสมาชิก
          </Link>
        </div>

        <div className="rounded-[24px] border border-white/80 bg-white/90 p-6 shadow-clay backdrop-blur-md sm:p-8">
          <h1 className="font-display text-h1 text-ink">นโยบายความเป็นส่วนตัว</h1>
          <PrivacyPolicyContent />
        </div>
      </div>
    </main>
  );
}
