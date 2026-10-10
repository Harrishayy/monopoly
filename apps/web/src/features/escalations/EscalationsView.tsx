import { PageHeader } from '@/layout';
import { EmptyState } from '@/ui';

export function EscalationsView() {
  return (
    <>
      <PageHeader eyebrow="Queue" title="Escalations" description="Cases the agent handed to a person, sorted by deadline. Each one opens as a handover card." />
      <EmptyState mascot="done" title="Nobody needs to decide anything" body="When the agent stops and asks for a person, its handover card lands here." />
    </>
  );
}
