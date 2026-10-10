import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-ui border-(length:--bw) border-transparent transition-[transform,background-color,box-shadow,color] duration-150 active:scale-[.97] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:brightness-110',
        secondary: 'bg-surface text-ink border-line-strong hover:bg-surface-2',
        ghost: 'bg-transparent text-ink-2 hover:text-ink hover:bg-surface-2',
        danger: 'bg-transparent text-bad border-bad/50 hover:bg-bad/10',
      },
      size: {
        sm: 'h-9 px-3 text-[13px]',
        md: 'h-10 px-4 text-sm',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

/** Every clickable action. At most one primary per pane. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
