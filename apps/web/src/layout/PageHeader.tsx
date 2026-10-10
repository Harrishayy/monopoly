import { Eyebrow } from '@/ui';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-8">
      <div className="grid gap-2">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="max-w-prose text-sm text-ink-2">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
