'use client';

import type { CaseSummary } from '@casework/core';
import { TRACK_IDS, TRACK_META } from '@casework/tracks/meta';
import * as D from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { api, useApi } from '@/lib/api';
import { DIRECTIONS, useUi } from '@/state/ui';
import { Icon, toast, type IconName } from '@/ui';

const ROUTES: { href: string; label: string; icon: IconName }[] = [
  { href: '/inbox', label: 'Go to inbox', icon: 'inbox' },
  { href: '/runs', label: 'Go to live runs', icon: 'play' },
  { href: '/escalations', label: 'Go to escalations', icon: 'escalate' },
  { href: '/reality', label: 'Go to Reality Test and eval', icon: 'check' },
  { href: '/tools', label: 'Go to tools and policy', icon: 'tool' },
  { href: '/agents', label: 'Compare the agents', icon: 'decide' },
  { href: '/design', label: 'Open the design reference', icon: 'doc' },
];

/** Jump to a case, run an action, or switch direction. Opens with / or ⌘K. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { track, direction, setDirection } = useUi();
  const meta = TRACK_META[track];
  const { data: cases } = useApi<CaseSummary[]>(open ? '/api/cases' : null);
  const go = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };
  const nextDir = DIRECTIONS[(DIRECTIONS.findIndex((d) => d.id === direction) + 1) % DIRECTIONS.length]!;

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-(--z-palette) bg-ink/40" />
        <D.Content className="palette fixed left-1/2 top-[12vh] z-(--z-palette) w-[min(600px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-ui-lg border-(length:--bw) border-line-strong bg-surface shadow-ui">
          <D.Title className="sr-only">Search and commands</D.Title>
          <D.Description className="sr-only">Type to find a {meta.vocabulary.case.toLowerCase()}, a page or an action.</D.Description>
          <Command label="Search and commands" loop>
            <div className="flex items-center gap-2 border-b-(length:--bw) border-line px-3">
              <Icon name="search" className="text-ink-2" />
              <Command.Input autoFocus placeholder={`Search ${meta.vocabulary.cases.toLowerCase()}, refs, actions…`} className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-2" />
            </div>
            <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-8 text-center text-sm text-ink-2">Nothing matches. Try a ref like PM-007 or a word from the title.</Command.Empty>
              <Command.Group heading={meta.vocabulary.cases}>
                {!cases && <Command.Loading><span className="block px-3 py-2 text-sm text-ink-2">Loading…</span></Command.Loading>}
                {cases?.map((c) => (
                  <Command.Item key={c.ref} value={`${c.ref} ${c.title} ${c.customer.name}`} onSelect={() => go(() => router.push(`/cases/${encodeURIComponent(c.ref)}`))}>
                    <span className="font-mono text-[11.5px] text-ink-2">{c.ref}</span>
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Actions">
                {ROUTES.map((r) => (
                  <Command.Item key={r.href} value={r.label} onSelect={() => go(() => router.push(r.href))}>
                    <Icon name={r.icon} className="text-ink-2" />
                    {r.label}
                  </Command.Item>
                ))}
                <Command.Item
                  value="Run eval rules only score examples"
                  onSelect={() =>
                    go(async () => {
                      try {
                        await api('/api/eval', { method: 'POST', json: { mode: 'rules' } });
                        toast.success('Eval started (rules only)', { description: 'Watch it fill on the Reality Test page.' });
                        router.push('/reality');
                      } catch (e) {
                        toast.error('Could not start the eval', { description: (e as Error).message });
                      }
                    })
                  }
                >
                  <Icon name="play" className="text-ink-2" />
                  Run the eval on example cases (rules only, free)
                </Command.Item>
                <Command.Item value={`Switch direction ${nextDir.name}`} onSelect={() => go(() => setDirection(nextDir.id))}>
                  <Icon name="retry" className="text-ink-2" />
                  Switch look to {nextDir.name}
                </Command.Item>
              </Command.Group>
              <Command.Group heading="Tracks">
                {TRACK_IDS.map((id) => (
                  <Command.Item key={id} value={`track ${TRACK_META[id].label}`} disabled={id !== track} onSelect={() => go(() => {})}>
                    <Icon name={id === track ? 'check' : 'x'} className="text-ink-2" />
                    {TRACK_META[id].label}
                    <span className="ml-auto text-[12px] text-ink-2">{id === track ? 'Active' : 'Set TRACK in .env'}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
