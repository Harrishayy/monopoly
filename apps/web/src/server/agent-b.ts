import 'server-only';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Case } from '@casework/core';
import { agentB, agentC, configureEngineB, configureEngineC, ExampleBank, type Agent } from '@casework/agents';
import { DATA_DIR } from './config';

/** Agent B reads case folders, not loaded cases: find the folder this case came from. */
async function caseDir(c: Case): Promise<string | undefined> {
  const num = c.ref.split('-').at(-1)!;
  const tracks = await readdir(DATA_DIR, { withFileTypes: true }).catch(() => []);
  for (const t of tracks) {
    if (!t.isDirectory()) continue;
    const dir = join(DATA_DIR, t.name, num);
    const index = join(dir, 'index.md');
    if (!existsSync(index)) continue;
    const head = (await readFile(index, 'utf8')).split('\n', 1)[0] ?? '';
    if (head.includes(c.title)) return dir;
  }
  return undefined;
}

/**
 * Agent B with its few-shot memory: labelled moments from every case, retrieved by similarity.
 * The bank skips the case being decided, so a decision point never sees its own label. Built once per server.
 */
const g = globalThis as unknown as { __caseworkAgentB?: Promise<Agent> };
const agent = () =>
  (g.__caseworkAgentB ??= ExampleBank.build('all')
    .then((bank) => agentB({ examples: (c) => bank.render(c) }))
    .catch(() => agentB()));

/** Gives the shared engine B its few-shot memory, once per server. */
configureEngineB(agent);

const gC = globalThis as unknown as { __caseworkAgentC?: Promise<Agent> };
const agentCWithMemory = () =>
  (gC.__caseworkAgentC ??= ExampleBank.build('all')
    .then((bank) => agentC({ examples: (c) => bank.render(c) }))
    .catch(() => agentC()));

/** Gives the shared engine C the same few-shot memory, once per server. */
configureEngineC(agentCWithMemory);

/** The case folder for an example case, so a folder-based engine reads the supplied files rather than a re-render. */
export async function exampleDir(c: Case): Promise<string | undefined> {
  return c.ref.startsWith('LIVE-') ? undefined : caseDir(c);
}
