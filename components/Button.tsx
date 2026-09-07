import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

const variantClasses: Record<string, string> = {
  // ธีม Genie: ปุ่มหลักเป็น pill สีดำ
  primary:
    'bg-inverse text-white hover:bg-black hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-eddy-400/50',
  secondary:
    'border border-eddy-200 bg-surface text-ink hover:bg-eddy-50 hover:border-eddy-300',
  ghost: 'bg-transparent text-ink-soft hover:bg-eddy-50 hover:text-ink',
};

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'rounded-full px-6 py-3 font-display font-semibold text-[15px] transition-all duration-150 focus:outline-none focus-visible:outline-none',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
