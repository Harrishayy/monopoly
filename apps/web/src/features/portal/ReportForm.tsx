'use client';

import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Button, CopyButton, Eyebrow, Icon, Input, SegmentedControl, Surface, Textarea } from '@/ui';

type Urgency = 'routine' | 'urgent' | 'emergency';
const EMPTY = { name: '', contact: '', address: '', issue: '', details: '', urgency: 'routine' as Urgency };

/** The written report. Lands in the console as a live case, the same as a call or an email. */
export function ReportForm({ email }: { email?: string }) {
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'done' | 'error'; ref?: string; error?: string }>({ kind: 'idle' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: form.contact.includes('@') ? 'email' : 'note',
          contact: form.contact || undefined,
          name: form.name || undefined,
          title: form.issue,
          body: [
            `Reported on the tenant portal.`,
            form.address && `Property: ${form.address}`,
            `Issue: ${form.issue}`,
            form.urgency !== 'routine' && `Urgency (tenant's account): ${form.urgency}`,
            form.details && `Details: ${form.details}`,
          ]
            .filter(Boolean)
            .join('\n'),
          meta: { address: form.address, urgency: form.urgency },
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { caseRef?: string };
      if (!res.ok || !body.caseRef) throw new Error('We could not save that. Please try again, or call us.');
      setState({ kind: 'done', ref: body.caseRef });
    } catch (err) {
      setState({ kind: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  const emailLine = email && (
    <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-2">
      <Icon name="email" size={14} className="shrink-0" />
      <span className="truncate">
        Or email{' '}
        <a href={`mailto:${email}`} className="font-semibold text-accent underline underline-offset-2">
          {email}
        </a>
      </span>
    </p>
  );

  if (state.kind === 'done')
    return (
      <Surface as="section" className="flex flex-col justify-center gap-3 p-5 sm:p-6 lg:h-full" role="status" aria-labelledby="h-report">
        <Eyebrow tone="accent">Report received</Eyebrow>
        <h2 id="h-report" className="text-xl font-bold tracking-tight sm:text-2xl">
          Your reference is <span className="whitespace-nowrap font-mono">{state.ref}</span>
        </h2>
        <p className="text-[14px] text-ink-2">A coordinator will review it and get back to you. Quote the reference if you contact us again.</p>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={state.ref!} label="Copy reference" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setForm(EMPTY);
              setState({ kind: 'idle' });
            }}
          >
            Report something else
          </Button>
        </div>
      </Surface>
    );

  return (
    <Surface as="form" padded={false} onSubmit={submit} className="flex flex-col lg:h-full lg:overflow-hidden" aria-labelledby="h-report">
      <div className="grid shrink-0 gap-1 border-b-(length:--bw) border-line px-4 py-3.5 sm:px-5">
        <Eyebrow>Prefer to write?</Eyebrow>
        <h2 id="h-report" className="text-xl font-bold tracking-tight">
          Report an issue
        </h2>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="grid shrink-0 gap-3 sm:grid-cols-2">
          <Input label="Your name" value={form.name} onChange={set('name')} required autoComplete="name" />
          <Input label="Phone or email" value={form.contact} onChange={set('contact')} required autoComplete="email" inputMode="email" />
          <Input label="Property address" value={form.address} onChange={set('address')} required autoComplete="street-address" />
          <Input label="What’s wrong?" placeholder="e.g. Boiler not heating" value={form.issue} onChange={set('issue')} required maxLength={120} />
        </div>
        <div className="grid shrink-0 gap-1.5">
          <span className="text-[13px] font-semibold" aria-hidden>
            How urgent is it?
          </span>
          <SegmentedControl
            label="How urgent is it?"
            className="w-full sm:w-auto sm:justify-self-start"
            value={form.urgency}
            onChange={(v) => setForm((f) => ({ ...f, urgency: v as Urgency }))}
            options={[
              { value: 'routine', label: 'Can wait' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'emergency', label: 'Emergency' },
            ]}
          />
          {form.urgency === 'emergency' && (
            <p className="flex items-start gap-2 text-[13px] text-bad">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
              Danger to people right now? Call the emergency line at the top as well.
            </p>
          )}
        </div>
        <Textarea label="Details" value={form.details} onChange={set('details')} rows={3} maxLength={2000} placeholder="Since when, how bad, what you’ve tried, when we can get access" />
        {state.kind === 'error' && (
          <p role="alert" className="text-[13px] text-bad">
            {state.error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-x-4 gap-y-2.5 border-t-(length:--bw) border-line px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <Button type="submit" variant="primary" loading={state.kind === 'sending'} className="h-11 sm:h-auto">
          <Icon name="arrow" size={16} />
          Send report
        </Button>
        {emailLine}
      </div>
    </Surface>
  );
}
