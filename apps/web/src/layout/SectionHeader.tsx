/** Heading plus a one-line description inside a page. */
export function SectionHeader({ title, description, actions, id, level = 2 }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; id?: string; level?: 2 | 3 }) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1">
        <H id={id} className={level === 2 ? 'text-xl font-bold tracking-tight' : 'text-base font-bold'}>
          {title}
        </H>
        {description && <p className="max-w-prose text-[13.5px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
