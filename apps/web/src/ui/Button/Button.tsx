import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../Icon';

export const buttonVariants = cva(
  'btn inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-ui border-(length:--bw) border-transparent transition-[transform,background-color,box-shadow,color,filter] duration-150 active:scale-[.97] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'btn-primary bg-accent text-accent-ink hover:brightness-110',
        secondary: 'btn-secondary bg-surface text-ink border-line-strong hover:bg-surface-2',
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

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: IconName;
  /** Render the child (e.g. a Link) with button styling. */
  asChild?: boolean;
}

/** Every clickable action. At most one primary per pane. Loading keeps its width and sets aria-busy. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, loading, icon, asChild, disabled, children, type, ...props }, ref) => {
  if (asChild)
    return (
      <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </Slot>
    );
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
      ) : (
        icon && <Icon name={icon} size={16} />
      )}
      {children}
    </button>
  );
});
Button.displayName = 'Button';
