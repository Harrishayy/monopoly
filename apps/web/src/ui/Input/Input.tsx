import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../Icon';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  hint?: string;
  error?: string;
  prefix?: IconName;
  suffix?: React.ReactNode;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  /** Classes for the <input> itself (the outer className styles the field wrapper). */
  inputClassName?: string;
}

export const fieldClass =
  'flex h-10 items-center gap-2 rounded-ui border-(length:--bw) border-line-strong bg-surface px-3 text-sm text-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent has-[:disabled]:opacity-50 has-[[aria-invalid=true]]:border-bad';

/** Single-line text field. The label is always there; errors replace the hint. */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, hint, error, prefix, suffix, hideLabel, className, inputClassName, id, ...props }, ref) => {
  const auto = useId();
  const inputId = id ?? auto;
  const help = error ?? hint;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={inputId} className={cn('text-[13px] font-semibold', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className={fieldClass}>
        {prefix && <Icon name={prefix} size={16} className="text-ink-2" />}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={help ? `${inputId}-help` : undefined}
          className={cn('min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-2 read-only:text-ink-2', inputClassName)}
          {...props}
        />
        {suffix}
      </div>
      {help && (
        <p id={`${inputId}-help`} className={cn('text-[12.5px]', error ? 'text-bad' : 'text-ink-2')}>
          {help}
        </p>
      )}
    </div>
  );
});
Input.displayName = 'Input';
