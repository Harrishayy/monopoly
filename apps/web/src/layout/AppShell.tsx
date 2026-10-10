import { LiveBridge } from '@/domain/live';
import { TopNav } from './TopNav';

/** Nav on top; each route decides its own panes (list / detail / decision). */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-ui focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <TopNav />
      <LiveBridge />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
