import Card from '@/components/Card';
import ThemeToggle from '@/components/theme/ThemeToggle';

// ธีมเก็บไว้ใน localStorage ของเบราว์เซอร์ ไม่ใช่ในฐานข้อมูล จึงไม่ต้อง auth/query อะไร
// (ตั้งใจให้เป็นค่าต่อเครื่อง - จอคอมกับมือถือตั้งคนละแบบได้)
export default function SettingsAppearancePage() {
  return (
    <Card>
      <h1 className="font-display text-h3 text-ink">การแสดงผล</h1>
      <p className="mt-1 font-body text-caption text-ink-muted">
        เลือกธีมของแอป — &quot;ตามระบบ&quot; จะสลับให้เองตามที่ตั้งไว้ในเครื่อง
      </p>

      <div className="mt-5">
        <p className="mb-2 font-display text-caption font-semibold text-ink-soft">ธีม</p>
        <ThemeToggle />
      </div>

      <p className="mt-5 font-body text-caption text-ink-muted">
        ค่านี้จำไว้เฉพาะในเบราว์เซอร์ที่ใช้อยู่ เปิดจากเครื่องอื่นจะเริ่มที่ &quot;ตามระบบ&quot; ใหม่
      </p>
    </Card>
  );
}
