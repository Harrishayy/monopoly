import type Anthropic from '@anthropic-ai/sdk';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Caller } from '../src/b/llm/client';
import type { Decision } from '../src/b/types';
import { agentC } from '../src/c';
import { runCaseC } from '../src/c/pipeline';
import { renderAnswer, renderReasoning } from '../src/c/render';
import type { IssueResponse, Review } from '../src/c/types';
import { decision, situation } from './mock';

const FIX = join(__dirname, 'fixtures');
const MODELS = { read: 'read-model', decide: 'decide-model', critic: 'critic-model' };

const approve: Review = { verdict: 'approve', issues: [], escalationReason: '' };
const revise = (id = 'c1'): Review => ({
  verdict: 'revise',
  issues: [{ id, severity: 'blocking', tag: 'approval', claim: 'The landlord already approved in E003.', refs: ['E003'], suggestion: 'Instruct the contractor instead.' }],
  escalationReason: '',
});

interface Script {
  decision?: Decision;
  reviews?: (Review | Error)[];
  responses?: IssueResponse[];
  revision?: Decision;
}

/** A fake Messages API for agent C's stages, told apart by the output schema each request asks for. */
function mockC(script: Script): Caller & { requests: Anthropic.MessageCreateParamsNonStreaming[] } {
  let r = 0;
  const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const fn = async (params: Anthropic.MessageCreateParamsNonStreaming) => {
    requests.push(params);
    const props = Object.keys((params.output_config?.format?.schema as { properties?: object } | undefined)?.properties ?? {});
    let out: unknown;
    if (props.includes('whoseMove')) out = situation();
    else if (props.includes('responses')) out = { responses: script.responses ?? [], decision: script.revision ?? script.decision ?? decision({ citations: ['E002'] }) };
    else if (props.includes('action')) out = script.decision ?? decision({ citations: ['E002'] });
    else if (props.includes('verdict')) out = (script.reviews ?? [approve])[Math.min(r++, (script.reviews?.length ?? 1) - 1)];
    else out = { summary: 'digest' };
    if (out instanceof Error) throw out;
    return {
      id: `msg_${requests.length}`,
      type: 'message',
      role: 'assistant',
      model: params.model,
      content: [{ type: 'text', text: JSON.stringify(out) }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    } as unknown as Anthropic.Message;
  };
  return Object.assign(fn, { requests });
}

const stages = (c: ReturnType<typeof mockC>) =>
  c.requests.map((p) => {
    const props = Object.keys((p.output_config?.format?.schema as { properties?: object }).properties ?? {});
    return props.includes('whoseMove') ? 'situate' : props.includes('responses') ? 'respond' : props.includes('action') ? 'decide' : 'review';
  });

describe('agent C', () => {
  it('acts when the reviewer approves, with each stage on its own model', async () => {
    const caller = mockC({});
    const r = await runCaseC(join(FIX, 'plain-history'), { caller, models: MODELS });
    expect(r.final).toMatchObject({ action: 'request_information', decidedBy: 'model' });
    expect(stages(caller)).toEqual(['situate', 'decide', 'decide', 'decide', 'review']);
    expect(caller.requests.map((p) => p.model)).toEqual(['read-model', 'decide-model', 'decide-model', 'decide-model', 'critic-model']);
    expect(r.rounds).toHaveLength(1);
    expect(r.failures).toEqual([]);
  });

  it('takes the revision when the leader accepts an issue and the second review approves', async () => {
    const fixed = decision({ action: 'send_message', recipient: 'Contractor', actionLabel: 'Instruct the contractor', citations: ['E003'] });
    const caller = mockC({ reviews: [revise(), approve], responses: [{ issueId: 'c1', verdict: 'accept', evidence: 'Switched to instructing the contractor.', refs: ['E003'] }], revision: fixed });
    const r = await runCaseC(join(FIX, 'plain-history'), { caller, models: MODELS });
    expect(stages(caller).slice(-3)).toEqual(['review', 'respond', 'review']);
    expect(r.revised).toBe(true);
    expect(r.disputed).toEqual([]);
    expect(r.final).toMatchObject({ action: 'send_message', recipient: 'Contractor' });
    // The second review is shown the leader's answer.
    expect(JSON.stringify(caller.requests.at(-1)!.messages)).toMatch(/Switched to instructing the contractor/);
  });

  it('escalates with both positions when the leader rejects an issue and the reviewer holds it', async () => {
    const caller = mockC({ reviews: [revise(), revise()], responses: [{ issueId: 'c1', verdict: 'reject', evidence: 'E003 approves attendance only, not the quote.', refs: ['E003'] }] });
    const r = await runCaseC(join(FIX, 'plain-history'), { caller, models: MODELS });
    expect(r.disputed.map((d) => d.issue.id)).toEqual(['c1']);
    expect(r.final).toMatchObject({ action: 'escalate_to_human', gateRule: 'dispute-escalate' });
    expect(r.final.handover!.options.map((o) => o.option)).toEqual([expect.stringMatching(/^Agent's plan/), 'Reviewer\'s alternative: Instruct the contractor instead.']);
    expect(r.final.message).toMatch(/E003 approves attendance only/);
  });

  it('leaves a dispute to the gate when asked to', async () => {
    const caller = mockC({ reviews: [revise(), revise()], responses: [{ issueId: 'c1', verdict: 'reject', evidence: 'E003 approves attendance only.', refs: ['E003'] }] });
    const r = await runCaseC(join(FIX, 'plain-history'), { caller, models: MODELS, onDispute: 'gate' });
    expect(r.final.gateRule).not.toBe('dispute-escalate');
  });

  it('a new blocking issue in round 2 is not a dispute', async () => {
    const caller = mockC({ reviews: [revise('c1'), revise('c2')], responses: [{ issueId: 'c1', verdict: 'reject', evidence: 'No.', refs: [] }] });
    const r = await runCaseC(join(FIX, 'plain-history'), { caller, models: MODELS });
    expect(r.disputed).toEqual([]);
    expect(r.final.gateRule).not.toBe('dispute-escalate');
  });

  it('still answers when the reviewer fails', async () => {
    const caller = mockC({ reviews: [new Error('overloaded')] });
    const r = await runCaseC(join(FIX, 'plain-history'), { caller, models: MODELS });
    expect(r.failures.join(' ')).toMatch(/review 1/);
    expect(r.final.decidedBy).not.toBe('fallback');
  });

  it('writes the dialogue into REASONING.md and names itself in ANSWER.md', async () => {
    const caller = mockC({ reviews: [revise(), revise()], responses: [{ issueId: 'c1', verdict: 'reject', evidence: 'Attendance only.', refs: ['E003'] }] });
    const r = await runCaseC(join(FIX, 'plain-history'), { caller, models: MODELS });
    const reasoning = renderReasoning(r);
    expect(reasoning).toMatch(/## 5\. Checks and review dialogue/);
    expect(reasoning).toMatch(/### Round 2 · reviewer critic-model/);
    expect(reasoning).toMatch(/Still disputed/);
    expect(reasoning).toMatch(/## Decision 1: /);
    expect(renderAnswer(r)).toMatch(/Generated by agent-c/);
  });

  it('writes answer folders through the common agent interface', async () => {
    const out = await mkdtemp(join(tmpdir(), 'agent-c-'));
    const agent = agentC({ caller: mockC({}), models: MODELS });
    const [res] = await agent.answer([join(FIX, 'plain-history')], out, { withhold: 'none' });
    expect(res!.decision.agent).toBe('c');
    expect(await readFile(join(out, 'SUMMARY.md'), 'utf8')).toMatch(/# Agent C run summary/);
    expect(await readFile(join(out, res!.name, 'trace.jsonl'), 'utf8')).toMatch(/"stage":"dialogue"/);
  });
});
