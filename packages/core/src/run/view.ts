import type { Assessment, Handover, NextStep, Outcome, RunEvent, Usage } from '../schema';
import { mascotFor, type MascotState } from './mascot';

export type StepKind = 'read' | 'assess' | 'tool' | 'decide' | 'fail' | 'blocked' | 'escalate' | 'propose' | 'resolve';

export interface TraceStepView {
  seq: number;
  kind: StepKind;
  title: string;
  detail: string;
  at: string;
  callId?: string;
}

export interface ToolAttempt {
  ok: boolean;
  error?: string;
  ms?: number;
}

export interface ToolCallView {
  callId: string;
  tool: string;
  args: unknown;
  attempts: ToolAttempt[];
  result?: unknown;
  status: 'calling' | 'succeeded' | 'retrying' | 'failed';
}

export interface DecisionView {
  label: string;
  rationale: string;
  confidence: number;
  citations: string[];
}

export interface RunView {
  runId: string;
  caseRef: string;
  status: 'running' | 'completed';
  startedAt?: string;
  completedAt?: string;
  sourcesRead: string[];
  steps: TraceStepView[];
  toolCalls: ToolCallView[];
  blocked: { action: string; ruleId: string; why: string }[];
  decisions: DecisionView[];
  assessment?: Assessment;
  next?: NextStep;
  handover?: Handover;
  outcome?: Outcome;
  summary?: string;
  usage?: Usage;
  mascot: MascotState;
  lastSeq: number;
}

export function emptyRunView(runId = '', caseRef = ''): RunView {
  return {
    runId,
    caseRef,
    status: 'running',
    sourcesRead: [],
    steps: [],
    toolCalls: [],
    blocked: [],
    decisions: [],
    mascot: 'idle',
    lastSeq: -1,
  };
}

const fmtArgs = (args: unknown) => {
  try {
    const s = JSON.stringify(args);
    return s.length > 80 ? `${s.slice(0, 77)}…` : s;
  } catch {
    return '';
  }
};

/** Applies one event. Ignores duplicates and out-of-order replays by `seq`. */
export function applyEvent(view: RunView, e: RunEvent): RunView {
  if (e.seq <= view.lastSeq) return view;
  const v: RunView = { ...view, lastSeq: e.seq, mascot: mascotFor(e) };
  const step = (kind: StepKind, title: string, detail: string, callId?: string) => {
    v.steps = [...v.steps, { seq: e.seq, kind, title, detail, at: e.at, callId }];
  };
  const updateCall = (callId: string, fn: (c: ToolCallView) => ToolCallView) => {
    v.toolCalls = v.toolCalls.map((c) => (c.callId === callId ? fn(c) : c));
  };

  switch (e.type) {
    case 'run.started':
      v.runId = e.runId;
      v.caseRef = e.caseRef;
      v.startedAt = e.at;
      break;
    case 'step.read':
      v.sourcesRead = [...new Set([...v.sourcesRead, ...e.sourceIds])];
      step('read', `Read ${e.sourceIds.length} source${e.sourceIds.length === 1 ? '' : 's'}`, e.summary);
      break;
    case 'tool.called':
      v.toolCalls = [
        ...v.toolCalls,
        { callId: e.callId, tool: e.tool, args: e.args, attempts: [], status: 'calling' },
      ];
      step('tool', `${e.tool}(${fmtArgs(e.args)})`, 'Calling…', e.callId);
      break;
    case 'tool.succeeded':
      updateCall(e.callId, (c) => ({
        ...c,
        attempts: [...c.attempts, { ok: true, ms: e.ms }],
        result: e.result,
        status: 'succeeded',
      }));
      v.steps = v.steps.map((s) =>
        s.callId === e.callId && s.kind === 'tool' ? { ...s, detail: `Done in ${Math.round(e.ms)}ms` } : s,
      );
      break;
    case 'tool.failed': {
      updateCall(e.callId, (c) => ({
        ...c,
        attempts: [...c.attempts, { ok: false, error: e.error }],
        status: e.willRetry ? 'retrying' : 'failed',
      }));
      const tool = v.toolCalls.find((c) => c.callId === e.callId)?.tool ?? 'tool';
      step('fail', `${tool} failed`, `${e.error}${e.willRetry ? ` · retrying (attempt ${e.attempt})` : ' · gave up'}`, e.callId);
      break;
    }
    case 'action.blocked':
      v.blocked = [...v.blocked, { action: e.action, ruleId: e.ruleId, why: e.why }];
      step('blocked', `Refused: ${e.action}`, `${e.why} (${e.ruleId})`);
      break;
    case 'decision.made':
      v.decisions = [
        ...v.decisions,
        { label: e.label, rationale: e.rationale, confidence: e.confidence, citations: e.citations },
      ];
      step('decide', e.label, e.rationale);
      break;
    case 'case.assessed':
      v.assessment = e.assessment;
      step('assess', e.assessment.stage, e.assessment.waitingOn ? `Waiting on ${e.assessment.waitingOn.party} since ${e.assessment.waitingOn.since}` : 'Not waiting on anyone');
      break;
    case 'next.proposed':
      v.next = e.next;
      step('propose', `Next: ${e.next.action} → ${e.next.recipient}`, e.next.reason);
      break;
    case 'escalation.created':
      v.handover = e.handover;
      step('escalate', `Handed to ${e.handover.queue}`, e.handover.reason);
      break;
    case 'run.completed':
      v.status = 'completed';
      v.completedAt = e.at;
      v.outcome = e.outcome;
      v.summary = e.summary;
      v.usage = e.usage;
      if (e.outcome === 'resolved') step('resolve', 'Resolved', e.summary);
      break;
  }
  return v;
}

/** Reduces a full event list. Used by the web app, replay and the ANSWERS writer. */
export function runView(events: RunEvent[]): RunView {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  return sorted.reduce(applyEvent, emptyRunView(sorted[0]?.runId, ''));
}
