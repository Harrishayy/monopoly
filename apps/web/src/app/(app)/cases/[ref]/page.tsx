import { CaseView } from '@/features/case';

export const dynamic = 'force-dynamic';

export default async function CasePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return <CaseView caseRef={decodeURIComponent(ref)} />;
}
