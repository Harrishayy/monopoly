import { cn } from '@/lib/cn';
import { money } from '@/lib/format';

/** Integer pence as £1,249.00, tabular. */
export function MoneyText({ pence, signed, className }: { pence: number; signed?: boolean; className?: string }) {
  const s = money(Math.abs(pence));
  return <span className={cn('font-mono tabular-nums', pence < 0 && 'text-bad', className)}>{pence < 0 ? `−${s}` : signed && pence > 0 ? `+${s}` : s}</span>;
}
