import { redirect } from 'next/navigation';

/** Approvals live in the inbox as a filter; each one is reviewed on its case. */
export default function Page() {
  redirect('/inbox?filter=approval');
}
