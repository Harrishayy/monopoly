'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { SegmentedControl } from '@/ui';
import { CallPanel } from './CallPanel';
import type { PortalConfig } from './Portal';
import { ReportForm } from './ReportForm';

/**
 * Call and write side by side on wide screens. Narrow screens switch between them; both stay
 * mounted so a live call keeps going while the tenant looks at the form.
 */
export function PortalPanels({ config }: { config: PortalConfig }) {
  const [tab, setTab] = useState<'call' | 'write'>('call');
  return (
    <>
      <SegmentedControl
        label="How do you want to reach us?"
        className="w-full shrink-0 lg:hidden"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'call', label: 'Call us' },
          { value: 'write', label: 'Write to us' },
        ]}
      />
      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className={cn('lg:h-full lg:min-h-0', tab !== 'call' && 'hidden lg:block')}>
          <CallPanel enabled={config.voice} agency={config.agency} onWrite={() => setTab('write')} />
        </div>
        <div className={cn('lg:h-full lg:min-h-0', tab !== 'write' && 'hidden lg:block')}>
          <ReportForm email={config.email} />
        </div>
      </div>
    </>
  );
}
