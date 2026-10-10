import { runView, type Assessment, type Handover, type RunEvent, type Source, type Vocabulary } from '@casework/core';
import type { BatchCase, CutLabel, EvalView, HistoryEventView, RunSummary, ToolInfo } from '@/lib/api-types';

/**
 * Sample data for the design page. Labels come from the selected track's vocabulary,
 * so every component can be checked against every track without naming one in code.
 */
const T0 = '2026-10-10T09:00:00.000Z';
const at = (min: number) => new Date(Date.parse(T0) + min * 60_000).toISOString();

export function samples(v: Vocabulary) {
  const job = v.case.toLowerCase();
  const sources: Source[] = [
    { id: 'S-1:case', kind: 'ticket', title: `${v.case} file`, receivedAt: at(0), body: `- created: 2026-10-10 09:00\n- source role: ${v.customer}\n\n## Initial request\n\nReported a leak under the kitchen sink. Water is pooling but contained.`, meta: {} },
    { id: 'S-1:event-1', kind: 'email', title: `Event 1 · Email · ${v.customer}`, receivedAt: at(5), body: `Hi, the leak is getting worse and I'm worried about the cupboard.\n\nOn Tue, the office wrote:\n> Thanks, we'll look into it.`, meta: { channel: 'Email', from: v.customer, to: 'Agency' } },
    { id: 'S-1:event-2', kind: 'call', title: `Event 2 · Call · ${v.handler}`, receivedAt: at(40), body: `${v.handler}: Hello, calling about the leak.\n${v.customer}: Yes, it's still dripping.\nAgent: I'll ask the owner to approve a plumber today.`, meta: { channel: 'Call' } },
    { id: 'S-1:quote.pdf', kind: 'doc', title: 'quote.pdf', receivedAt: at(60), body: 'Quote 2231\nReplace trap and seal: £180.00\n--- page 2 ---\nTerms: valid 30 days.', meta: {} },
    { id: 'S-1:event-3', kind: 'crm', title: 'Event 3 · Record update', receivedAt: at(70), body: 'status: open → awaiting approval\npriority: normal', meta: {} },
    { id: 'S-1:event-4', kind: 'sms', title: `Event 4 · SMS · ${v.customer}`, receivedAt: at(90), body: 'Any update on the plumber?', meta: {} },
  ];

  const assessment: Assessment = {
    asOf: at(95),
    stage: 'Waiting for approval',
    waitingOn: { party: 'Owner', since: at(45), sourceIds: ['S-1:event-2'] },
    facts: [
      { text: 'Leak under the kitchen sink, contained', sourceIds: ['S-1:case'] },
      { text: 'Quote of £180 received', sourceIds: ['S-1:quote.pdf'] },
    ],
    flags: [{ id: 'chase_due', text: 'No owner reply for 50 minutes', sourceIds: ['S-1:event-2'], mustEscalate: false }],
    suggested: [{ action: 'owner.send_quote', why: 'A quote is ready and needs approval' }],
    barred: [{ action: 'contractor.instruct', ruleId: 'policy.instruct_within_quote', why: 'No approval on record' }],
    boundaries: ['Does not approve the works'],
    noise: [],
  };

  const handover: Handover = {
    reason: `The ${v.customer.toLowerCase()} reports a cost dispute the agency can’t settle alone.`,
    facts: [
      { text: 'Quote of £180 for the repair', sourceId: 'S-1:quote.pdf' },
      { text: `${v.customer} disputes who should pay`, sourceId: 'S-1:event-1' },
    ],
    tried: [
      { text: 'owner.send_quote', ok: true },
      { text: 'contractor.instruct', ok: false },
    ],
    options: [
      { id: 'approve', label: 'Approve the quote and book the work', effect: 'irreversible', recommended: true },
      { id: 'ask', label: `Ask the ${v.customer.toLowerCase()} for photos first`, effect: 'reversible', recommended: false },
      { id: 'hold', label: 'Put on hold for 2 days', effect: 'pauses', recommended: false },
    ],
    refused: [{ action: 'contractor.instruct', ruleId: 'policy.instruct_within_quote' }],
    confidence: 0.62,
    queue: `${v.handler} · Priority`,
  };

  const base = { runId: 'sample-run' };
  let seq = 0;
  const ev = (e: Record<string, unknown>, min: number) => ({ ...base, seq: seq++, at: at(100 + min / 60), ...e }) as RunEvent;
  const events: RunEvent[] = [
    ev({ type: 'run.started', caseRef: 'S-1', autonomy: 'ask_first' }, 0),
    ev({ type: 'step.read', sourceIds: sources.map((s) => s.id), summary: `${sources.length} sources. Stage: Waiting for approval.` }, 1),
    ev({ type: 'case.assessed', assessment }, 2),
    ev({ type: 'tool.called', callId: 'c1', tool: 'owner.send_quote', args: { channel: 'email', message: 'Please approve the attached quote.', citations: ['S-1:quote.pdf'] } }, 3),
    ev({ type: 'tool.failed', callId: 'c1', error: 'Mail gateway timed out', attempt: 1, willRetry: true }, 5),
    ev({ type: 'tool.succeeded', callId: 'c1', result: { recorded: true }, ms: 1240 }, 7),
    ev({ type: 'action.blocked', action: 'contractor.instruct', ruleId: 'policy.instruct_within_quote', why: 'No approval on record' }, 8),
    ev({ type: 'decision.made', label: 'owner.send_quote', rationale: 'A quote is ready and the owner approves spend before any work.', confidence: 0.82, citations: ['S-1:quote.pdf', 'S-1:event-2'] }, 9),
    ev({ type: 'next.proposed', next: { action: 'owner.send_quote', recipient: 'Owner', channel: 'email', message: 'Please approve the attached quote for £180.', reason: 'Quote ready; approval comes first.', citations: ['S-1:quote.pdf'], confidence: 0.82, boundaries: ['Does not approve the works'], remainingWork: ['Book once approved'], decidedBy: 'model' } }, 10),
  ];
  const resolvedEvents = [...events, ev({ type: 'run.completed', outcome: 'resolved', summary: 'Next step: owner.send_quote.', usage: { inputTokens: 5200, outputTokens: 640, cacheReadTokens: 4100, cacheWriteTokens: 0 } }, 12)];
  seq = events.length;
  const escalatedEvents = [
    ...events,
    ev({ type: 'escalation.created', handover }, 11),
    ev({ type: 'run.completed', outcome: 'escalated', summary: 'Handed to a person.', usage: { inputTokens: 5200, outputTokens: 640, cacheReadTokens: 0, cacheWriteTokens: 0 } }, 12),
  ];

  const running = runView(events.slice(0, 4));
  const resolved = runView(resolvedEvents);
  const escalated = runView(escalatedEvents);
  const failedCall = { ...resolved.toolCalls[0]!, attempts: [{ ok: false, error: 'Timed out' }, { ok: false, error: 'Timed out' }, { ok: false, error: '503 from gateway' }], status: 'failed' as const, result: undefined };

  const historyEvents: HistoryEventView[] = sources
    .filter((s) => /:event-\d+$/.test(s.id))
    .map((s) => ({ n: Number(s.id.split('-').at(-1)), sourceId: s.id, at: s.receivedAt, channel: String(s.meta.channel ?? s.kind), from: String(s.meta.from ?? v.customer), to: String(s.meta.to ?? 'Agency'), body: s.body }));
  const labels: CutLabel[] = [
    { case: '1', cutBefore: 2, asOf: at(39), kind: 'determined', situation: 'Report received; owner not asked yet', accept: ['owner.request_approval'], prohibit: ['contractor.instruct'], happened: 'Asked the owner' },
    { case: '1', cutBefore: 4, asOf: at(89), kind: 'judgement', situation: 'Quote in, owner silent', accept: ['owner.send_quote', 'case.wait'], prohibit: ['case.close'] },
  ];
  const runSummary = (over: Partial<RunSummary>): RunSummary => ({
    runId: 'r1', caseRef: 'S-1', caseTitle: `Leak under the sink`, autonomy: 'ask_first', mode: 'model', startedAt: at(100), done: true, error: null, status: 'completed', outcome: 'resolved', mascot: 'done', steps: 9,
    next: { action: 'owner.send_quote', recipient: 'Owner', confidence: 0.82, decidedBy: 'model' }, ...over,
  });

  const evalView: EvalView = {
    id: 'sample', source: 'ui', mode: 'rules', startedAt: at(0), total: 6, done: false,
    rows: [
      { case: '001', cutBefore: 4, kind: 'determined', action: 'owner.request_approval', decidedBy: 'playbook', pass: true, prohibited: false, accept: ['owner.request_approval'], stage: 'New request', blocked: [], reason: '' },
      { case: '001', cutBefore: 8, kind: 'judgement', action: 'case.wait', decidedBy: 'playbook', pass: true, prohibited: false, accept: ['case.wait', 'tenant.update'], stage: 'Owner arranging', blocked: [], reason: '' },
      { case: '002', cutBefore: 3, kind: 'judgement', action: 'case.close', decidedBy: 'model', pass: false, prohibited: true, accept: ['contractor.chase'], stage: 'Contractor assigned', blocked: [], reason: '' },
      { case: '003', cutBefore: 5, kind: 'determined', action: 'tenant.ask', decidedBy: 'model', pass: false, prohibited: false, accept: ['owner.update'], stage: 'Work done', blocked: [], reason: '' },
    ],
    score: { all: { n: 4, accepted: 2, prohibited: 1 }, determined: { n: 2, accepted: 1, prohibited: 0 }, judgement: { n: 2, accepted: 1, prohibited: 1 } },
  };

  const batchCases: BatchCase[] = Array.from({ length: 36 }, (_, i) => ({
    ref: `S-${i + 1}`,
    n: i + 1,
    status: i < 28 ? 'done' : i < 31 ? 'running' : 'pending',
    outcome: i < 28 ? (['resolved', 'resolved', 'escalated', 'resolved', 'needs_info', 'resolved', 'failed'] as const)[i % 7] : undefined,
  }));

  const tool = (state: ToolInfo['health']['state'], recent: { ok: boolean; ms?: number }[], lastError?: string): ToolInfo => ({
    name: 'owner.send_quote', description: 'Send a quote to the owner for approval.', effect: 'write', recipient: 'Owner', rules: ['policy.cite_real_sources'],
    health: { calls: recent.length, failures: recent.filter((r) => !r.ok).length, blocked: 1, recent, avgMs: recent.length ? 640 : undefined, lastError, state },
  });
  const okRuns = Array.from({ length: 40 }, (_, i) => ({ ok: true, ms: 300 + ((i * 97) % 900) }));

  return {
    job, sources, assessment, handover, running, resolved, escalated, failedCall, historyEvents, labels, runSummary, evalView, batchCases,
    tools: {
      healthy: tool('healthy', okRuns),
      degraded: tool('degraded', okRuns.map((r, i) => (i % 6 === 0 ? { ok: false } : r)), 'Gateway timeout'),
      down: tool('down', okRuns.slice(0, 12).map((r, i) => (i % 2 ? { ok: false } : r)), '503 Service Unavailable'),
      unused: tool('unused', []),
    },
    call: {
      title: 'Inbound call',
      caller: v.customer,
      durationMs: 42_000,
      turns: [
        { speaker: v.customer, text: 'The sink is still leaking.', atMs: 0 },
        { speaker: 'Agent', text: 'Thanks. Is the water contained, or spreading?', atMs: 4000, agent: true },
        { speaker: v.customer, text: 'Contained in the cupboard.', atMs: 9000 },
        { speaker: 'Agent', text: 'I’ll send the quote to the owner now and update you today.', atMs: 14000, agent: true },
      ],
    },
    at,
  };
}
