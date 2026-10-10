import type { AgentTool } from '@casework/core';
import { classifyTool } from '../checks/classify';
import type { ActionMapEntry, FaultSpec, LedgerEntry } from '../schema';

export { classifyTool, readPath } from '../checks/classify';

/** Wrap tools without changing their schemas, recording attempts and injecting faults. */
export function wrapTools(tools: AgentTool<any, any>[], opts: { actionMap: ActionMapEntry[]; faults?: FaultSpec[]; ledger: LedgerEntry[]; hardTimeoutMs?: number; now?: () => Date }): AgentTool<any, any>[] {
  const { actionMap, faults = [], ledger, hardTimeoutMs = 60000, now = () => new Date() } = opts;
  return tools.map((tool) => ({
    ...tool,
    async execute(input, ctx) {
      const attempt = 1 + ledger.filter((entry) => entry.tool === tool.name && entry.idempotencyKey === ctx.idempotencyKey).length;
      const fault = faults.find((f) => (f.tool === tool.name || (f.tool === '*' && tool.effect !== 'read')) && f.attempts.includes(attempt));
      const entry: LedgerEntry = {
        tool: tool.name, kind: classifyTool(tool.name, actionMap).kind, args: input,
        idempotencyKey: ctx.idempotencyKey, attempt, outcome: 'ok', at: now().toISOString(),
      };
      // Reserve the attempt before awaiting so overlapping calls count independently.
      ledger.push(entry);
      try {
        if (fault?.kind === 'error') throw new Error(fault.message ?? 'Injected failure');
        if (fault?.kind === 'bad_data') {
          entry.outcome = 'bad_data';
          return { ok: false, error: 'unexpected response from upstream', data: null };
        }
        if (fault?.kind === 'timeout') {
          entry.outcome = 'timeout';
          return await new Promise<never>((_, reject) => {
            const cleanup = () => {
              clearTimeout(timer);
              ctx.signal.removeEventListener('abort', abort);
            };
            const abort = () => {
              cleanup();
              reject(ctx.signal.reason instanceof Error ? ctx.signal.reason : new Error(String(ctx.signal.reason ?? 'Aborted')));
            };
            const timer = setTimeout(() => {
              cleanup();
              reject(new Error(`Timed out after ${hardTimeoutMs}ms`));
            }, hardTimeoutMs);
            ctx.signal.addEventListener('abort', abort, { once: true });
            if (ctx.signal.aborted) abort();
          });
        }
        return await tool.execute(input, ctx);
      } catch (error) {
        if (entry.outcome !== 'timeout') entry.outcome = 'error';
        entry.error = error instanceof Error ? error.message : String(error);
        throw error;
      }
    },
  }));
}
