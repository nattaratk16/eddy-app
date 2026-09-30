'use client';

import { Fragment } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import clsx from 'clsx';

const STEPS = [0, 1, 2];

/**
 * หลอดความคืบหน้า 3 ขั้นตอนของ onboarding — วงกลมเลขขั้น + เส้นเชื่อมที่เติมสีไล่ตามขั้นที่ผ่านแล้ว
 * ขั้นที่กำลังทำอยู่มีวงแหวนเต้นเบาๆ ล้อมรอบ (บอกตำแหน่งชัดโดยไม่ต้องอ่านตัวเลข)
 * ขั้นที่ผ่านแล้วสลับตัวเลขเป็นเครื่องหมายถูกแบบหมุนป๊อปเข้า
 */
export default function OnboardingStepper({ step }: { step: number }) {
  return (
    <div className="mx-auto flex w-full max-w-xs items-center" aria-hidden="true">
      {STEPS.map((i) => (
        <Fragment key={i}>
          <div className="relative flex-shrink-0">
            {i === step && (
              <motion.span
                className="absolute inset-0 rounded-full bg-eddy-500"
                animate={{ scale: [1, 1.55], opacity: [0.35, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <div
              className={clsx(
                'relative flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-bold shadow-sm transition-colors duration-300',
                i < step
                  ? 'bg-brand-green text-white'
                  : i === step
                    ? 'bg-gradient-to-br from-eddy-500 to-accent-500 text-white'
                    : 'bg-eddy-100 text-ink-muted shadow-none',
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {i < step ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Check size={17} />
                  </motion.span>
                ) : (
                  <motion.span key="num" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    {i + 1}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {i < STEPS.length - 1 && (
            <div className="mx-2 h-1.5 flex-1 overflow-hidden rounded-full bg-eddy-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-eddy-500 to-accent-500"
                initial={false}
                animate={{ width: i < step ? '100%' : '0%' }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
