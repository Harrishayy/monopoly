import 'server-only';
import { DEFAULT_MODEL, defaultCaller, structured } from '@casework/agents';
import { z } from 'zod';
import { env } from './channels/voice';
import { directory, tenancyFor } from './directory';
import { emitLive } from './intake';
import { getLiveCaseRow, insertOutbound, insertSource, sourcesFor, updateCase } from './store';

/**
 * What happens after a person decides on an escalated live case. The decision goes on the case as a
 * note, then the messages that carry it out are drafted (tenant, landlord, contractor) and held for
 * approval with the right address from the register. Nothing is sent until a person approves it.
 */

const Draft = z.object({
  /** The pack action this message is, e.g. "landlord.update" or "contractor.assign". */
  action: z.string(),
  recipient: z.enum(['Tenant', 'Landlord', 'Contractor']),
  /** Register id (e.g. "CO-01") when the recipient is a contractor, otherwise empty. */
  contractorId: z.string(),
  subject: z.string(),
  message: z.string(),
  /** One line for the approver: why this message, and what it commits the agency to. */
  why: z.string(),
});
const Plan = z.object({ drafts: z.array(Draft).min(1).max(4) });
type Draft = z.infer<typeof Draft>;

const SYSTEM = `You work for a UK letting and property management agency, helping a coordinator act on a decision they have just made about an escalated case.

Write the messages that carry out the decision, one per person who needs to hear about it (tenant, landlord, contractor). Only write messages the decision calls for. Usually that is: the tenant always gets an update; the landlord when the decision says to inform or ask them, or when works need their approval; a contractor when the decision says to arrange attendance or a repair.

Rules:
- Plain British English. Courteous and respectful, especially to landlords. Short paragraphs. No marketing tone.
- In messages to the landlord or contractor, call the tenant "the tenant"; don't use he or she.
- Say exactly what was decided and what happens next. Never invent dates, costs, contractor availability or outcomes. Where something is still to be confirmed, say so.
- For a contractor, pick the best match from the approved contractors by trade and give its id. Include the property address, the issue, how urgent it is, and that the tenant's contact details follow once they consent.
- For a landlord, say what happened, what the agency is doing, and what (if anything) needs their approval. If their standing consent limit covers the work, say the agency is proceeding under it.
- For safety issues (gas, carbon monoxide, electrics, water near electrics), the tenant message repeats the basic safety advice: leave and call the gas emergency line on 0800 111 999 if they smell gas, or 999 if anyone is in danger.
- Format as a short email: a greeting line, two or three short paragraphs, and the sign-off, separated by blank lines.
- These messages go out only after the coordinator approves them. Don't say a booking or visit is confirmed; say it is being arranged.
- Refer to the case reference. End with exactly the sign-off given below. Never sign as an AI.
- The "why" line is for the coordinator approving the message, one sentence.`;

function caseText(caseRef: string) {
  return sourcesFor(caseRef)
    .map((s) => `## ${s.title} (${s.kind}, ${s.receivedAt})\n${s.body}`)
    .join('\n\n');
}

function registerText(contact: string | null | undefined) {
  const d = directory();
  const t = tenancyFor(contact);
  const pounds = (p: number) => `£${(p / 100).toFixed(2)}`;
  return [
    t
      ? `Tenancy on file: tenant ${t.tenant.name}; property ${t.property.address}; landlord ${t.landlord.name}${t.landlord.consentLimitPence ? `, standing consent up to ${pounds(t.landlord.consentLimitPence)}` : ', no standing consent (approves every job)'}${t.landlord.notes ? `; notes: ${t.landlord.notes}` : ''}.`
      : 'No tenancy on file matches this caller, so the landlord is not known from the register. Still write the landlord message if the decision calls for it; the coordinator will add the address.',
    `Approved contractors: ${d.contractors.map((c) => `${c.id} ${c.name} (${c.trade})`).join('; ')}.`,
  ].join('\n');
}

/** Templates for when no model is configured: tenant update always, landlord and contractor when the decision names them. */
function templateDrafts(caseRef: string, title: string, label: string): Draft[] {
  const agency = env('AGENCY_NAME') || 'Northgate Lettings';
  const sign = `Kind regards,\n${agency} team`;
  const out: Draft[] = [
    {
      action: 'tenant.update',
      recipient: 'Tenant',
      contractorId: '',
      subject: `Update on your report: ${title}`,
      message: `Hello,\n\nThank you for reporting "${title}" (reference ${caseRef}). A coordinator has reviewed it and decided to: ${label.charAt(0).toLowerCase()}${label.slice(1)}.\n\nWe will be in touch as soon as we have confirmed the next step. If you smell gas, leave the property and call 0800 111 999. If anyone is in danger, call 999.\n\n${sign}`,
      why: 'Tells the tenant what was decided.',
    },
  ];
  if (/landlord/i.test(label))
    out.push({
      action: 'landlord.update',
      recipient: 'Landlord',
      contractorId: '',
      subject: `Your property: ${title}`,
      message: `Dear landlord,\n\nYour tenant has reported "${title}" (reference ${caseRef}). Our coordinator has decided to: ${label.charAt(0).toLowerCase()}${label.slice(1)}.\n\nWe will confirm the contractor's findings and any costs with you before further work goes ahead.\n\n${sign}`,
      why: 'Informs the landlord, as the decision says.',
    });
  if (/contractor|engineer|gas safe|attend|repair|plumber|electric/i.test(label)) {
    const gas = /gas|boiler|carbon|co alarm/i.test(`${label} ${title}`);
    const c = directory().contractors.find((x) => (gas ? /gas/i.test(x.trade) : /general/i.test(x.trade))) ?? directory().contractors[0]!;
    out.push({
      action: 'contractor.assign',
      recipient: 'Contractor',
      contractorId: c.id,
      subject: `Job request: ${title} [${caseRef}]`,
      message: `Hello ${c.name},\n\nPlease could you attend: ${title} (reference ${caseRef}). Our coordinator has marked this as: ${label}.\n\nWe will send the tenant's contact details and access arrangements once confirmed. Please reply with your earliest availability.\n\n${sign}`,
      why: `Books ${c.name} (${c.trade}).`,
    });
  }
  return out;
}

/** Drafts and queues the messages that carry out a decision. Never throws; failures become a note on the case. */
export async function followThrough(caseRef: string, runId: string, label: string, note?: string): Promise<void> {
  const row = getLiveCaseRow(caseRef);
  // Once per decision: the note doubles as the marker that the follow-through already ran.
  if (!row || sourcesFor(caseRef).some((s) => s.id === `${runId}:decision`)) return;
  const now = new Date().toISOString();
  insertSource(caseRef, {
    id: `${runId}:decision`,
    kind: 'note',
    title: 'Coordinator decision',
    receivedAt: now,
    body: [`Decided by the coordinator: ${label}.`, note && `Note: ${note}`].filter(Boolean).join('\n'),
    meta: { runId, decision: label },
  });
  emitLive({ kind: 'case.updated', caseRef, sourceId: `${runId}:decision` });

  let drafts: Draft[];
  const caller = defaultCaller();
  try {
    if (!caller) throw new Error('no model');
    const plan = await structured(
      caller,
      {
        stage: 'followthrough',
        model: process.env.FOLLOWTHROUGH_MODEL || DEFAULT_MODEL,
        system: SYSTEM,
        content: [
          { type: 'text', text: `# Case ${caseRef}: ${row.title}\n\n${caseText(caseRef)}` },
          { type: 'text', text: `# Register\n${registerText(row.contact)}\n\nSign-off:\nKind regards,\n${env('AGENCY_NAME') || 'Northgate Lettings'} team` },
          { type: 'text', text: `# The coordinator's decision\n${label}${note ? `\nTheir note: ${note}` : ''}\n\nWrite the messages that carry this out.` },
        ],
        schema: Plan,
        maxTokens: 4000,
      },
      [],
    );
    drafts = plan.drafts;
  } catch (err) {
    if (caller) console.error('[followthrough] drafting failed, using templates:', err);
    drafts = templateDrafts(caseRef, row.title, label);
  }

  const d = directory();
  const t = tenancyFor(row.contact);
  drafts.forEach((draft, i) => {
    const contractor = draft.recipient === 'Contractor' ? d.contractors.find((c) => c.id === draft.contractorId) : undefined;
    const address =
      draft.recipient === 'Tenant'
        ? row.contact?.includes('@')
          ? row.contact
          : (t?.tenant.email ?? null)
        : draft.recipient === 'Landlord'
          ? (t?.landlord.email ?? null)
          : (contractor?.email ?? null);
    const who =
      draft.recipient === 'Tenant'
        ? `Tenant (${row.customerName})`
        : draft.recipient === 'Landlord'
          ? `Landlord${t ? ` (${t.landlord.name})` : ''}`
          : `Contractor${contractor ? ` (${contractor.name})` : ''}`;
    const id = `${runId}:follow:${i}`;
    insertOutbound({
      id,
      caseRef,
      runId,
      channel: 'email',
      recipient: who,
      address,
      subject: draft.subject.includes(caseRef) ? draft.subject : `${draft.subject} [${caseRef}]`,
      body: draft.message,
      status: 'awaiting_approval',
      why: [`Carries out the decision "${label}". ${draft.why}`, !address && `No ${draft.recipient.toLowerCase()} address on file: add one before sending.`].filter(Boolean).join(' '),
      createdAt: new Date().toISOString(),
      sentAt: null,
      error: null,
    });
    emitLive({ kind: 'outbound', caseRef, id, status: 'awaiting_approval' });
  });
  updateCase(caseRef, { updatedAt: new Date().toISOString() });
}
