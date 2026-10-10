import { PageHeader } from '@/layout';
import { EmptyState } from '@/ui';

export function LiveRunsView() {
  return (
    <>
      <PageHeader eyebrow="Live" title="Live runs" description="Every agent run in progress, each as a compact live trace." />
      <EmptyState mascot="idle" title="Nothing running" body="Start a run from any case. It appears here while the agent works." />
    </>
  );
}
