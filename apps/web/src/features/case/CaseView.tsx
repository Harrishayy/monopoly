import { TRACK_META } from '@casework/tracks/meta';
import type { TrackId } from '@casework/core';
import { notFound } from 'next/navigation';
import { CaseList } from '@/domain/case';
import { getCase, inboxCases, summarise } from '@/server/cases';
import { ACTIVE_TRACK } from '@/server/config';
import { CaseWorkspace } from './CaseWorkspace';
import { LiveCaseWorkspace } from './LiveCaseWorkspace';

export async function CaseView({ caseRef, run, cut }: { caseRef: string; run?: string; cut?: number }) {
  const c = await getCase(caseRef);
  if (!c) notFound();
  const meta = TRACK_META[ACTIVE_TRACK as TrackId];
  const all = (await inboxCases()).map(summarise);
  const list = <CaseList cases={all} selectedRef={c.ref} noun={meta.vocabulary.cases} label={meta.label} />;
  if (c.ref.startsWith('LIVE-')) return <LiveCaseWorkspace c={c} vocabulary={meta.vocabulary} list={list} />;
  return (
    <CaseWorkspace c={c} initialRun={run} initialCut={cut} vocabulary={meta.vocabulary} list={<CaseList cases={all} selectedRef={c.ref} noun={meta.vocabulary.cases} label={meta.label} />} />
  );
}
