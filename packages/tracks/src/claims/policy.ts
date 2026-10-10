import type { Policy } from '@casework/core';
import { spendLimit } from '../shared/loader';

export const policy: Policy = {
  rules: [
    spendLimit('claims.settle_limit', ['payments.schedule'], 100_000, 'Settlements'),
    {
      id: 'claims.no_payout_before_cover_confirmed',
      describe: 'No payout while the date of loss is disputed',
      appliesTo: ['payments.schedule'],
      check: (call) =>
        (call.args as { coverConfirmed?: boolean })?.coverConfirmed === false
          ? { ok: false, why: 'Cover is not confirmed' }
          : { ok: true },
    },
  ],
  mustEscalate: [
    { id: 'claims.loss_before_inception', describe: 'Date of loss may be before the policy started' },
    { id: 'claims.injury', describe: 'Anyone was injured' },
    { id: 'claims.fraud_signal', describe: 'Fraud indicators are present' },
  ],
};
