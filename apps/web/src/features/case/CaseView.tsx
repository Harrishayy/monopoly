import { notFound } from 'next/navigation';
import { CaseListItem } from '@/domain/case';
import { Panes } from '@/layout';
import { getCase, listCases, summarise } from '@/server/cases';
import { Eyebrow, StatusChip } from '@/ui';
import { RunPanel } from './RunPanel';

export async function CaseView({ caseRef }: { caseRef: string }) {
  const c = await getCase(caseRef);
  if (!c) notFound();
  const all = (await listCases()).map(summarise);
  return (
    <Panes
      list={
        <div className="grid gap-1 p-2">
          {all.map((s) => (
            <CaseListItem key={s.ref} c={s} selected={s.ref === c.ref} />
          ))}
        </div>
      }
      detail={
        <div className="grid content-start gap-6 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-ink-2">{c.ref}</span>
              <StatusChip status={c.status} />
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{c.title}</h1>
            <p className="mt-1 text-sm text-ink-2">{c.customer.name}</p>
          </div>
          <div className="grid gap-2">
            <Eyebrow>Sources</Eyebrow>
            <ul className="flex flex-wrap gap-2">
              {c.sources.map((s) => (
                <li key={s.id} className="rounded-ui border-(length:--bw) border-line bg-surface px-2.5 py-1.5 text-[12.5px]">
                  <b className="font-semibold">{s.title}</b> <span className="font-mono text-[11px] text-ink-2">{s.kind}</span>
                </li>
              ))}
            </ul>
          </div>
          <RunPanel caseRef={c.ref} />
        </div>
      }
      aside={
        <div className="grid gap-3 p-5">
          <Eyebrow>Agent decision</Eyebrow>
          <p className="text-sm text-ink-2">The outcome, the reason, and any actions the agent refused appear here when the run finishes.</p>
        </div>
      }
    />
  );
}
