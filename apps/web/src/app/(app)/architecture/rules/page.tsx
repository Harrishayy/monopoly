import { RulesView } from '@/features/rules';

export const metadata = { title: 'Rules' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <RulesView />;
}
