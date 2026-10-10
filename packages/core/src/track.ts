import type { z } from 'zod';
import type { Assessment, Autonomy, Case, TrackId } from './schema';

/** Labels a track uses for the same concepts, so UI code never hard-codes domain words. */
export interface Vocabulary {
  case: string;
  cases: string;
  customer: string;
  handler: string;
}

/** Browser-safe description of a track. Re-exported by @casework/tracks/meta. */
export interface TrackMeta {
  id: TrackId;
  label: string;
  vocabulary: Vocabulary;
}

export interface ToolContext {
  caseRef: string;
  runId: string;
  /** Pass to external APIs so a retried call cannot act twice. */
  idempotencyKey: string;
  signal: AbortSignal;
}

/** `read` tools are always allowed; `write` and `money` tools go through the policy guard. */
export type ToolEffect = 'read' | 'write' | 'money';

export interface AgentTool<I = unknown, O = unknown> {
  name: string;
  description: string;
  input: z.ZodType<I>;
  effect: ToolEffect;
  /** Who a write tool reaches, in plain words, e.g. "Landlord". Shown in ANSWERS. */
  recipient?: string;
  timeoutMs?: number;
  execute(input: I, ctx: ToolContext): Promise<O>;
}

export interface ToolCall {
  tool: string;
  args: unknown;
}

export type RuleResult = { ok: true } | { ok: false; why: string };

/** What a rule may look at besides the call itself. */
export interface RuleContext {
  case: Case;
  assessment?: Assessment;
}

export interface PolicyRule {
  /** e.g. "property.spend_limit". Appears in ANSWERS and the UI. */
  id: string;
  describe: string;
  /** Tool names this rule inspects. */
  appliesTo: string[];
  check(call: ToolCall, ctx: RuleContext): RuleResult;
}

export interface Policy {
  rules: PolicyRule[];
  /** Situations that always need a person. Given to the model and checked in decide. */
  mustEscalate: { id: string; describe: string }[];
}

export interface LoadCasesOptions {
  /** 'none' loads cases as supplied (Reality Test). 'outcomes' hides how example cases ended. */
  withhold?: 'none' | 'outcomes';
}

export interface TrackPack extends TrackMeta {
  loadCases(dataDir: string, opts?: LoadCasesOptions): Promise<Case[]>;
  /**
   * Deterministic read of a case: stage, facts, flags, playbook suggestions and barred actions.
   * Runs before the model. `asOf` defaults to the latest source time.
   */
  assess?(c: Case, opts?: { asOf?: string }): Assessment;
  tools: AgentTool<any, any>[];
  policy: Policy;
  systemPrompt: string;
  /** Default autonomy for this track. */
  autonomy: Autonomy;
}
