import { InboxView } from '@/features/inbox';

export const metadata = { title: 'Inbox' };
export const dynamic = 'force-dynamic';

export default function InboxPage() {
  return <InboxView />;
}
