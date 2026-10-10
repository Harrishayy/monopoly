import { z } from 'zod';
import { Outcome, TrackId } from '@casework/core';
import { ActionKind, DecisionClass, EventNumber, FailureTag, FixArea, KeyValue, PartyRole, RubricKind } from './common';

const scenarioId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]*-\d{3}@\d{3}(?:~[a-z0-9-]+|#esc)?$/);
const textWhere = z.array(z.enum(['answer', 'reasoning', 'messages'])).optional();

export const TraceCheck = z.discriminatedUnion('type', [
  z.object({ type: z.literal('no_action'), kinds: z.array(ActionKind), to: PartyRole.optional() }),
  z.object({ type: z.literal('requires_action'), kinds: z.array(ActionKind), to: PartyRole.optional() }),
  z.object({ type: z.literal('max_spend'), pence: z.number().int().nonnegative() }),
  z.object({ type: z.literal('outcome_in'), outcomes: z.array(Outcome) }),
  z.object({ type: z.literal('escalated'), value: z.boolean() }),
  z.object({ type: z.literal('text_absent'), pattern: z.string(), flags: z.string().optional(), where: textWhere }),
  z.object({ type: z.literal('text_present'), pattern: z.string(), flags: z.string().optional(), where: textWhere }),
  z.object({ type: z.literal('cites_any'), refs: z.array(z.string()) }),
]);
export type TraceCheck = z.infer<typeof TraceCheck>;

export const RubricItem = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/), kind: RubricKind,
  text: z.string().min(10), tag: FailureTag, evidence: z.array(z.string()).default([]),
  weight: z.number().optional(), appliesTo: z.array(DecisionClass).optional(),
  check: TraceCheck.optional(), fix: FixArea.optional(),
});
export type RubricItem = z.infer<typeof RubricItem>;

export const Expected = z.object({
  summary: z.string().min(20), decision: DecisionClass,
  acceptable: z.array(z.object({ decision: DecisionClass, summary: z.string() })).default([]),
});
export type Expected = z.infer<typeof Expected>;

export const HiddenFact = z.object({ text: z.string(), marker: z.string().optional() });
export type HiddenFact = z.infer<typeof HiddenFact>;

export const FaultSpec = z.object({
  tool: z.string(), kind: z.enum(['error', 'timeout', 'bad_data']),
  attempts: z.array(z.number().int().positive()), message: z.string().optional(),
});
export type FaultSpec = z.infer<typeof FaultSpec>;

export const ScenarioSpec = z.object({
  id: scenarioId, case: EventNumber, cutAfter: EventNumber, title: z.string(), question: z.string().optional(),
  attachments: z.object({
    include: z.array(z.string()).default([]), exclude: z.array(z.string()).default([]),
  }).default({ include: [], exclude: [] }),
  expected: Expected,
  rubric: z.array(RubricItem).min(1).refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    { message: 'Rubric item ids must be unique within a scenario' },
  ),
  hiddenFacts: z.array(HiddenFact).default([]),
  historyDeviates: z.string().optional(), faults: z.array(FaultSpec).default([]),
  tags: z.array(z.string()).default([]), notes: z.string().optional(),
});
export type ScenarioSpec = z.infer<typeof ScenarioSpec>;
export type ScenarioSpecInput = z.input<typeof ScenarioSpec>;

export const EventDraft = z.object({
  at: z.string().optional(), fields: z.array(KeyValue).min(1), body: z.string(),
});
export type EventDraft = z.infer<typeof EventDraft>;

export const CaseEdit = z.discriminatedUnion('op', [
  z.object({ op: z.literal('append_event'), event: EventDraft }),
  z.object({ op: z.literal('insert_event'), before: EventNumber, event: EventDraft }),
  z.object({ op: z.literal('remove_event'), number: EventNumber }),
  z.object({
    op: z.literal('replace_text'), in: z.enum(['event', 'initial_request', 'any']),
    number: EventNumber.optional(), find: z.string(), replace: z.string(),
  }),
  z.object({ op: z.literal('pad_noise'), count: z.number().int().nonnegative(), seed: z.number().default(1) }),
  z.object({ op: z.literal('set_detail'), key: z.string(), value: z.string() }),
]);
export type CaseEdit = z.infer<typeof CaseEdit>;

export const Perturbation = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), title: z.string(), description: z.string(),
  appliesTo: z.array(z.string()).min(1), edits: z.array(CaseEdit).default([]), expected: Expected.optional(),
  rubric: z.array(RubricItem).default([]), dropRubric: z.array(z.string()).default([]),
  hiddenFacts: z.array(HiddenFact).default([]), faults: z.array(FaultSpec).default([]),
  planted: z.string().optional(), tags: z.array(z.string()).default([]),
});
export type Perturbation = z.infer<typeof Perturbation>;
export type PerturbationInput = z.input<typeof Perturbation>;

export const EscalationTwin = z.object({
  scenario: z.string(), context: z.string().optional(), question: z.string().optional(),
});
export type EscalationTwin = z.infer<typeof EscalationTwin>;
export type EscalationTwinInput = z.input<typeof EscalationTwin>;

export const ActionMapEntry = z.object({
  tool: z.string(), kind: ActionKind, to: PartyRole.optional(), toPath: z.string().optional(),
  toRoles: z.record(z.string(), PartyRole).optional(), amountPath: z.string().optional(),
  textPaths: z.array(z.string()).default([]),
});
export type ActionMapEntry = z.infer<typeof ActionMapEntry>;
export type ActionMapEntryInput = z.input<typeof ActionMapEntry>;

export const EvalSuite = z.object({
  track: TrackId, trackFolder: z.string(), refPrefix: z.string(), roles: z.record(PartyRole, z.string()),
  agentSenders: z.array(z.string()).min(1), domainNotes: z.string(), scenarios: z.array(ScenarioSpec),
  perturbations: z.array(Perturbation).default([]), escalationTwins: z.array(EscalationTwin).default([]),
  actionMap: z.array(ActionMapEntry).default([]),
  splits: z.object({ smoke: z.array(z.string()), holdout: z.array(z.string()) }),
});
export type EvalSuite = z.infer<typeof EvalSuite>;
export type EvalSuiteInput = z.input<typeof EvalSuite>;
