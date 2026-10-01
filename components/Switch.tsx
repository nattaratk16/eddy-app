'use client';

import { motion } from 'framer-motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  'aria-label'?: string;
}

/** สวิตช์เปิด/ปิดแบบเลื่อน - ใช้แทน checkbox ธรรมดาทุกจุดที่อยากได้ความรู้สึก "ตั้งค่า" มากกว่า "ติ๊กฟอร์ม" */
export default function Switch({ checked, onChange, id, ...aria }: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={aria['aria-label']}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 flex-shrink-0 rounded-full p-0.5 transition-colors duration-200 ${
        checked ? 'bg-gradient-to-r from-eddy-500 to-accent-500' : 'bg-eddy-200'
      }`}
    >
      <motion.span
        className="block h-6 w-6 rounded-full bg-white shadow-clay-sm"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  );
}
