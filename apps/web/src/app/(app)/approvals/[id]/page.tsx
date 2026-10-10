import { redirect } from 'next/navigation';
import { getOutbound } from '@/server/live/store';

/** Old approval links open the case's review tab. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = getOutbound(decodeURIComponent(id));
  redirect(o ? `/cases/${encodeURIComponent(o.caseRef)}?tab=review` : '/inbox?filter=approval');
}
