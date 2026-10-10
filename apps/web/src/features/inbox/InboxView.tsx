import { TRACK_META } from '@casework/tracks/meta';
import type { TrackId } from '@casework/core';
import { CaseList } from '@/domain/case';
import { Panes } from '@/layout';
import { inboxCases, summarise } from '@/server/cases';
import { ACTIVE_TRACK } from '@/server/config';
import { EmptyState, Kbd } from '@/ui';

export async function InboxView() {
  const meta = TRACK_META[ACTIVE_TRACK as TrackId];
  const cases = (await inboxCases()).map(summarise);
  const noun = meta.vocabulary.case.toLowerCase();
  if (!cases.length) {
    return (
      <EmptyState
        title={`No ${meta.vocabulary.cases.toLowerCase()} yet`}
        body={
          <>
            Point <code className="font-mono">DATA_DIR</code> in <code className="font-mono">.env</code> at a folder of {meta.label} cases (see{' '}
            <code className="font-mono">data/README.md</code>). The track pack&apos;s loader turns each folder into a {noun}, and it appears here.
          </>
        }
      />
    );
  }
  return (
    <Panes
      list={<CaseList cases={cases} noun={meta.vocabulary.cases} label={meta.label} />}
      detail={
        <EmptyState
          title={`Pick a ${noun}`}
          body={
            <div className="grid gap-2">
              <p>
                Open a {noun} to step through its history. At any point you choose, the agent sees only what came before, decides the next step, and you see that next to
                what really happened.
              </p>
              <p className="flex items-center justify-center gap-1.5">
                <Kbd keys={['j']} /> <Kbd keys={['k']} /> move through the list
              </p>
            </div>
          }
        />
      }
    />
  );
}
