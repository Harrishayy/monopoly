/**
 * The common shape both agents answer in, so one bench can score them and one CLI can run them.
 * Each agent keeps its own engine; an adapter turns its output into an `AgentDecision`.
 */

export type AgentId = 'a' | 'b' | 'd';

export interface CaseRef {
  /** Case folder, e.g. data/public/Property Management/007. */
  dir: string;
  track: string;
}

export interface RunInput extends CaseRef {
  /** Hide everything from this event number on (evaluation cut points). */
  cutBefore?: number;
  /** The decision moment for the cut. */
  asOf?: string;
  /** 'outcomes' hides how an example case ended. */
  withhold: 'none' | 'outcomes';
  /** Run without the model (rules or fallback only). */
  offline?: boolean;
}

export interface AgentDecision {
  agent: AgentId;
  /**
   * The action in the track's own vocabulary when it has one (e.g. "landlord.send_quote"),
   * else a generic verb (e.g. "request_information").
   */
  action: string;
  recipient: string;
  channel: string;
  message: string;
  reason: string;
  /** 'model' | 'playbook' | 'gate' | 'fallback' … as the agent reports it. */
  decidedBy: string;
  confidence?: number;
  ms: number;
  failures: string[];
  /** Tokens and estimated cost of the model calls behind this decision, when the agent reports them. */
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; costUsd: number };
}

export interface Agent {
  id: AgentId;
  label: string;
  decide(input: RunInput): Promise<AgentDecision>;
  /** Write ANSWER.md, REASONING.md and trace.jsonl for each case under `outDir`. */
  answer(dirs: string[], outDir: string, opts: { track?: string; withhold: 'none' | 'outcomes'; offline?: boolean; concurrency?: number; log?: (l: string) => void }): Promise<{ name: string; decision: AgentDecision }[]>;
}
