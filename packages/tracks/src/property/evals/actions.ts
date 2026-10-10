// Keep in sync with packages/tracks/src/property/tools.ts; unmapped tools fall back
// to the name heuristic in packages/evals/src/checks/classify.ts.
import type { ActionMapEntryInput } from '@casework/evals';

const text = ['message'];

export const actionMap: ActionMapEntryInput[] = [
  { tool: 'landlord.request_approval', kind: 'request_approval', to: 'approver', textPaths: text },
  { tool: 'landlord.send_quote', kind: 'request_approval', to: 'approver', amountPath: 'amountPence', textPaths: text },
  { tool: 'landlord.update', kind: 'message', to: 'approver', textPaths: text },
  { tool: 'landlord.chase', kind: 'message', to: 'approver', textPaths: text },
  { tool: 'tenant.ask', kind: 'message', to: 'customer', textPaths: text },
  { tool: 'tenant.update', kind: 'message', to: 'customer', textPaths: text },
  { tool: 'tenant.chase', kind: 'message', to: 'customer', textPaths: text },
  { tool: 'contractor.assign', kind: 'assign_provider', to: 'provider', textPaths: text },
  { tool: 'contractor.instruct', kind: 'commit_spend', to: 'provider', amountPath: 'amountPence', textPaths: text },
  { tool: 'contractor.chase', kind: 'message', to: 'provider', textPaths: text },
  { tool: 'contractor.update', kind: 'message', to: 'provider', textPaths: text },
  { tool: 'case.wait', kind: 'hold', to: 'internal', textPaths: text },
  { tool: 'case.close', kind: 'close', to: 'internal', textPaths: text },
  { tool: 'case.escalate', kind: 'escalate', to: 'internal', textPaths: text },
];
