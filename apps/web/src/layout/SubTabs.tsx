'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/** Second-level tabs under a top-level section. The first tab matches its href exactly; the rest by prefix. */
export function SubTabs({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="border-b-(length:--bw) border-line bg-bg px-4 sm:px-6">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto">
        {items.map((t, i) => {
          const active = i === 0 ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-(--bw) inline-flex whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[13.5px] font-medium text-ink-2 hover:text-ink',
                  active && 'border-accent font-semibold text-ink',
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
