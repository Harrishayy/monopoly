import { PageHeader } from '@/layout';
import { EmptyState } from '@/ui';

export function ToolsView() {
  return (
    <>
      <PageHeader eyebrow="Registry" title="Tools" description="Every tool the active track pack exposes, with its success rate, latency and last error." />
      <EmptyState mascot="act" title="No tools registered" body="Add tools to packages/tracks/src/<track>/tools.ts with the add-agent-tool skill." />
    </>
  );
}
