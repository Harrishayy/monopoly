import { CaseView } from '@/features/case';

export const dynamic = 'force-dynamic';

export default async function CasePage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ run?: string; cut?: string }> }) {
  const [{ ref }, q] = await Promise.all([params, searchParams]);
  const cut = Number(q.cut);
  return <CaseView caseRef={decodeURIComponent(ref)} run={q.run} cut={Number.isInteger(cut) && cut > 0 ? cut : undefined} />;
}
