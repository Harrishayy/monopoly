import { TRACK_META } from '@casework/tracks/meta';
import type { TrackId } from '@casework/core';
import { PageHeader, SectionHeader } from '@/layout';
import { money } from '@/lib/format';
import { ACTIVE_TRACK } from '@/server/config';
import { directory } from '@/server/live/directory';
import { Mono } from '@/ui';

function Table({ id, title, description, head, rows }: { id: string; title: string; description?: string; head: string[]; rows: React.ReactNode[][] }) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <SectionHeader id={id} title={title} description={description} />
      <div className="overflow-x-auto rounded-ui-lg border-(length:--bw) border-line bg-surface">
        <table className="w-full text-left text-[13.5px]">
          <thead className="border-b-(length:--bw) border-line text-ink-2">
            <tr>
              {head.map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b-(length:--bw) border-line align-top last:border-0">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-2">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The agency register the agent reads when a known tenant calls or emails. Read-only, fictional seed. */
export function DirectoryView() {
  const d = directory();
  const meta = TRACK_META[ACTIVE_TRACK as TrackId];
  const landlord = (id: string) => d.landlords.find((l) => l.id === id)?.name ?? id;
  const property = (id: string) => d.properties.find((p) => p.id === id)?.address ?? id;
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow={meta.label}
        title="Directory"
        description="Tenancies, landlords and contractors. When a call or email comes from a tenant listed here, the agent gets their tenancy, the landlord and the standing consent limit as a CRM record on the case. Everyone here is fictional; set DEMO_TENANT_EMAIL or DEMO_TENANT_PHONE to take the first tenant's place."
      />
      <Table
        id="tenants"
        title="Tenants"
        head={['Tenant', 'Email', 'Phone', 'Property', 'Since']}
        rows={d.tenants.map((t) => [<b key="n">{t.name}</b>, <Mono key="e">{t.email}</Mono>, <Mono key="p">{t.phone}</Mono>, property(t.propertyId), t.tenancyStart])}
      />
      <Table
        id="properties"
        title="Properties"
        head={['Address', 'Landlord', 'Features']}
        rows={d.properties.map((p) => [<b key="a">{p.address}</b>, landlord(p.landlordId), p.features.join(' · ')])}
      />
      <Table
        id="landlords"
        title="Landlords"
        description="Standing consent is how much we may spend on a repair without asking first."
        head={['Landlord', 'Email', 'Standing consent', 'Notes']}
        rows={d.landlords.map((l) => [<b key="n">{l.name}</b>, <Mono key="e">{l.email}</Mono>, l.consentLimitPence ? `Up to ${money(l.consentLimitPence)}` : 'None: ask every time', l.notes ?? '—'])}
      />
      <Table
        id="contractors"
        title="Contractors"
        head={['Contractor', 'Trade', 'Email', 'Phone']}
        rows={d.contractors.map((c) => [<b key="n">{c.name}</b>, c.trade, <Mono key="e">{c.email}</Mono>, <Mono key="p">{c.phone}</Mono>])}
      />
    </div>
  );
}
