import { z } from 'zod';
import type { AgentTool } from '@casework/core';

/**
 * The agency's next-step actions, learned from the example cases (docs/plan/11-property-workflow.md).
 * The organisers supply no live channels, so every action is recorded to an outbox rather than sent.
 * Results say so plainly; nothing here claims a message was delivered.
 */

const Base = z.object({
  channel: z.enum(['email', 'sms', 'call', 'note']).describe('How it goes out. Use "note" for internal actions.'),
  message: z.string().min(1).describe('The exact text to send, the call script, or the internal note.'),
  reason: z.string().min(1).describe('Why this is the right next step now, in one or two sentences.'),
  citations: z.array(z.string()).min(1).describe('Source ids (e.g. "PM-007:event-012") that support the step.'),
  confidence: z.number().min(0).max(1).describe('How sure you are this is the best next step.'),
  remainingWork: z.array(z.string()).describe('What is still open or unconfirmed after this step.'),
});

const WithAmount = Base.extend({
  amountPence: z.number().int().nonnegative().optional().describe('Amount in pence, if the step involves a price.'),
});

export interface OutboxEntry {
  tool: string;
  recipient: string;
  input: unknown;
  idempotencyKey: string;
}

/** Recorded actions for the current process, keyed by idempotency key so retries cannot act twice. */
export const outbox = new Map<string, OutboxEntry>();

function action(name: string, recipient: string, description: string, input: z.ZodType<object>): AgentTool<object, unknown> {
  return {
    name,
    description,
    input,
    effect: 'write',
    recipient,
    async execute(args, ctx) {
      outbox.set(ctx.idempotencyKey, { tool: name, recipient, input: args, idempotencyKey: ctx.idempotencyKey });
      return { recorded: true, recipient, note: 'Recorded to the outbox. No live channel is connected, so nothing was delivered.' };
    },
  };
}

export const tools: AgentTool<any, any>[] = [
  action('landlord.request_approval', 'Landlord',
    'Ask the landlord how to proceed: send our contractor, use their own, or let the tenant do it. Required before any contractor is sent unless the landlord has already approved or given standing consent.',
    Base),
  action('landlord.send_quote', 'Landlord',
    'Send a contractor quote or estimate (or a changed price or scope) to the landlord for approval. Every quote goes to the landlord, whatever the amount.',
    WithAmount),
  action('landlord.update', 'Landlord',
    'Inform the landlord: work done, invoice forwarded, status, tenant fixed it, or an answer to their question.',
    WithAmount),
  action('landlord.chase', 'Landlord', 'Chase the landlord for an overdue reply or decision.', Base),
  action('tenant.ask', 'Tenant',
    'Ask the tenant: clarify the fault, request photos, suggest a safe self-help step, check access or availability, ask how damage happened, or confirm a fix worked.',
    Base),
  action('tenant.update', 'Tenant', 'Acknowledge the tenant, give a status update, or relay a date or instruction.', Base),
  action('tenant.chase', 'Tenant', 'Chase the tenant for an overdue reply (photos, access, confirmation).', Base),
  action('contractor.assign', 'Contractor',
    'Assign a contractor to attend, inspect or quote. Needs landlord approval or standing consent on record. Say whether they may fix on the spot or must quote first.',
    Base),
  action('contractor.instruct', 'Contractor', 'Tell the contractor to go ahead with works the landlord has approved (quote approved).', WithAmount),
  action('contractor.chase', 'Contractor', 'Chase the contractor for a booking, update, quote, completion report, photos or invoice (PDF).', Base),
  action('contractor.update', 'Contractor', 'Give the contractor information they need: tenant contact (with consent), access or keys, dates, landlord decisions.', Base),
  action('case.wait', 'Nobody (hold)',
    'Nothing should be sent now. Put the job on hold with a reason and a recheck date. Use when we are waiting on someone and it is too soon to chase, or when an inbound message needs no reply.',
    Base.extend({ recheckInDays: z.number().int().min(0).max(30).describe('When to look again.') })),
  action('case.close', 'Nobody (close)',
    'Close the job. Only when completion is evidenced, the landlord is informed, and invoice or no-charge is settled.',
    Base),
  {
    name: 'case.escalate',
    description:
      'Hand the job to a person with full context. Use for safety risks, disputes, complaints, deposit or recharge decisions, warranty disputes, unapproved alterations, cost increases, or facts that conflict and block progress.',
    input: Base.extend({
      queue: z.string().describe('Who should pick it up, e.g. "Property manager", "Compliance", "Accounts".'),
      options: z.array(z.string()).min(1).describe('The choices the person has, recommended first.'),
    }),
    effect: 'write',
    recipient: 'Property manager',
    async execute(args: { queue: string }) {
      return { recorded: true, queue: args.queue };
    },
  },
];
