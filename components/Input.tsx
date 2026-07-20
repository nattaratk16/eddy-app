import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, className, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-2 block font-display text-sm font-semibold text-ink-soft">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-4 text-ink-muted">{icon}</span>
          )}
          <input
            ref={ref}
            id={id}
            className={clsx(
              'w-full rounded-clay-sm border border-eddy-200 bg-white px-4 py-3 text-ink transition-colors',
              'placeholder:text-ink-muted focus:border-eddy-400 focus:outline-none focus:ring-2 focus:ring-eddy-500/25',
              icon && 'pl-11',
              className
            )}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
