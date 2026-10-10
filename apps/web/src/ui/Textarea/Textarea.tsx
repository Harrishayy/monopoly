'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  autosize?: boolean;
}

/** Multi-line text, e.g. a note on a human decision. A counter shows near maxLength. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, autosize, maxLength, rows = 3, className, value, id, ...props }, ref) => {
  const auto = useId();
  const tid = id ?? auto;
  const len = typeof value === 'string' ? value.length : 0;
  const near = maxLength && len > maxLength * 0.8;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={tid} className="text-[13px] font-semibold">
        {label}
      </label>
      <textarea
        ref={ref}
        id={tid}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${tid}-err` : undefined}
        className={cn(
          'rounded-ui border-(length:--bw) border-line-strong bg-surface px-3 py-2 text-sm placeholder:text-ink-2 disabled:opacity-50 aria-[invalid=true]:border-bad',
          autosize && '[field-sizing:content] min-h-20',
        )}
        {...props}
      />
      <div className="flex justify-between text-[12.5px]">
        <span id={`${tid}-err`} className="text-bad">
          {error}
        </span>
        {near && (
          <span className="font-mono text-ink-2 tabular-nums">
            {len}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
});
Textarea.displayName = 'Textarea';
