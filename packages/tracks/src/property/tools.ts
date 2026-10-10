import type { AgentTool } from '@casework/core';

/**
 * Tools for this track. Wrap the supplied synthetic APIs here.
 * Use the add-agent-tool project skill: zod input, effect, execute(), and a policy rule if it moves money.
 * Planned: property.get, tenancy.get, contractors.book, contractors.confirm, landlord.notify, sms.send
 */
export const tools: AgentTool<any, any>[] = [];
