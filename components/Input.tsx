import { InputHTMLAttributes, forwardRef, type ReactNode } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  /** ปุ่ม/ไอคอนฝั่งขวาในตัวช่อง เช่น ปุ่มโชว์/ซ่อนรหัสผ่าน - แทนที่จะแยกลิงก์ไว้ใต้ช่อง */
  rightSlot?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, rightSlot, className, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-2 block font-display text-sm font-semibold text-ink-soft">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3.5 text-ink-muted">{icon}</span>
          )}
          <input
            ref={ref}
            id={id}
            className={clsx(
              'w-full rounded-clay-sm border border-eddy-200 bg-white px-3.5 py-2.5 text-sm text-ink transition-colors',
              'placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25',
              icon && 'pl-10',
              rightSlot && 'pr-10',
              className
            )}
            {...props}
          />
          {rightSlot && <span className="absolute right-3.5 flex items-center text-ink-muted">{rightSlot}</span>}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
