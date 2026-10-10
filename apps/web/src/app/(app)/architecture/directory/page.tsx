import { DirectoryView } from '@/features/directory';

export const metadata = { title: 'Directory' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <DirectoryView />;
}
