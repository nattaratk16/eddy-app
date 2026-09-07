import Link from 'next/link';
import Image from 'next/image';

export default function LandingFooter() {
  return (
    <footer className="border-t border-eddy-100 bg-surface px-5 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <Image src="/mascot/eddy-wordmark.png" alt="EDDY" width={900} height={411} className="h-6 w-auto opacity-80" />
        <p className="font-body text-xs text-ink-muted">
          © {new Date().getFullYear() + 543} EDDY — โครงงานปริญญานิพนธ์ ภาควิชาวิศวกรรมคอมพิวเตอร์ ·{' '}
          <Link href="/privacy" className="font-semibold text-eddy-600 hover:text-eddy-700">
            นโยบายความเป็นส่วนตัว
          </Link>
        </p>
      </div>
    </footer>
  );
}
