/** Keyboard hint. Hidden on touch devices. */
export function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className="hidden gap-0.5 [@media(hover:hover)]:inline-flex">
      {keys.map((k) => (
        <kbd key={k} className="rounded-[3px] border border-line bg-surface px-1.5 font-mono text-[10px] leading-4 text-ink-2">
          {k}
        </kbd>
      ))}
    </span>
  );
}
