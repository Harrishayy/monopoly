import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { renderAnswers } from '../answers/render';
import { runView } from '../run/view';
import { RunEvent, type Assessment, type Case } from '../schema';
import type { AgentTool, TrackPack } from '../track';
import { guard } from './guard';
import { runCase, type EmitInput } from './loop';
import type { ModelClient } from './model';

const c: Case = {
  ref: 'T-001',
  track: 'property',
  title: 'Leaking tap',
  customer: { name: 'Tenant' },
  status: 'new',
  sources: [
    { id: 'T-001:case', kind: 'ticket', title: 'Leaking tap', receivedAt: '2025-01-01T09:00:00.000Z', body: 'Tap drips', meta: {} },
    { id: 'T-001:event-001', kind: 'email', title: 'Event 001', receivedAt: '2025-01-01T09:00:00.000Z', body: 'Tap drips', meta: {} },
  ],
};

const assessment: Assessment = {
  asOf: '2025-01-01T09:00:00.000Z',
  stage: 'New request',
  facts: [{ text: 'Tenant reports a dripping tap', sourceIds: ['T-001:event-001'] }],
  flags: [],
  suggested: [{ action: 'ask.landlord', why: 'Landlord decides first' }],
  barred: [{ action: 'send.contractor', ruleId: 'test.approval', why: 'No landlord approval' }],
  boundaries: ['Do not claim anyone visited'],
  noise: [],
};

const Args = z.object({
  channel: z.string(),
  message: z.string(),
  reason: z.string(),
  citations: z.array(z.string()),
  confidence: z.number(),
  remainingWork: z.array(z.string()),
});
const tool = (name: string, recipient: string, execute?: AgentTool['execute']): AgentTool => ({
  name,
  description: name,
  input: Args,
  effect: 'write',
  recipient,
  execute: execute ?? (async () => ({ recorded: true })),
});

const pack = (tools: AgentTool[], a: Assessment | undefined = assessment): TrackPack => ({
  id: 'property',
  label: 'Test',
  vocabulary: { case: 'Job', cases: 'Jobs', customer: 'Tenant', handler: 'Manager' },
  autonomy: 'ask_first',
  loadCases: async () => [],
  assess: () => a!,
  tools,
  policy: { rules: [], mustEscalate: [] },
  systemPrompt: 'test',
});

const args = (reason: string) => ({
  channel: 'email',
  message: 'Hello',
  reason,
  citations: ['T-001:event-001'],
  confidence: 0.8,
  remainingWork: ['Wait for reply'],
});

const reply = (blocks: Anthropic.ContentBlock[]): Anthropic.Message =>
  ({
    id: 'msg',
    type: 'message',
    role: 'assistant',
    model: 'test',
    content: blocks,
    stop_reason: blocks.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  }) as unknown as Anthropic.Message;
const use = (id: string, name: string, input: unknown) => ({ type: 'tool_use', id, name, input }) as Anthropic.ContentBlock;

async function run(p: TrackPack, model: ModelClient | null) {
  const events: RunEvent[] = [];
  let seq = 0;
  const emit = (e: EmitInput) => events.push(RunEvent.parse({ ...e, runId: 'r', seq: seq++, at: new Date().toISOString() }));
  const outcome = await runCase(c, p, { runId: 'r', autonomy: 'ask_first', emit, model });
  return { outcome, events, view: runView(events) };
}

describe('guard', () => {
  it('refuses an action the assessment bars', () => {
    const t = tool('send.contractor', 'Contractor');
    const g = guard({ tool: t.name, args: args('x') }, t, { rules: [], mustEscalate: [] }, 'ask_first', { case: c, assessment });
    expect(g).toEqual({ allow: false, ruleId: 'test.approval', why: 'No landlord approval' });
  });

  it('lifts a bar only when the call cites a source that can lift it', () => {
    const t = tool('send.contractor', 'Contractor');
    const a = { ...assessment, barred: [{ ...assessment.barred[0]!, unlessCites: ['T-001:event-001'] }] };
    const policy = { rules: [], mustEscalate: [] };
    expect(guard({ tool: t.name, args: args('x') }, t, policy, 'ask_first', { case: c, assessment: a })).toEqual({ allow: true });
    const other = { ...args('x'), citations: ['T-001:case'] };
    expect(guard({ tool: t.name, args: other }, t, policy, 'ask_first', { case: c, assessment: a })).toMatchObject({ allow: false, ruleId: 'test.approval' });
  });
});

describe('runCase', () => {
  const tools = [tool('ask.landlord', 'Landlord'), tool('send.contractor', 'Contractor'), tool('case.escalate', 'Manager')];

  it('feeds a refusal back to the model, which then picks an allowed step', async () => {
    const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
    const model: ModelClient = async (params) => {
      calls.push(structuredClone(params));
      return calls.length === 1
        ? reply([use('a', 'send__contractor', args('Just send someone'))])
        : reply([use('b', 'ask__landlord', args('Landlord decides first'))]);
    };
    const { outcome, view } = await run(pack(tools), model);
    expect(outcome).toBe('resolved');
    expect(view.blocked).toEqual([{ action: 'send.contractor', ruleId: 'test.approval', why: 'No landlord approval' }]);
    expect(view.next).toMatchObject({ action: 'ask.landlord', recipient: 'Landlord', decidedBy: 'model', confidence: 0.8 });
    expect(calls[0]!.tools!.map((t) => (t as Anthropic.Tool).name)).toEqual(['ask__landlord', 'send__contractor', 'case__escalate']);
    const lastTurn = calls[1]!.messages.at(-1)!.content as Anthropic.ToolResultBlockParam[];
    expect(lastTurn[0]).toMatchObject({ is_error: true });
    expect(view.usage!.inputTokens).toBe(20);
  });

  it('uses the playbook when there is no model', async () => {
    const { outcome, view } = await run(pack(tools), null);
    expect(outcome).toBe('resolved');
    expect(view.next).toMatchObject({ action: 'ask.landlord', decidedBy: 'playbook' });
    expect(view.decisions[0]!.rationale).toMatch(/No model configured/);
  });

  it('survives a failing model and a failing tool without throwing', async () => {
    const flaky = [tool('ask.landlord', 'Landlord', async () => { throw new Error('channel down'); }), tool('case.escalate', 'Manager')];
    const model: ModelClient = async () => { throw new Error('overloaded'); };
    const p = { ...pack(flaky), assess: () => ({ ...assessment, suggested: [{ action: 'ask.landlord', why: 'Landlord decides first' }] }) };
    const { outcome, view } = await run(p, model);
    expect(outcome).toBe('escalated');
    expect(view.toolCalls[0]!.status).toBe('failed');
    expect(view.next!.action).toBe('case.escalate');
    expect(view.handover!.facts[0]!.sourceId).toBe('T-001:event-001');
  });

  it('renders the next step, boundaries and the refused action into ANSWER.md', async () => {
    let n = 0;
    const model: ModelClient = async () =>
      ++n === 1 ? reply([use('a', 'send__contractor', args('x'))]) : reply([use('b', 'ask__landlord', args('Landlord decides first'))]);
    const { view } = await run(pack(tools), model);
    const { answer, reasoning } = renderAnswers(view, c, 1);
    expect(answer).toMatch(/\*\*Next step\*\*\n`ask.landlord` · to Landlord · by email/);
    expect(answer).toMatch(/Do not claim anyone visited/);
    expect(answer).toMatch(/send.contractor: No landlord approval \(rule: test.approval\)/);
    expect(reasoning).toMatch(/Stage: \*\*New request\*\*/);
  });
});
