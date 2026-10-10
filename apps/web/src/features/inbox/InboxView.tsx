import { TRACK_META } from '@casework/tracks/meta';
import type { TrackId } from '@casework/core';
import { CaseListItem } from '@/domain/case';
import { Panes } from '@/layout';
import { listCases, summarise } from '@/server/cases';
import { ACTIVE_TRACK } from '@/server/config';
import { EmptyState, Eyebrow } from '@/ui';

export async function InboxView() {
  const meta = TRACK_META[ACTIVE_TRACK as TrackId];
  const cases = (await listCases()).map(summarise);
  if (!cases.length) {
    return (
      <EmptyState
        title={`No ${meta.vocabulary.cases.toLowerCase()} yet`}
        body={
          <>
            Put the synthetic data for <b>{meta.label}</b> in <code className="font-mono">data/{meta.id}/</code>. Each track
            pack&apos;s loader turns it into cases, and they appear here. Change the track with <code className="font-mono">TRACK</code>{' '}
            in <code className="font-mono">.env</code>.
          </>
        }
      />
    );
  }
  return (
    <Panes
      list={
        <div className="grid gap-1 p-2">
          <div className="flex items-center justify-between px-2 pb-1 pt-2">
            <Eyebrow>{meta.label}</Eyebrow>
            <Eyebrow>{cases.length}</Eyebrow>
          </div>
          {cases.map((c) => (
            <CaseListItem key={c.ref} c={c} />
          ))}
        </div>
      }
      detail={<EmptyState title={`Pick a ${meta.vocabulary.case.toLowerCase()}`} body="Its sources, the agent's run and the decision appear here." />}
    />
  );
}
