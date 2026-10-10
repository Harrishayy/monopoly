import type { Agent, AgentId } from './agent';
import { agentA } from './a';
import { agentB, type AgentBOptions } from './b';
import { agentD } from './d';

export interface RegistryOptions {
  /** Model for every call of either agent (default claude-haiku-5-5). */
  model?: string;
  b?: AgentBOptions;
}

/** Both agents behind one interface. Model choice is applied here so the two always run on the same model. */
export function getAgents(ids: AgentId[], opts: RegistryOptions = {}): Agent[] {
  const model = opts.model ?? process.env.AGENTS_MODEL ?? 'claude-haiku-5-5';
  // Agent A reads MODEL_DECIDE; agent B reads AGENT_B_MODEL_*.
  process.env.MODEL_DECIDE = model;
  process.env.AGENT_B_MODEL_DECIDE = model;
  // Agent D's voters follow the same model; its supervisor is set separately (AGENT_D_SUPERVISOR_MODEL).
  process.env.AGENT_D_MODEL = model;
  process.env.AGENT_B_MODEL_READ = model;
  process.env.AGENT_B_MODEL_FALLBACK = model;
  return ids.map((id) => {
    if (id === 'a') return agentA;
    if (id === 'b') return agentB(opts.b);
    if (id === 'd') return agentD;
    throw new Error(`Unknown agent "${id}" (expected a, b or d)`);
  });
}
