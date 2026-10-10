import { CostsView } from '@/features/costs';

export const metadata = { title: 'Cost' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <CostsView />;
}
