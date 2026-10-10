import type { Policy } from '@casework/core';
import { spendLimit } from '../shared/loader';

export const policy: Policy = {
  rules: [
    spendLimit('property.spend_limit', ['contractors.confirm'], 30_000, 'Contractor spend'),
  ],
  mustEscalate: [
    { id: 'property.safety', describe: 'Gas, electrical or structural safety risk' },
    { id: 'property.vulnerable_occupant', describe: 'Vulnerable occupant without heat, water or access' },
    { id: 'property.dispute', describe: 'Deposit, legal or rent dispute' },
  ],
};
