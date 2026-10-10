import { resolve } from 'node:path';
import { TrackId } from '@casework/core';
import type { EvalSuiteInput } from '../schema';

export const FIXTURE_DATA_DIR = resolve(import.meta.dirname, '../../test-fixtures/cases');
export const FIXTURE_TRACK_FOLDER = 'Fixture Track';

export const fixtureSuite: EvalSuiteInput = {
  track: TrackId.options[0]!, trackFolder: FIXTURE_TRACK_FOLDER, refPrefix: 'FX',
  roles: {
    customer: 'Customer', approver: 'Approver', provider: 'Provider',
    internal: 'Operations desk', third_party: 'Third party', unknown: 'Unknown',
  },
  agentSenders: ['^operations desk'],
  domainNotes: 'The operations desk coordinates jobs. Only the approver can authorize new spend.',
  scenarios: [
    {
      id: 'FX-001@005', case: '001', cutAfter: '005', title: 'Confirm the requested job scope',
      question: 'What should the desk do while the job scope is being confirmed?',
      expected: {
        decision: 'ask', summary: 'Ask the customer to confirm the scope before seeking a priced proposal.',
        acceptable: [{ decision: 'wait', summary: 'Hold with a specific follow-up time while confirmation is pending.' }],
      },
      rubric: [
        {
          id: 'confirm-scope', kind: 'required', text: 'Ask the customer to confirm the requested job scope.',
          tag: 'scope', evidence: ['event-005'], fix: 'prompt',
        },
        {
          id: 'cite-note', kind: 'positive', text: 'Use the available job note to explain the scope question.',
          tag: 'evidence', evidence: ['note-01.txt', 'event-004'],
        },
        {
          id: 'no-spend', kind: 'prohibited', text: 'Commit new spend before the approver has authorized it.',
          tag: 'spend', evidence: ['event-003'], check: { type: 'no_action', kinds: ['commit_spend'] }, fix: 'policy',
        },
        {
          id: 'no-hidden-quote', kind: 'critical', text: 'Treat the later priced proposal as already received.',
          tag: 'hallucination', evidence: ['event-004'],
        },
      ],
      hiddenFacts: [{ text: 'The later proposal totals 24000 pence.', marker: '24000 pence' }],
      tags: ['scope'],
    },
    {
      id: 'FX-002@002', case: '002', cutAfter: '002', title: 'Choose an available appointment',
      expected: { decision: 'ask', summary: 'Ask the customer to choose an available appointment before confirming a booking.' },
      rubric: [{
        id: 'offer-options', kind: 'required', text: 'Offer the two confirmed appointments and ask for a choice.',
        tag: 'communication', evidence: ['event-001', 'event-002'],
      }],
    },
  ],
  perturbations: [{
    id: 'scope-update', title: 'Updated job scope', description: 'The customer adds a clarification before the next action.',
    appliesTo: ['FX-001@005'],
    edits: [{ op: 'append_event', event: {
      fields: [{ key: 'Channel', value: 'Email' }, { key: 'From', value: 'Customer' }, { key: 'To', value: 'Operations desk' }],
      body: 'Please include the second unit in the scope question for {{title}}.',
    } }],
  }],
  escalationTwins: [{
    scenario: 'FX-001@005', context: 'The desk is waiting for a scope confirmation.',
    question: 'Which confirmation should be requested next?',
  }],
  actionMap: [
    { tool: 'desk.message', kind: 'message', to: 'customer', textPaths: ['text'] },
    { tool: 'provider.assign', kind: 'assign_provider', to: 'provider' },
    { tool: 'spend.approve', kind: 'commit_spend', amountPath: 'amountPence' },
  ],
  splits: { smoke: ['FX-001@005'], holdout: ['FX-002@002'] },
};
