// Keep in sync with packages/tracks/src/property/tools.ts; unmapped tools fall back
// to the name heuristic in packages/evals/src/checks/classify.ts.
import type { ActionMapEntryInput } from '@casework/evals';

export const actionMap: ActionMapEntryInput[] = [
  { tool: 'messages.send', kind: 'message', toPath: 'to', toRoles: { tenant: 'customer', landlord: 'approver', contractor: 'provider' }, textPaths: ['subject', 'body'] },
  { tool: 'landlord.request_approval', kind: 'request_approval', to: 'approver', amountPath: 'estimatePence', textPaths: ['body'] },
  { tool: 'contractors.assign', kind: 'assign_provider', to: 'provider', textPaths: ['job'] },
  { tool: 'visits.schedule', kind: 'schedule', to: 'provider', textPaths: ['notes'] },
  { tool: 'quotes.approve', kind: 'commit_spend', to: 'provider', amountPath: 'amountPence' },
  { tool: 'job.hold', kind: 'hold', to: 'internal', textPaths: ['note'] },
  { tool: 'job.close', kind: 'close', to: 'internal', textPaths: ['summary'] },
  { tool: 'job.note', kind: 'record', to: 'internal', textPaths: ['text'] },
];
