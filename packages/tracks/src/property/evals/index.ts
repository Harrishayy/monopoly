import type { EvalSuiteInput } from '@casework/evals';
import { cases } from '../index';
import { actionMap } from './actions';
import { domainNotes } from './domain';
import { escalationTwins } from './escalation';
import { perturbations } from './perturbations';
import { scenarios } from './scenarios';
import { splits } from './splits';

export const suite: EvalSuiteInput = {
  track: 'property', trackFolder: cases.folder, refPrefix: cases.refPrefix,
  roles: {
    customer: 'Tenant', approver: 'Landlord', provider: 'Contractor',
    internal: 'Agency staff', third_party: 'Third party', unknown: 'Unknown',
  },
  agentSenders: ['^agency', 'northbridge lettings'],
  domainNotes, scenarios, perturbations, escalationTwins, actionMap, splits,
};
