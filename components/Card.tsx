import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  tone?: 'white' | 'pink' | 'yellow' | 'mint' | 'blue' | 'peach';
}

const toneClasses: Record<string, string> = {
  white: 'bg-white',
  pink: 'bg-pastel-pink',
  yellow: 'bg-pastel-yellow',
  mint: 'bg-pastel-mint',
  blue: 'bg-pastel-blue',
  peach: 'bg-pastel-peach',
};

export default function Card({ children, className, tone = 'white' }: CardProps) {
  return (
    <div className={clsx('rounded-clay p-6 shadow-clay', toneClasses[tone], className)}>
      {children}
    </div>
  );
}
