import type { ReactNode } from 'react';

// หัวการ์ดมาตรฐานของโซน "ข้อมูลเชิงลึกและสถิติ" - ไอคอนอยู่ในป้ายวงกลมสีพาสเทล เหมือนแพทเทิร์น
// การ์ดสถิติในบล็อคฮีโร่ด้านบน (bg-pastel-* + text-eddy-700) แทนไอคอนเปล่าๆ วางหน้าตัวอักษร
// เพื่อให้ทั้ง 6 การ์ดในโซนนี้อ่านเป็นชุดเดียวกัน แต่ละใบมีสีประจำตัวของตัวเองแยกแยะง่าย
interface InsightCardHeaderProps {
  icon: ReactNode;
  tone: string;
  title: string;
  description?: string;
}

export default function InsightCardHeader({ icon, tone, title, description }: InsightCardHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-clay-sm ${tone}`}>
        {icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <h2 className="font-display text-h3 text-ink">{title}</h2>
        {description && <p className="mt-0.5 font-body text-caption text-ink-muted">{description}</p>}
      </div>
    </div>
  );
}
