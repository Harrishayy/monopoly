import { SubTabs } from '@/layout';

const TABS = [
  { href: '/architecture', label: 'Overview' },
  { href: '/architecture/rules', label: 'Rules' },
  { href: '/architecture/tools', label: 'Tools' },
  { href: '/architecture/costs', label: 'Cost' },
  { href: '/architecture/directory', label: 'Directory' },
];

/** How the system works and what it costs: one top-level tab, five views. */
export default function ArchitectureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubTabs label="Architecture" items={TABS} />
      {children}
    </>
  );
}
