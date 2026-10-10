import { redirect } from 'next/navigation';

/** Escalations live in the inbox as a filter. */
export default function Page() {
  redirect('/inbox?filter=escalated');
}
