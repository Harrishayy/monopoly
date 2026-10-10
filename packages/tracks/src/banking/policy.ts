import type { Policy } from '@casework/core';
import { spendLimit } from '../shared/loader';

export const policy: Policy = {
  rules: [
    {
      id: 'banking.no_refund_autonomously',
      describe: 'Refunds always need a person',
      appliesTo: ['refunds.issue'],
      check: () => ({ ok: false, why: 'Refunds need a person' }),
    },
  ],
  mustEscalate: [
    { id: 'banking.account_takeover', describe: 'Signs of account takeover' },
    { id: 'banking.vulnerability', describe: 'Customer shows signs of vulnerability' },
    { id: 'banking.regulated_complaint', describe: 'A complaint with a regulatory deadline' },
  ],
};
