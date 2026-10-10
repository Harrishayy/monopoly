import { TriangleAlert } from 'lucide-react';
import { Mascot } from '@/domain/mascot';
import { Eyebrow } from '@/ui';
import { PortalPanels } from './PortalPanels';

export interface PortalConfig {
  agency: string;
  email?: string;
  voice: boolean;
}

/** Tenant help in one screen: call the voice line or write in. Everything lands in the console as a live case. */
export function Portal({ config }: { config: PortalConfig }) {
  return (
    // Phones scroll the page like any website; wide screens get a fixed two-panel layout.
    <div className="flex min-h-dvh flex-col bg-bg text-ink lg:h-dvh lg:overflow-hidden">
      <header className="shrink-0 border-b-(length:--bw) border-line bg-surface-2">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Mascot size={30} decorative />
          <div className="grid">
            <span className="font-display text-[15px] font-bold leading-tight">{config.agency}</span>
            <Eyebrow>Tenant help</Eyebrow>
          </div>
          <p className="ml-auto hidden items-center gap-2 text-[13px] md:flex">
            <TriangleAlert size={15} className="shrink-0 text-bad" aria-hidden />
            <span>
              <b>Smell gas?</b> Get out, then call{' '}
              <a className="font-semibold text-bad underline underline-offset-2" href="tel:0800111999">
                0800 111 999
              </a>
              . Danger to life:{' '}
              <a className="font-semibold text-bad underline underline-offset-2" href="tel:999">
                999
              </a>
            </span>
          </p>
        </div>
      </header>

      <p className="flex shrink-0 items-center gap-2 border-b-(length:--bw) border-bad/30 bg-bad/10 px-4 py-2 text-[12.5px] md:hidden">
        <TriangleAlert size={14} className="shrink-0 text-bad" aria-hidden />
        <span>
          <b>Smell gas?</b> Get out, call{' '}
          <a className="font-semibold text-bad underline" href="tel:0800111999">
            0800 111 999
          </a>
          . Danger to life:{' '}
          <a className="font-semibold text-bad underline" href="tel:999">
            999
          </a>
        </span>
      </p>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 sm:px-6 lg:min-h-0 lg:gap-5 lg:py-6">
        <div className="grid shrink-0 gap-1">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-balance sm:text-2xl lg:text-[28px]">Something wrong with your home?</h1>
          <p className="hidden text-[14px] text-ink-2 sm:block">Talk to us now or tell us in writing. Every report gets a reference, and a coordinator follows it up.</p>
        </div>
        <PortalPanels config={config} />
      </main>
    </div>
  );
}
