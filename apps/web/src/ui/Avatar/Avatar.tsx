import { Mascot } from '@/domain/mascot';
import { cn } from '@/lib/cn';

/** A person (initials or image) or the agent (mini mascot). */
export function Avatar({ name, src, kind = 'human', size = 28, className }: { name: string; src?: string; kind?: 'human' | 'agent'; size?: number; className?: string }) {
  const box = cn('inline-grid shrink-0 place-items-center overflow-hidden rounded-full border-(length:--bw) border-line bg-surface-2', className);
  if (kind === 'agent')
    return (
      <span className={box} style={{ width: size, height: size }} title={name}>
        <Mascot state="idle" size={size - 4} decorative />
        <span className="sr-only">{name}</span>
      </span>
    );
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className={box} />;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <span className={cn(box, 'font-mono text-[11px] font-semibold text-ink-2')} style={{ width: size, height: size }} role="img" aria-label={name} title={name}>
      {initials}
    </span>
  );
}
