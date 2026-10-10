import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const surface = cva('rounded-ui-lg border-(length:--bw) border-line', {
  variants: {
    tone: { base: 'bg-surface shadow-ui', sunken: 'bg-surface-2/60' },
    padded: { true: 'p-4', false: '' },
    interactive: { true: 'transition-colors hover:border-line-strong cursor-pointer', false: '' },
    selected: { true: 'border-accent ring-1 ring-accent', false: '' },
  },
  defaultVariants: { tone: 'base', padded: true, interactive: false, selected: false },
});

type SurfaceProps<T extends React.ElementType> = { as?: T; className?: string; children?: React.ReactNode } & VariantProps<typeof surface> &
  Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

/** Card container for distinct objects. Don't wrap every block in one. */
export function Surface<T extends React.ElementType = 'div'>({ as, tone, padded, interactive, selected, className, ...props }: SurfaceProps<T>) {
  const C = (as ?? 'div') as React.ElementType;
  return <C className={cn(surface({ tone, padded, interactive, selected }), className)} {...props} />;
}
