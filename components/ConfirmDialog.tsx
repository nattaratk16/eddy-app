'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import Modal from '@/components/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** ข้อความอธิบายว่าจะเกิดอะไรขึ้น */
  message: string;
  /** รายการผลกระทบ (เช่น ขั้นตอนย่อยที่จะหายไปด้วย) - ไม่ส่งมาก็ได้ */
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = การกระทำที่ย้อนไม่ได้ (ค่าเริ่มต้น) */
  tone?: 'danger' | 'normal';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

/**
 * กล่องยืนยันก่อนทำสิ่งที่ย้อนกลับไม่ได้
 * แยกเป็นคอมโพเนนต์เพราะจะได้ใช้ซ้ำได้ทั้งหน้า To-do และที่อื่นในอนาคต
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  details,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  tone = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [working, setWorking] = useState(false);

  async function run() {
    setWorking(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setWorking(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="flex items-start gap-3">
        <span className="relative flex-shrink-0">
          {/* วงแหวนเต้นเบาๆ รอบไอคอน - เฉพาะโทน danger ให้รู้สึกว่า "ต้องอ่านก่อนกด" โดยไม่ต้องใช้คำเตือนเพิ่ม */}
          {tone === 'danger' && (
            <motion.span
              className="absolute inset-0 rounded-full bg-brand-red"
              animate={{ scale: [1, 1.5], opacity: [0.35, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <motion.span
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.05 }}
            className={clsx(
              'relative grid h-9 w-9 place-items-center rounded-full',
              tone === 'danger' ? 'bg-pastel-pink text-chip-ink' : 'bg-eddy-50 text-eddy-600'
            )}
          >
            <AlertTriangle size={18} />
          </motion.span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-body text-sm text-ink">{message}</p>
          {details && details.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {details.map((d, i) => (
                <motion.li
                  key={d}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-start gap-1.5 font-body text-xs text-ink-soft"
                >
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-ink-muted" />
                  {d}
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <motion.button
          type="button"
          onClick={run}
          disabled={working}
          whileHover={!working ? { scale: 1.04 } : undefined}
          whileTap={!working ? { scale: 0.96 } : undefined}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          className={clsx(
            'rounded-clay-sm px-4 py-2 font-display text-caption font-semibold text-white shadow-clay-sm hover:brightness-110 disabled:opacity-60',
            tone === 'danger' ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 'bg-gradient-to-r from-eddy-500 to-accent-500'
          )}
        >
          {working ? 'กำลังทำ...' : confirmLabel}
        </motion.button>
        <motion.button
          type="button"
          onClick={onClose}
          disabled={working}
          whileHover={!working ? { scale: 1.04 } : undefined}
          whileTap={!working ? { scale: 0.96 } : undefined}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          className="rounded-clay-sm bg-eddy-50 px-4 py-2 font-display text-caption font-semibold text-ink-muted transition-colors hover:bg-eddy-100 disabled:opacity-60"
        >
          {cancelLabel}
        </motion.button>
      </div>
    </Modal>
  );
}
