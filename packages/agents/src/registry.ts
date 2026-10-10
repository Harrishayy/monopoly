import type { Agent, AgentId } from './agent';
import { agentA } from './a';
import { agentB, type AgentBOptions } from './b';
import { agentC, type AgentCOptions } from './c';
import { agentD } from './d';

export interface RegistryOptions {
  /** Model for every call of agents A and B (default claude-haiku-5-5), and agent C's read stage. */
  model?: string;
  /** Decide-stage model. Applies to B and C; C defaults to claude-opus-5-5 when unset. */
  decideModel?: string;
  /** Reviewer model. Applies to B and C; C defaults to claude-sonnet-5-5 when unset. */
  criticModel?: string;
  b?: AgentBOptions;
  c?: AgentCOptions;
}

/** All agents behind one interface. A and B share one model unless a stage model is given. */
export function getAgents(ids: AgentId[], opts: RegistryOptions = {}): Agent[] {
  const model = opts.model ?? process.env.AGENTS_MODEL ?? 'claude-haiku-5-5';
  // Agent A reads MODEL_DECIDE; agent B reads AGENT_B_MODEL_*.
  process.env.MODEL_DECIDE = opts.decideModel ?? model;
  process.env.AGENT_B_MODEL_DECIDE = opts.decideModel ?? model;
  process.env.AGENT_B_MODEL_CRITIC = opts.criticModel ?? opts.decideModel ?? model;
  // Agent D's voters follow the same model; its supervisor is set separately (AGENT_D_SUPERVISOR_MODEL).
  process.env.AGENT_D_MODEL = model;
  process.env.AGENT_B_MODEL_READ = model;
  process.env.AGENT_B_MODEL_FALLBACK = model;
  return ids.map((id) => {
    if (id === 'a') return agentA;
    if (id === 'b') return agentB(opts.b);
    if (id === 'c') return agentC({ ...opts.c, models: { read: opts.model, decide: opts.decideModel, critic: opts.criticModel, ...opts.c?.models } });
    if (id === 'd') return agentD;
    throw new Error(`Unknown agent "${id}" (expected a, b, c or d)`);
  });
}
