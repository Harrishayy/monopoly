import Link from 'next/link';
import { EmptyState } from '@/ui';

export default function NotFound() {
  return (
    <EmptyState
      mascot="esc"
      title="Nothing at this address"
      body="The case or page may have moved, or the ref is mistyped."
      action={
        <Link href="/inbox" className="font-semibold text-accent underline">
          Back to the inbox
        </Link>
      }
    />
  );
}
