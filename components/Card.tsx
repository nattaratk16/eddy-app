import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  tone?: 'white' | 'pink' | 'yellow' | 'mint' | 'blue' | 'peach';
}

// โทนขาว = เส้นขอบบางสีฟ้าจาง (คลีนพรีเมียม); โทนพาสเทล = ขอบสีเดียวกับพื้นให้ดูเนียน
const toneClasses: Record<string, string> = {
  white: 'bg-surface border-eddy-100',
  pink: 'bg-pastel-pink border-pastel-pink-dark/30',
  yellow: 'bg-pastel-yellow border-pastel-yellow-dark/30',
  mint: 'bg-pastel-mint border-pastel-mint-dark/30',
  blue: 'bg-pastel-blue border-pastel-blue-dark/30',
  peach: 'bg-pastel-peach border-pastel-peach-dark/30',
};

export default function Card({ children, className, tone = 'white' }: CardProps) {
  return (
    <div className={clsx('rounded-clay border p-6 shadow-clay', toneClasses[tone], className)}>
      {children}
    </div>
  );
}
