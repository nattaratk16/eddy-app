import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'gradient' | 'secondary' | 'soft' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

// ปุ่มมาตรฐานของ Eddy — คุมขนาด/ระยะ/น้ำหนัก/มุมมนให้เป็นชุดเดียวกันทั้งแอป
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-black shadow-clay-sm',
  gradient: 'bg-gradient-to-r from-eddy-500 to-accent-500 text-white hover:brightness-110 shadow-clay-sm',
  secondary: 'border border-eddy-200 bg-white text-ink hover:bg-eddy-50',
  soft: 'bg-eddy-50 text-eddy-700 hover:bg-eddy-100',
  ghost: 'text-ink-soft hover:bg-eddy-50',
  danger: 'bg-pastel-coral-dark text-white hover:brightness-95 shadow-clay-sm',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3.5 text-caption',
  md: 'h-10 gap-2 px-5 text-body',
  lg: 'h-12 gap-2 px-7 text-body-lg',
};

const iconSize: Record<Size, number> = { sm: 14, md: 16, lg: 18 };

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', leftIcon, rightIcon, loading, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-display font-semibold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={iconSize[size]} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export default Button;
