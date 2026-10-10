import type { Policy } from '@casework/core';
import { eventNumber } from './events';

/**
 * Rules learned from the 50 example cases. The assessment bars actions whose preconditions are
 * missing (landlord approval, quote approval, completion evidence); these rules check the call itself.
 * There is no agency spending limit in the data: every cost goes to the landlord.
 */
export const policy: Policy = {
  rules: [
    {
      id: 'property.cite_real_sources',
      describe: 'Every action must cite sources that exist in this case',
      appliesTo: [
        'landlord.request_approval', 'landlord.send_quote', 'landlord.update', 'landlord.chase',
        'tenant.ask', 'tenant.update', 'tenant.chase',
        'contractor.assign', 'contractor.instruct', 'contractor.chase', 'contractor.update',
        'case.wait', 'case.close', 'case.escalate',
      ],
      check(call, ctx) {
        const cited = (call.args as { citations?: string[] }).citations ?? [];
        const known = new Set(ctx.case.sources.map((s) => s.id));
        const missing = cited.filter((id) => !known.has(id));
        return missing.length ? { ok: false, why: `Unknown source ids: ${missing.join(', ')}` } : { ok: true };
      },
    },
    {
      id: 'property.instruct_within_quote',
      describe: 'A contractor may only be told to go ahead up to the amount the landlord approved',
      appliesTo: ['contractor.instruct'],
      check(call, ctx) {
        const amount = (call.args as { amountPence?: number }).amountPence;
        if (amount === undefined) return { ok: true };
        const quoted = ctx.case.sources
          .filter((s) => eventNumber(s.id) !== undefined && /quote|estimate/i.test(s.body))
          .flatMap((s) => [...s.body.matchAll(/£\s?(\d[\d,]*)(?:\.(\d{2}))?/g)].map((m) => Number(m[1]!.replace(/,/g, '')) * 100 + Number(m[2] ?? 0)));
        const max = Math.max(0, ...quoted);
        // VAT is often quoted separately, so allow 20% on top of the largest quoted figure.
        return max && amount > max * 1.2 + 100
          ? { ok: false, why: `£${(amount / 100).toFixed(2)} is more than any quoted amount on record (£${(max / 100).toFixed(2)} + VAT)` }
          : { ok: true };
      },
    },
  ],
  mustEscalate: [
    { id: 'property.safety', describe: 'Gas, carbon monoxide, electrical danger, flooding or structural collapse' },
    { id: 'property.legal', describe: 'Solicitor, ombudsman, court, environmental health or other legal threat' },
    { id: 'property.dispute', describe: 'Deposit, recharge, liability, warranty or rent dispute that the agency cannot settle alone' },
    { id: 'property.complaint', describe: 'A landlord or tenant complaint about the service' },
    { id: 'property.alteration', describe: 'An alteration or action the landlord did not approve' },
    { id: 'property.cost_change', describe: 'A price increase, or an invoice above the approved quote' },
  ],
};
