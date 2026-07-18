import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-eddy-500 text-white shadow-clay-sm hover:bg-eddy-600 hover:shadow-clay hover:-translate-y-0.5',
  secondary: 'bg-white text-eddy-600 shadow-clay-sm hover:bg-eddy-50 hover:shadow-clay hover:-translate-y-0.5',
  ghost: 'bg-transparent text-ink-soft hover:bg-eddy-50',
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
        'rounded-clay-sm px-6 py-3 font-display font-semibold text-[15px] transition-all duration-150',
        'active:translate-y-0 active:shadow-clay-sm disabled:cursor-not-allowed disabled:opacity-60',
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
