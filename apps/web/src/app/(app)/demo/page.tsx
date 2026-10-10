import { DemoView } from '@/features/demo';
import { prepareVideoDemo } from '@/server/live/demo-video';

export const metadata = { title: 'Video run' };
export const dynamic = 'force-dynamic';

export default function DemoPage() {
  const state = prepareVideoDemo();
  return <DemoView initial={state} />;
}
