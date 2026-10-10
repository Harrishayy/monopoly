import { cn } from '@/lib/cn';

export const confidenceWord = (v: number) => (v >= 0.8 ? 'High' : v >= 0.5 ? 'Medium' : 'Low');

/** How sure the agent is, as a word and a bar, and why not more. */
export function ConfidenceMeter({ value, reasons, className }: { value: number; reasons?: string[]; className?: string }) {
  const word = confidenceWord(value);
  const tone = word === 'High' ? 's-resolved' : word === 'Medium' ? 's-escalated' : 's-failed';
  return (
    <div className={cn('grid gap-1.5', tone, className)}>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-ink-2">Confidence</span>
        <span>
          <b className="font-semibold text-(--c)">{word}</b> <span className="font-mono text-[11px] text-ink-2">{Math.round(value * 100)}%</span>
        </span>
      </div>
      <div role="meter" aria-label={`Confidence ${word}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-(--c)" style={{ width: `${Math.max(4, value * 100)}%` }} />
      </div>
      {reasons && reasons.length > 0 && (
        <ul className="grid gap-0.5 text-[12px] text-ink-2">
          {reasons.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
