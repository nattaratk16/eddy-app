import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Check } from 'lucide-react';
import { auth } from '@/auth';
import LandingHero from '@/components/LandingHero';
import Card from '@/components/Card';
import FeatureSection from '@/components/landing/FeatureSection';
import CTASection from '@/components/landing/CTASection';
import LandingFooter from '@/components/landing/LandingFooter';
import ScrollProgressBar from '@/components/landing/ScrollProgressBar';
import CountUpNumber from '@/components/landing/CountUpNumber';
import AnimatedBar from '@/components/landing/AnimatedBar';

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  // เลือกไฟล์มาสคอตให้ถูกตั้งแต่ฝั่งเซิร์ฟเวอร์ เพื่อไม่ให้เบราว์เซอร์โหลดทั้ง .webp และ .webm
  // (Safari เล่น VP9+alpha ใน WebM ไม่ได้ ต้องใช้ animated WebP แทน — ดูหมายเหตุใน MascotWave)
  // headers() ทำให้หน้านี้เป็น dynamic แต่ auth() ด้านบนทำให้เป็น dynamic อยู่แล้ว จึงไม่มีต้นทุนเพิ่ม
  const ua = (await headers()).get('user-agent') ?? '';
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);

  return (
    <>
      <ScrollProgressBar />
      <LandingHero isSafari={isSafari} />

      <div className="bg-white">
        <FeatureSection
          icon="/icons/clipboard-check.png"
          title="แตกงานใหญ่เป็นขั้นตอนย่อยให้อัตโนมัติ"
          description="พิมพ์แค่ชื่องาน ที่เหลือให้ AI ช่วยแบ่งเป็นขั้นตอนเล็กๆ ที่ทำได้จริง พร้อมประเมินเวลาที่ต้องใช้ให้เสร็จแต่ละขั้น"
        >
          <Card className="mx-auto w-full max-w-sm">
            <p className="font-display text-sm font-semibold text-ink">เตรียมสอบ Final วิชา AI</p>
            <div className="mt-3 flex flex-col gap-2">
              {['ทบทวนบทที่ 1-3', 'ทำโจทย์ปีก่อน', 'สรุปสูตรสำคัญ'].map((t) => (
                <div key={t} className="flex items-center gap-2 rounded-clay-sm bg-pastel-blue/50 px-3 py-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-eddy-500 text-white">
                    <Check size={12} />
                  </span>
                  <span className="font-body text-xs text-ink-soft">{t}</span>
                </div>
              ))}
            </div>
          </Card>
        </FeatureSection>

        <FeatureSection
          icon="/icons/calendar-add.png"
          title="จัดตารางให้อัตโนมัติ ไม่ชนกับที่มีอยู่แล้ว"
          description="เอ็ดดี้หาช่วงเวลาว่างในปฏิทินของคุณเอง จัดงานลงให้พอดี เชื่อมกับ Google Calendar ได้ด้วย จะได้ไม่ต้องมานั่งเช็คเองทีละวัน"
          reverse
        >
          <Card className="mx-auto w-full max-w-sm">
            <p className="font-display text-sm font-semibold text-ink">วันนี้</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {[
                { time: '09:00', label: 'เรียนวิชา AI', tone: 'bg-pastel-blue' },
                { time: '13:00', label: 'ทำโจทย์ปีก่อน', tone: 'bg-eddy-100' },
                { time: '19:00', label: 'ประชุมกลุ่ม', tone: 'bg-eddy-50' },
              ].map((e) => (
                <div key={e.time} className={`flex items-center gap-3 rounded-clay-sm ${e.tone} px-3 py-2`}>
                  <span className="font-display text-[11px] font-semibold text-ink-soft">{e.time}</span>
                  <span className="font-body text-xs text-ink">{e.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </FeatureSection>

        <FeatureSection
          icon="/icons/people-group.png"
          title="ชวนเพื่อนทำงานกลุ่มได้ในที่เดียว"
          description="แชร์ตารางกับเพื่อนในกลุ่ม ให้ AI ช่วยกระจายงานตามภาระและทักษะของแต่ละคน จะได้ไม่มีใครต้องแบกงานคนเดียว"
        >
          <Card className="mx-auto w-full max-w-sm">
            <p className="font-display text-sm font-semibold text-ink">กลุ่มโปรเจกต์จบ</p>
            <div className="mt-3 flex flex-col gap-2.5">
              {[
                { n: 'มิว', pct: 70, c: 'bg-eddy-500' },
                { n: 'เจน', pct: 45, c: 'bg-eddy-400' },
                { n: 'ปาล์ม', pct: 85, c: 'bg-accent-400' },
              ].map((m) => (
                <div key={m.n} className="flex items-center gap-2">
                  <span className="w-10 flex-shrink-0 font-body text-xs text-ink-soft">{m.n}</span>
                  <div className="h-2 flex-1 rounded-full bg-eddy-50">
                    <AnimatedBar percent={m.pct} className={`h-2 rounded-full ${m.c}`} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </FeatureSection>

        <FeatureSection
          icon="/icons/pie-chart.png"
          title="รู้ทันตัวเองก่อนจะหมดไฟ"
          description="แดชบอร์ดวิเคราะห์ภาระงาน ความเสี่ยงหมดไฟ และช่วงเวลาที่คุณโปรดักทีฟที่สุด ให้คุณวางแผนได้ก่อนจะรับงานเกินตัว"
          reverse
        >
          <Card className="mx-auto w-full max-w-sm">
            <p className="font-display text-sm font-semibold text-ink">ความเสี่ยงหมดไฟ</p>
            <div className="mt-3 flex items-center gap-3">
              <CountUpNumber value={42} className="font-display text-h1 text-ink" />
              <div className="h-2 flex-1 rounded-full bg-eddy-50">
                <AnimatedBar percent={42} className="h-2 rounded-full bg-eddy-400" />
              </div>
            </div>
            <p className="mt-2 font-body text-xs text-ink-muted">ภาระงานปานกลาง ลองเว้นช่วงพักเพิ่มอีกนิด</p>
          </Card>
        </FeatureSection>

        <FeatureSection
          icon="/icons/chat-bubbles.png"
          title="คุยกับเอ็ดดี้ได้ทุกเรื่อง"
          description="ถามเอ็ดดี้เกี่ยวกับตารางของคุณ หรือพิมพ์ข้อความธรรมดาให้แปลงเป็นกิจกรรมในปฏิทินได้ทันที เหมือนมีผู้ช่วยส่วนตัวคอยจดให้"
        >
          <Card className="mx-auto flex w-full max-w-sm flex-col gap-2">
            <div className="self-end rounded-clay-sm bg-eddy-500 px-3 py-2 font-body text-xs text-white">พรุ่งนี้ว่างไหม</div>
            <div className="self-start rounded-clay-sm bg-pastel-blue px-3 py-2 font-body text-xs text-ink">
              ว่างช่วงบ่ายค่ะ 14:00-17:00 เลย!
            </div>
          </Card>
        </FeatureSection>

        <CTASection />
        <LandingFooter />
      </div>
    </>
  );
}
