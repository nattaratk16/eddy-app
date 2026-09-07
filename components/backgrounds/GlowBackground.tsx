// พื้นหลังแสงเรืองพาสเทลลอยไหว (glow blobs) — สว่าง โปร่ง สดใส เข้ากับธีมฟ้า Genie
// เบา (CSS ล้วน ไม่ใช้ WebGL) ตรึงด้านบน จางหายลงล่าง ไม่รบกวนการอ่าน
const blob = (color: string) => ({
  background: `radial-gradient(circle at center, ${color} 0%, transparent 68%)`,
});

export default function GlowBackground() {
  const fade = 'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)';
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[72vh] overflow-hidden"
      style={{ maskImage: fade, WebkitMaskImage: fade }}
    >
      {/* ฟ้าอมคราม */}
      <div
        className="absolute -left-[6%] -top-[18%] h-[52vw] w-[52vw] animate-blob-a rounded-full opacity-70 dark:opacity-[0.20] blur-3xl"
        style={blob('#A9D4FF')}
      />
      {/* ม่วงลาเวนเดอร์ */}
      <div
        className="absolute left-[30%] -top-[24%] h-[48vw] w-[48vw] animate-blob-c rounded-full opacity-65 dark:opacity-[0.18] blur-3xl"
        style={blob('#CDBEFF')}
      />
      {/* มิ้นต์ */}
      <div
        className="absolute right-[2%] -top-[16%] h-[46vw] w-[46vw] animate-blob-b rounded-full opacity-60 dark:opacity-[0.16] blur-3xl"
        style={blob('#AEEBD2')}
      />
      {/* พีชอ่อน (แต้มอุ่นให้ไม่เย็นเกิน) */}
      <div
        className="absolute left-[52%] -top-[10%] h-[34vw] w-[34vw] animate-blob-a rounded-full opacity-45 dark:opacity-[0.12] blur-3xl"
        style={blob('#FFD8BE')}
      />
    </div>
  );
}
