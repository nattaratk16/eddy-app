'use client';

import Image from 'next/image';
import { Crown, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { GroupInfo } from '@/lib/types';

/** แถวสมาชิกหนึ่งคน - ใช้ร่วมกันระหว่างหน้า "ภาพรวม" และหน้า "จัดการกลุ่ม" ของกลุ่ม */
export default function MemberRow({
  m,
  isOwnerView,
  ownerId,
  onRemove,
  pending = false,
}: {
  m: NonNullable<GroupInfo['members']>[number];
  isOwnerView: boolean;
  ownerId: string;
  onRemove: (memberId: string) => void;
  pending?: boolean;
}) {
  const canRemove = (isOwnerView && m.userId !== ownerId) || m.isMe;
  return (
    <div className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
      {m.image ? (
        <Image src={m.image} alt={m.name} width={32} height={32} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
      ) : (
        <span
          className={clsx(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-xs font-bold text-white',
            pending ? 'bg-ink-muted' : 'bg-inverse',
          )}
        >
          {m.name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate font-body text-xs font-semibold text-ink">
          <span className="truncate">{m.name}</span>
          {m.isMe && <span className="flex-shrink-0 font-normal text-ink-muted">(คุณ)</span>}
          {m.role === 'owner' && <Crown size={11} className="flex-shrink-0 text-amber-500" />}
        </p>
        {/* คอลัมน์แคบ - อีเมลยาวกว่าชื่อมาก แสดงเฉพาะคนที่ยังไม่ตอบรับ (ใช้ระบุตัวว่าเชิญใครไป) */}
        {pending && <p className="truncate font-body text-[11px] text-ink-muted">{m.email}</p>}
      </div>
      {canRemove && (
        <button
          onClick={() => onRemove(m.id)}
          aria-label={m.isMe ? 'ออกจากกลุ่ม' : `เอา ${m.name} ออกจากกลุ่ม`}
          className="flex-shrink-0 rounded-full p-1 text-ink-muted dark:bg-pastel-pink-dark/15 transition-colors hover:bg-pastel-pink/40 hover:text-chip-ink"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
