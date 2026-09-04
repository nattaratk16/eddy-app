'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import EddyMascot, { type EddyMood } from './EddyMascot';
import Card from './Card';

/**
 * สถานะ "ยังไม่มีข้อมูล" แบบเดียวกันทั้งแอป (มาสคอต + หัวข้อ + คำอธิบาย + ปุ่มชวนทำต่อ)
 * ก่อนหน้านี้แต่ละหน้า (Todo/Groups/Dashboard) เขียนแพทเทิร์นนี้แยกกันเอง หน้าตาเลยไม่ตรงกัน
 * (ขนาดมาสคอต, มีหัวข้อไหม, สีปุ่ม) - รวมมาไว้ที่เดียวให้แก้ทีเดียวอัปเดตทั้งแอป
 */
interface EmptyStateAction {
  label: string;
  icon?: ReactNode;
  /** อย่างใดอย่างหนึ่ง: href = ไปหน้าอื่น, onClick = ทำอะไรในหน้าเดิม (เช่น เปิด modal) */
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  mood?: EddyMood;
  /** 'compact' = แทรกในลิสต์/การ์ดที่มีอยู่แล้ว (Todo, Dashboard), 'full' = การ์ดเดี่ยวเต็มพื้นที่ (Groups) - ห่อ Card ให้อัตโนมัติ */
  size?: 'compact' | 'full';
  /** ปุ่มหลัก (ไล่สี eddy->accent) */
  action?: EmptyStateAction;
  /** ปุ่มรอง (ขอบบาง) - ใช้ตอนมีทางเลือกที่สองที่สำคัญพอกัน เช่น "เข้าร่วมด้วยรหัส" คู่กับ "สร้างกลุ่ม" */
  secondaryAction?: EmptyStateAction;
  className?: string;
}

function ActionButton({ action, variant }: { action: EmptyStateAction; variant: 'primary' | 'secondary' }) {
  const className =
    variant === 'primary'
      ? 'inline-flex h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-eddy-500 to-accent-500 px-5 font-display text-caption font-semibold text-white shadow-clay-sm transition-all hover:brightness-110 active:scale-[0.97]'
      : 'inline-flex h-10 items-center gap-1.5 rounded-full border border-eddy-200 bg-white px-5 font-display text-caption font-semibold text-ink-soft transition-colors hover:bg-eddy-50';

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.icon}
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.icon}
      {action.label}
    </button>
  );
}

export default function EmptyState({ title, description, mood = 'happy', size = 'compact', action, secondaryAction, className }: EmptyStateProps) {
  const children = (
    <>
      <EddyMascot mood={mood} size={size === 'full' ? 72 : 64} float={false} />
      <p className={size === 'full' ? 'font-display text-h3 text-ink' : 'font-body text-body text-ink-soft'}>{title}</p>
      {description && <p className="max-w-sm font-body text-sm text-ink-muted">{description}</p>}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action && <ActionButton action={action} variant="primary" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="secondary" />}
        </div>
      )}
    </>
  );

  // ห่อ Card เอง เฉพาะ 'full' - Card มี p-6 ของตัวเองอยู่แล้ว เลยไม่ซ้อน div เพิ่มอีกชั้นเพื่อกัน padding ทับกัน
  if (size === 'full') {
    return <Card className={`flex flex-col items-center gap-3 py-12 text-center ${className ?? ''}`}>{children}</Card>;
  }
  return <div className={`flex flex-col items-center gap-3 py-8 text-center ${className ?? ''}`}>{children}</div>;
}
