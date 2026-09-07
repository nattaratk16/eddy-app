'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

/**
 * ระบบแจ้งเตือนแบบเดียวกันทั้งแอป (มุมขวาล่าง, จางหาย ~3.5 วิ)
 * ก่อนหน้านี้แต่ละหน้าเขียน feedback เอง (บางที่ใช้ข้อความเขียว/แดงฝังในหน้า บางที่ไม่มีเลย)
 * เรียกผ่าน useToast() จากที่ไหนก็ได้ที่อยู่ใต้ <ToastProvider> (ครอบทั้งแอปใน app/providers.tsx แล้ว)
 */
type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}
interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLE: Record<ToastTone, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: 'bg-pastel-mint text-chip-ink' },
  error: { icon: XCircle, className: 'bg-pastel-pink text-chip-ink' },
  info: { icon: Info, className: 'bg-pastel-blue text-chip-ink' },
};

const AUTO_DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // นับ id เองแบบง่ายๆ (แค่ในเบราว์เซอร์ฝั่งเดียว ไม่ต้อง unique ข้ามเซสชัน) - useRef กันรีเซ็ตตอน re-render
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-xs flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const { icon: Icon, className } = TONE_STYLE[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={clsx(
                  'pointer-events-auto flex items-start gap-2.5 rounded-clay-sm px-4 py-3 shadow-clay-pop',
                  className,
                )}
              >
                <Icon size={18} className="mt-0.5 flex-shrink-0" />
                <p className="flex-1 font-body text-sm">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="ปิดการแจ้งเตือน"
                  className="flex-shrink-0 opacity-60 transition-opacity hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast ต้องถูกเรียกภายใน <ToastProvider> (ครอบไว้แล้วใน app/providers.tsx)');
  return ctx;
}
