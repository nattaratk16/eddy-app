import EddyMascot from '@/components/EddyMascot';

export default function AppLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4">
      <EddyMascot mood="think" size={72} />
      <p className="font-body text-sm text-ink-muted">กำลังโหลด...</p>
    </div>
  );
}
