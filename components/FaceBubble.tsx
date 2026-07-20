// เปลือกลูกโป่งหน้ายิ้มสไตล์ Genie - ใช้แทนมาสคอต (ดีไซน์คลีน เผื่อใส่มาสคอตใหม่ทีหลัง)
interface FaceBubbleProps {
  /** คลาสสีพื้น เช่น 'bg-pastel-blue' */
  bg: string;
  /** คลาสกำหนดขนาด (ค่าเริ่มต้นขนาดใหญ่สำหรับหัวเรื่อง) */
  className?: string;
}

export default function FaceBubble({ bg, className = 'h-12 w-12 md:h-14 md:w-14' }: FaceBubbleProps) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full ring-4 ring-white ${bg} ${className}`}>
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" aria-hidden="true">
        <circle cx="8.5" cy="10" r="1.7" fill="#1F2733" />
        <circle cx="15.5" cy="10" r="1.7" fill="#1F2733" />
        <path d="M8 14.5c1.2 1.6 6.8 1.6 8 0" stroke="#1F2733" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}
