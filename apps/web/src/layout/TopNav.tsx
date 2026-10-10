'use client';

import { TRACK_META } from '@casework/tracks/meta';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Mascot } from '@/domain/mascot';
import { TrackSwitcher } from '@/domain/settings';
import { useApi } from '@/lib/api';
import type { NavCounts, RunSummary } from '@/lib/api-types';
import { cn } from '@/lib/cn';
import { useHotkeys } from '@/lib/hooks';
import { useUi } from '@/state/ui';
import { Avatar, Count, Kbd } from '@/ui';
import { CommandPalette } from './CommandPalette';
import './shell.css';

type CountKey = keyof NavCounts;
const TABS: { href: string; label: string; count?: CountKey }[] = [
  { href: '/inbox', label: 'Inbox', count: 'cases' },
  { href: '/runs', label: 'Live runs', count: 'running' },
  { href: '/escalations', label: 'Escalations', count: 'escalations' },
  { href: '/reality', label: 'Reality Test' },
  { href: '/tools', label: 'Tools' },
];

/** Brand with the live mascot, route tabs with counts, search (/ or ⌘K), track and operator. */
export function TopNav() {
  const pathname = usePathname();
  const track = useUi((s) => s.track);
  const meta = TRACK_META[track];
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data: counts } = useApi<NavCounts>('/api/counts', { poll: true, intervalMs: 4000 });
  const { data: runs } = useApi<RunSummary[]>('/api/runs', { poll: true, intervalMs: 2500 });
  const live = runs?.find((r) => !r.done);
  const mascot = live?.mascot ?? 'idle';
  useHotkeys({ '/': () => setPaletteOpen(true), 'mod+k': () => setPaletteOpen((o) => !o) });

  return (
    <header className="shell-nav sticky top-0 z-(--z-nav) flex flex-wrap items-center gap-x-5 gap-y-2 border-b-(length:--bw) border-line bg-bg px-4 py-2.5">
      <Link href="/inbox" className="flex items-center gap-2 self-center font-display text-[15px] font-bold">
        <Mascot state={mascot} size={30} />
        Casework
      </Link>
      <nav aria-label="Main" className="nav-tabs flex flex-wrap gap-0.5">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`) || (t.href === '/inbox' && pathname.startsWith('/cases'));
          const n = t.count ? (counts?.[t.count] ?? 0) : 0;
          const label = t.label;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              aria-label={n ? `${label}, ${n}` : undefined}
              className={cn('nav-tab inline-flex items-center gap-1.5 rounded-ui px-3 py-1.5 text-[13.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink', active && 'font-semibold text-ink')}
            >
              {label}
              <Count value={n} className="nav-n rounded-ui" />
            </Link>
          );
        })}
      </nav>
      <div className="nav-right ml-auto flex items-center gap-2.5 self-center">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-ui border-(length:--bw) border-line bg-surface px-2.5 text-[13px] text-ink-2 hover:border-line-strong"
          aria-label="Search and commands (press / or Command K)"
        >
          <Search size={15} aria-hidden />
          <span className="hidden sm:inline">Search {meta.vocabulary.cases.toLowerCase()}, refs, actions</span>
          <Kbd keys={['/']} />
        </button>
        <TrackSwitcher value={track} />
        <Link href="/agents" aria-current={pathname.startsWith('/agents') ? 'page' : undefined} className="hidden rounded-ui px-2 py-1.5 text-[13px] text-ink-2 hover:text-ink aria-[current=page]:text-ink sm:inline">
          Agents
        </Link>
        <Avatar name="Operator" />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
