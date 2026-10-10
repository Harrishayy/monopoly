import { VisuallyHidden as Root } from '@radix-ui/react-visually-hidden';

/** Text for screen readers only, e.g. live-region announcements of run progress. */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <Root>{children}</Root>;
}
