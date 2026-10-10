'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { Mascot } from '@/domain/mascot';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/runs', label: 'Live runs' },
  { href: '/escalations', label: 'Escalations' },
  { href: '/reality', label: 'Reality Test' },
  { href: '/tools', label: 'Tools' },
];

/** Brand, live mascot, route tabs, search trigger. Counts arrive once the case API is wired. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-(--z-nav) flex flex-wrap items-center gap-5 border-b-(length:--bw) border-line bg-bg px-4 py-2.5">
      <Link href="/inbox" className="flex items-center gap-2 font-display text-[15px] font-bold">
        <Mascot state="idle" size={30} decorative />
        Casework
      </Link>
      <nav aria-label="Main" className="flex flex-wrap gap-0.5">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`) || (t.href === '/inbox' && pathname.startsWith('/cases'));
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-ui px-3 py-1.5 text-[13.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink',
                active && 'bg-accent-soft font-semibold text-ink',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-ui border-(length:--bw) border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink-2 sm:flex"
          aria-label="Search cases (press /)"
        >
          <Search size={15} aria-hidden />
          Search cases, people, refs
          <kbd className="rounded-[3px] border border-line px-1.5 font-mono text-[10px]">/</kbd>
        </button>
        <Link href="/design" className="rounded-ui px-2 py-1.5 text-[13px] text-ink-2 hover:text-ink">
          Design
        </Link>
      </div>
    </header>
  );
}
