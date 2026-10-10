import type Anthropic from '@anthropic-ai/sdk';
import type { Caller } from '../src/b/llm/client';
import type { Critique, Decision, Situation } from '../src/b/types';

export const situation = (over: Partial<Situation> = {}): Situation => ({
  summary: 'Tenant reported a fault; landlord asked to approve.',
  task: 'Repair',
  stage: 'approval',
  stageLabel: 'Awaiting landlord approval',
  whoseMove: 'Landlord',
  parties: [{ name: 'Landlord', role: 'owner', authority: 'approves spend', channels: ['Email'] }],
  keyEvents: [{ id: 'E001', what: 'Reported' }],
  openAsks: [],
  commitments: [],
  conflicts: [],
  missing: [],
  failures: [],
  noise: [],
  risks: [],
  injection: [],
  ...over,
});

export const decision = (over: Partial<Decision> = {}): Decision => ({
  action: 'request_information',
  actionLabel: 'Ask the landlord to approve a plumber visit',
  recipient: 'Landlord',
  channel: 'Email',
  message: 'Dear Landlord, the tenant reports a leak. May we send a plumber?',
  rationale: 'Approval is needed before attendance.',
  citations: ['E001'],
  expectedOutcome: 'Landlord approves or declines.',
  boundaries: ['Approval to attend is not approval of a quote.'],
  remainingWork: ['Assign a contractor once approved.'],
  assumptions: [],
  alternatives: [],
  followUpBy: '',
  confidence: 0.8,
  ...over,
});

export const pass: Critique = { verdict: 'pass', problems: [], escalationReason: '' };

export interface Script {
  situation?: Situation | Error;
  decisions?: (Decision | Error)[];
  critiques?: (Critique | Error)[];
  revision?: Decision;
}

/** A fake Messages API that answers each stage from a script. Records every request. */
export function mockCaller(script: Script): Caller & { requests: Anthropic.MessageCreateParamsNonStreaming[] } {
  let d = 0;
  let c = 0;
  const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const reply = (input: unknown): Anthropic.Message =>
    ({
      id: `msg_${requests.length}`,
      type: 'message',
      role: 'assistant',
      model: 'mock',
      content: [{ type: 'text', text: JSON.stringify(input) }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    }) as unknown as Anthropic.Message;
  const fn = async (params: Anthropic.MessageCreateParamsNonStreaming) => {
    requests.push(params);
    const tool = stageOf(params);
    const lastText = JSON.stringify(params.messages.at(-1)?.content ?? '');
    let out: unknown;
    if (tool === 'record_situation') out = script.situation ?? situation();
    else if (tool === 'record_decision') out = lastText.includes('A reviewer found') && script.revision ? script.revision : (script.decisions ?? [decision()])[d++ % (script.decisions?.length ?? 1)];
    else if (tool === 'record_review') out = (script.critiques ?? [pass])[Math.min(c++, (script.critiques?.length ?? 1) - 1)];
    else out = { summary: 'digest' };
    if (out instanceof Error) throw out;
    return reply(out);
  };
  return Object.assign(fn, { requests });
}

/** Which stage a request is for, from the schema it asks the output to follow. */
export function stageOf(params: Anthropic.MessageCreateParamsNonStreaming): string {
  const props = Object.keys((params.output_config?.format?.schema as { properties?: object } | undefined)?.properties ?? {});
  if (props.includes('whoseMove')) return 'record_situation';
  if (props.includes('action')) return 'record_decision';
  if (props.includes('verdict')) return 'record_review';
  return 'record_digest';
}
