import type { Policy } from '@casework/core';
import { spendLimit } from '../shared/loader';

export const policy: Policy = {
  rules: [
    spendLimit('logistics.reship_limit', ['reship.create', 'refund.issue'], 15_000, 'Reships and refunds'),
  ],
  mustEscalate: [
    { id: 'logistics.high_value', describe: 'Order value above the auto-resolve limit' },
    { id: 'logistics.repeat_claims', describe: 'Repeated non-delivery claims from one address' },
    { id: 'logistics.customs', describe: 'Customs or legal holds' },
  ],
};
