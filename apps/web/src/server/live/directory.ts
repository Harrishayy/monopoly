import 'server-only';
import { getLiveCaseRow, insertSource, sourcesFor } from './store';

/**
 * The agency's register: who lives where, who owns it, how much the landlord lets us spend
 * without asking, and which contractors we use. A real agency would read this from its CRM;
 * here it is a small fictional seed. Every person, address and number below is made up.
 *
 * To put yourself in the demo, set DEMO_TENANT_EMAIL and/or DEMO_TENANT_PHONE in .env: they
 * replace the first tenant's contact details, so a call or email from you matches a tenancy.
 */

export interface Landlord {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Repairs we may instruct without asking first, in pence. 0 means always ask. */
  consentLimitPence: number;
  notes?: string;
}

export interface Property {
  id: string;
  address: string;
  landlordId: string;
  /** Appliances and features the agent may need to know about. */
  features: string[];
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  tenancyStart: string;
}

export interface Contractor {
  id: string;
  name: string;
  trade: string;
  email: string;
  phone: string;
}

export interface Directory {
  landlords: Landlord[];
  properties: Property[];
  tenants: Tenant[];
  contractors: Contractor[];
}

const SEED: Directory = {
  landlords: [
    { id: 'LL-01', name: 'Priya Example', email: 'priya.landlord@example.com', phone: '+44 7700 900101', consentLimitPence: 30_000, notes: 'Prefers email. Happy for us to use our contractors.' },
    { id: 'LL-02', name: 'Gareth Sample', email: 'gareth.landlord@example.com', phone: '+44 7700 900102', consentLimitPence: 0, notes: 'Wants to approve every job and often uses his own plumber.' },
    { id: 'LL-03', name: 'Hollow Lane Holdings Ltd', email: 'lettings@hollowlane.example', phone: '+44 7700 900103', consentLimitPence: 50_000 },
  ],
  properties: [
    { id: 'PR-01', address: 'Flat 2, 12 Elm Road, Testford TF1 2AB', landlordId: 'LL-01', features: ['Combi boiler (gas)', 'Electric shower', 'Smoke and CO alarms fitted'] },
    { id: 'PR-02', address: '7 Mill Lane, Testford TF3 9CD', landlordId: 'LL-02', features: ['Garden', 'Gas hob', 'Oil-free storage heaters'] },
    { id: 'PR-03', address: 'Apartment 14, Quay House, Testford TF2 4EF', landlordId: 'LL-03', features: ['Communal boiler (managed by block)', 'Lift', 'Concierge'] },
  ],
  tenants: [
    { id: 'TN-01', name: 'Alex Demo', email: 'alex.tenant@example.com', phone: '+44 7700 900201', propertyId: 'PR-01', tenancyStart: '2025-09-01' },
    { id: 'TN-02', name: 'Sam Placeholder', email: 'sam.tenant@example.com', phone: '+44 7700 900202', propertyId: 'PR-02', tenancyStart: '2024-03-15' },
    { id: 'TN-03', name: 'Jordan Fictional', email: 'jordan.tenant@example.com', phone: '+44 7700 900203', propertyId: 'PR-03', tenancyStart: '2026-01-10' },
  ],
  contractors: [
    { id: 'CO-01', name: 'Testford Heating & Plumbing', trade: 'Gas, heating and plumbing (Gas Safe)', email: 'jobs@testford-heating.example', phone: '+44 7700 900301' },
    { id: 'CO-02', name: 'Bright Spark Electrical', trade: 'Electrical (NICEIC)', email: 'office@brightspark.example', phone: '+44 7700 900302' },
    { id: 'CO-03', name: 'Handy Fix Maintenance', trade: 'General repairs, doors, locks, damp', email: 'bookings@handyfix.example', phone: '+44 7700 900303' },
  ],
};

/**
 * The register, with demo contact details swapped in from .env: the first tenant (Alex Demo) gets
 * DEMO_TENANT_EMAIL / DEMO_TENANT_PHONE, and that tenant's landlord gets DEMO_LANDLORD_EMAIL, so an
 * approved landlord message lands in a real inbox during a demo.
 */
export function directory(): Directory {
  const email = process.env.DEMO_TENANT_EMAIL?.trim();
  const phone = process.env.DEMO_TENANT_PHONE?.trim();
  const landlordEmail = process.env.DEMO_LANDLORD_EMAIL?.trim();
  if (!email && !phone && !landlordEmail) return SEED;
  const [first, ...rest] = SEED.tenants;
  const landlordId = SEED.properties.find((p) => p.id === first!.propertyId)?.landlordId;
  return {
    ...SEED,
    tenants: [{ ...first!, ...(email ? { email } : {}), ...(phone ? { phone } : {}) }, ...rest],
    landlords: SEED.landlords.map((l) => (landlordEmail && l.id === landlordId ? { ...l, email: landlordEmail } : l)),
  };
}

const digits = (s: string) => s.replace(/\D/g, '').slice(-10);

/** The tenant whose email or phone number matches, if any. */
export function findTenant(contact: string | null | undefined): Tenant | undefined {
  if (!contact) return undefined;
  const d = directory();
  if (contact.includes('@')) return d.tenants.find((t) => t.email.toLowerCase() === contact.trim().toLowerCase());
  const n = digits(contact);
  return n.length >= 9 ? d.tenants.find((t) => digits(t.phone) === n) : undefined;
}

export interface Tenancy {
  tenant: Tenant;
  property: Property;
  landlord: Landlord;
}

export function tenancyFor(contact: string | null | undefined): Tenancy | undefined {
  const tenant = findTenant(contact);
  if (!tenant) return undefined;
  const d = directory();
  const property = d.properties.find((p) => p.id === tenant.propertyId);
  const landlord = property && d.landlords.find((l) => l.id === property.landlordId);
  return property && landlord ? { tenant, property, landlord } : undefined;
}

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/**
 * Adds the CRM record to a live case once, when the contact matches a tenancy, so the agent
 * knows who is calling, where they live, who the landlord is and the standing consent limit.
 * Unknown contacts get nothing: the agent has to ask who they are.
 */
export function attachCrm(caseRef: string, contact: string | null | undefined, receivedAt: string) {
  const id = `${caseRef}:crm`;
  if (sourcesFor(caseRef).some((s) => s.id === id)) return;
  const t = tenancyFor(contact);
  if (!t) return;
  const d = directory();
  const body = [
    `Tenant: ${t.tenant.name} (${t.tenant.id}), email ${t.tenant.email}, phone ${t.tenant.phone}. Tenancy started ${t.tenant.tenancyStart}.`,
    `Property: ${t.property.address} (${t.property.id}). Features: ${t.property.features.join('; ')}.`,
    `Landlord: ${t.landlord.name} (${t.landlord.id}), email ${t.landlord.email}, phone ${t.landlord.phone}.`,
    t.landlord.consentLimitPence > 0
      ? `Standing consent: the landlord lets us instruct repairs up to ${pounds(t.landlord.consentLimitPence)} without asking first.`
      : 'Standing consent: none. The landlord must approve every job before a contractor is sent.',
    t.landlord.notes ? `Landlord notes: ${t.landlord.notes}` : '',
    `Approved contractors: ${d.contractors.map((c) => `${c.name} (${c.trade})`).join('; ')}.`,
  ]
    .filter(Boolean)
    .join('\n');
  const before = new Date(new Date(receivedAt).getTime() - 1000).toISOString();
  insertSource(caseRef, { id, kind: 'crm', title: `CRM record: ${t.tenant.name}, ${t.property.address}`, receivedAt: before, body, meta: { tenantId: t.tenant.id, landlordId: t.landlord.id } });
}

/** Where a message to this recipient on this case should go, from the register. */
export function addressFor(caseRef: string, recipient: string): string | null {
  const row = getLiveCaseRow(caseRef);
  const who = recipient.toLowerCase();
  const t = tenancyFor(row?.contact);
  // A caller's reply goes to the email on their tenancy; otherwise back to whatever they used.
  if (who.startsWith('tenant')) return row?.contact?.includes('@') ? row.contact : (t?.tenant.email ?? row?.contact ?? null);
  if (who.startsWith('landlord')) return t?.landlord.email ?? null;
  return null;
}
