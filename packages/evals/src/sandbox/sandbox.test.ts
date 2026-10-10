import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { AgentTool, ToolContext } from '@casework/core';
import { withRetry } from '@casework/core/agent';
import { LedgerEntry } from '../schema';
import { wrapTools } from './index';

const now = () => new Date('2026-01-02T03:04:05Z');
const context = (signal = new AbortController().signal, key = 'same'): ToolContext => ({ caseRef: 'FX-001', runId: 'run', idempotencyKey: key, signal });
function tool(effect: AgentTool['effect'] = 'write'): AgentTool {
  return { name: 'desk.message', description: 'Send a message', input: z.object({ text: z.string() }), effect, timeoutMs: 500,
    execute: vi.fn(async () => ({ ok: true })) };
}

describe('wrapTools', () => {
  it('retries a first-attempt error with the same key, preserving metadata and ledger fields', async () => {
    const original = tool();
    const ledger: LedgerEntry[] = [];
    const [wrapped] = wrapTools([original], { actionMap: [{ tool: original.name, kind: 'message', textPaths: ['text'] }],
      faults: [{ tool: original.name, kind: 'error', attempts: [1], message: 'Try again' }], ledger, now });
    const args = { text: 'Hello' };
    const result = await withRetry((signal) => wrapped!.execute(args, context(signal)), { attempts: 2, baseDelayMs: 0 });
    expect(result).toEqual({ ok: true });
    expect(original.execute).toHaveBeenCalledTimes(1);
    for (const key of ['name', 'description', 'input', 'effect', 'timeoutMs'] as const) expect(wrapped![key]).toBe(original[key]);
    expect(ledger).toEqual([
      { tool: original.name, kind: 'message', args, idempotencyKey: 'same', attempt: 1, outcome: 'error', at: now().toISOString(), error: 'Try again' },
      { tool: original.name, kind: 'message', args, idempotencyKey: 'same', attempt: 2, outcome: 'ok', at: now().toISOString() },
    ]);
    ledger.forEach((entry) => LedgerEntry.parse(entry));
  });

  it('does not apply wildcard faults to read tools even with a non-read action mapping', async () => {
    const original = tool('read');
    const ledger: LedgerEntry[] = [];
    const [wrapped] = wrapTools([original], { actionMap: [{ tool: original.name, kind: 'message', textPaths: [] }], faults: [{ tool: '*', kind: 'error', attempts: [1] }], ledger });
    await expect(wrapped!.execute({}, context())).resolves.toEqual({ ok: true });
    expect(ledger[0]?.outcome).toBe('ok');
  });

  it('applies wildcard errors to effectful tools and defaults the error message', async () => {
    const ledger: LedgerEntry[] = [];
    const [wrapped] = wrapTools([tool()], { actionMap: [], faults: [{ tool: '*', kind: 'error', attempts: [1] }], ledger });
    await expect(wrapped!.execute({}, context())).rejects.toThrow('Injected failure');
    expect(ledger[0]?.outcome).toBe('error');
  });

  it('rejects timeout faults on abort and removes the listener', async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const original = tool();
    const ledger: LedgerEntry[] = [];
    const [wrapped] = wrapTools([original], { actionMap: [], faults: [{ tool: '*', kind: 'timeout', attempts: [1] }], ledger, hardTimeoutMs: 10000 });
    const pending = wrapped!.execute({}, context(controller.signal));
    const rejected = expect(pending).rejects.toThrow('Cancelled');
    controller.abort(new Error('Cancelled'));
    await rejected;
    expect(remove).toHaveBeenCalled();
    expect(original.execute).not.toHaveBeenCalled();
    expect(ledger[0]).toMatchObject({ outcome: 'timeout', error: 'Cancelled' });
  });

  it('handles already aborted signals and a timeout without an abort', async () => {
    const controller = new AbortController();
    controller.abort('Stopped');
    const ledger: LedgerEntry[] = [];
    const [wrapped] = wrapTools([tool()], { actionMap: [], faults: [{ tool: '*', kind: 'timeout', attempts: [1] }], ledger, hardTimeoutMs: 5 });
    await expect(wrapped!.execute({}, context(controller.signal, 'aborted'))).rejects.toThrow('Stopped');
    await expect(wrapped!.execute({}, context(undefined, 'other'))).rejects.toThrow('Timed out after 5ms');
    expect(ledger.map((entry) => entry.outcome)).toEqual(['timeout', 'timeout']);
  });

  it('short circuits bad data and counts attempts separately per tool and idempotency key', async () => {
    const first = tool();
    const second = { ...tool(), name: 'desk.record' };
    const ledger: LedgerEntry[] = [];
    const [a, b] = wrapTools([first, second], { actionMap: [], faults: [{ tool: '*', kind: 'bad_data', attempts: [1] }], ledger });
    const bad = { ok: false, error: 'unexpected response from upstream', data: null };
    await expect(a!.execute({}, context())).resolves.toEqual(bad);
    await expect(a!.execute({}, context())).resolves.toEqual({ ok: true });
    await expect(a!.execute({}, context(undefined, 'new'))).resolves.toEqual(bad);
    await expect(b!.execute({}, context())).resolves.toEqual(bad);
    expect(first.execute).toHaveBeenCalledTimes(1);
    expect(second.execute).not.toHaveBeenCalled();
    expect(ledger.map((entry) => entry.attempt)).toEqual([1, 2, 1, 1]);
    expect(ledger.map((entry) => entry.outcome)).toEqual(['bad_data', 'ok', 'bad_data', 'bad_data']);
  });

  it('records real tool errors and overlapping attempts', async () => {
    const original = { ...tool(), execute: vi.fn(async () => { throw new Error('Upstream failed'); }) };
    const ledger: LedgerEntry[] = [];
    const [wrapped] = wrapTools([original], { actionMap: [], ledger });
    await Promise.all([expect(wrapped!.execute({}, context())).rejects.toThrow('Upstream failed'), expect(wrapped!.execute({}, context())).rejects.toThrow('Upstream failed')]);
    expect(ledger.map((entry) => entry.attempt)).toEqual([1, 2]);
    expect(ledger.every((entry) => entry.outcome === 'error' && entry.error === 'Upstream failed')).toBe(true);
  });
});
