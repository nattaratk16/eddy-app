// ฉากหลังธีม "ท้องฟ้า" สไตล์ Genie: เมฆขาวฟู + ประกายดาว + รูปทรงพาสเทลลอยเบาๆ
// ใช้ CSS animation ล้วน (ไม่ต้องเป็น client component) วางทับบนพื้นไล่เฉดฟ้าของหน้า

function Cloud({ className = '', scale = 1 }: { className?: string; scale?: number }) {
  return (
    <div className={`absolute ${className}`} style={{ transform: `scale(${scale})` }} aria-hidden="true">
      <div className="relative">
        <div className="h-14 w-32 rounded-full bg-surface" />
        <div className="absolute -top-7 left-5 h-20 w-20 rounded-full bg-surface" />
        <div className="absolute -top-5 right-4 h-16 w-16 rounded-full bg-surface" />
        <div className="absolute -top-2 left-1/2 h-14 w-24 -translate-x-1/2 rounded-full bg-surface" />
      </div>
    </div>
  );
}

function Sparkle({ className = '', color = '#7FB9F0', size = 22 }: { className?: string; color?: string; size?: number }) {
  return (
    <svg
      className={`absolute ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 0c.8 7.3 3.9 10.4 12 12-8.1 1.6-11.2 4.7-12 12-.8-7.3-3.9-10.4-12-12 8.1-1.6 11.2-4.7 12-12Z"
        fill={color}
      />
    </svg>
  );
}

export default function SkyBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* เมฆขาวฟู */}
      <Cloud className="left-[-3%] top-[16%] opacity-90 animate-floatSlow" scale={1.1} />
      <Cloud className="right-[-2%] top-[10%] opacity-95 animate-float" scale={1.3} />
      <Cloud className="left-[10%] bottom-[6%] opacity-80 animate-float" scale={0.9} />
      <Cloud className="right-[8%] bottom-[10%] opacity-85 animate-floatSlow" scale={1.05} />

      {/* ประกายดาว */}
      <Sparkle className="left-[22%] top-[24%] animate-float" color="#7FB9F0" size={26} />
      <Sparkle className="right-[26%] top-[30%] animate-floatSlow" color="#C9B3FF" size={18} />
      <Sparkle className="left-[30%] bottom-[26%] animate-floatSlow" color="#FFC6A3" size={16} />
      <Sparkle className="right-[20%] bottom-[30%] animate-float" color="#94EBC0" size={22} />
      <Sparkle className="left-[46%] top-[12%] animate-float" color="#7FB9F0" size={14} />

      {/* รูปทรงพาสเทลลอย */}
      <div className="absolute left-[14%] top-[40%] h-10 w-10 rotate-12 rounded-clay bg-pastel-yellow shadow-clay-sm animate-float" />
      <div className="absolute right-[14%] top-[46%] h-8 w-8 rounded-full bg-pastel-pink shadow-clay-sm animate-floatSlow" />
      <div className="absolute left-[40%] bottom-[16%] h-9 w-9 -rotate-6 rounded-clay bg-pastel-mint shadow-clay-sm animate-floatSlow" />
    </div>
  );
}
