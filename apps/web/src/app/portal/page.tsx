import type { Metadata } from 'next';
import { Portal } from '@/features/portal';

export const metadata: Metadata = { title: 'Tenant Help' };

/** The tenant-facing side: call the voice line or report an issue. Everything lands in the console as a live case. */
export default function PortalPage() {
  return <Portal />;
}
