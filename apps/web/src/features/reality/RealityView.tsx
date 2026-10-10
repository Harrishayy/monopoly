import { PageHeader } from '@/layout';
import { EmptyState } from '@/ui';

export function RealityView() {
  return (
    <>
      <PageHeader eyebrow="Unseen cases" title="Reality Test" description="Run a batch of cases unattended and review every outcome. Results are written to ANSWERS/." />
      <EmptyState mascot="think" title="No batch has run yet" body="Run pnpm reality --track <track> --in <folder> from the repo root. Starting a batch from here is next on the list." />
    </>
  );
}
