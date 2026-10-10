import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TrackId, RunEvent } from '@casework/core';
import { EvalSuite, type GradeInput, type MaterializedScenario, type AgentRunOutput, type ConcreteScenario } from '../schema';
import { makeSpec, makeRubric } from '../score/fixtures';

/** Build grading input with handmade materialization, trace and temporary answer files. */
export async function makeGradeInput(dir: string): Promise<GradeInput> {
  const spec = makeSpec({ rubric: [makeRubric({ check: { type: 'requires_action', kinds: ['record'] }, fix: 'tool' }),
    makeRubric({ id: 'extra', kind: 'positive', tag: 'communication' })] });
  const scenario: ConcreteScenario = { id: spec.id, baseId: spec.id, variant: 'base', spec, edits: [] };
  const suite = EvalSuite.parse({ track: TrackId.options[0], trackFolder: 'Fixture Track', refPrefix: 'FX',
    roles: { customer: 'Customer', approver: 'Approver', provider: 'Provider', internal: 'Desk', third_party: 'Party', unknown: 'Unknown' },
    agentSenders: ['Desk'], domainNotes: 'The desk completes authorized job updates.', scenarios: [spec],
    actionMap: [{ tool: 'job.record', kind: 'record' }], splits: { smoke: [spec.id], holdout: [] } });
  const materialized: MaterializedScenario = { scenario, spec, root: dir, caseDir: dir, folder: '001', visibleEvents: ['001', '002'],
    visibleAttachments: [], visibleText: 'A customer requested a job update.',
    hidden: { scenarioId: spec.id, events: [], attachments: [], removedSections: [], removedDetails: [], renumbering: {} },
    leak: { ok: true, findings: [] } };
  const at = '2026-01-01T00:00:00Z';
  const events = [
    { type: 'tool.called', runId: 'agent-run', seq: 0, at, callId: 'call-1', tool: 'job.record', args: { text: 'Job updated.' } },
    { type: 'tool.succeeded', runId: 'agent-run', seq: 1, at, callId: 'call-1', result: { ok: true }, ms: 10 },
    { type: 'decision.made', runId: 'agent-run', seq: 2, at, label: 'Update the job', rationale: 'The customer requested the update.', confidence: 1, citations: ['FX-001:case'] },
    { type: 'run.completed', runId: 'agent-run', seq: 3, at, outcome: 'resolved', summary: 'The job update is recorded.', usage: { inputTokens: 10, outputTokens: 5 } },
  ].map(event => RunEvent.parse(event));
  const answerPath = join(dir, 'ANSWER.md');
  const reasoningPath = join(dir, 'REASONING.md');
  await writeFile(answerPath, '# Job\n\n**What the system received**\nA request.\n\n**Actions taken**\nRecorded a job update.\n\n**Actions refused**\nNone\n\n**Escalated**\nNo\n\n**What failed**\nNothing\n\n**Final result**\nThe job update is recorded.\n');
  await writeFile(reasoningPath, '# Reasoning\n\n## Step 1\nThe customer requested the job update.\n');
  const agent: AgentRunOutput = { ok: true, error: null, events, ledger: [], ms: 50,
    usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 }, answerPath, reasoningPath, tracePath: null };
  return { runId: 'eval-run', scenario, materialized, suite, agentName: 'fixture-agent', repeat: 1, agent,
    judge: { enabled: false, model: 'test-model', effort: 'high', samples: 1, concurrency: 1, fallbacks: false, cacheDir: null }, artifactsDir: 'agent/job/r1' };
}
