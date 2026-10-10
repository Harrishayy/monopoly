import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Agent, AgentDecision } from '../agent';
import { pool } from '../b/batch';
import { type Cut, cutId, PROPERTY_DIR } from './labels';

/** One cut scored for one agent. The same rule for every agent: is the chosen action one the team would accept? */
export interface Scored {
  agent: string;
  cut: string;
  case: string;
  kind: Cut['kind'];
  action: string;
  accept: string[];
  pass: boolean;
  /** Missed, but went to a party the label accepts (e.g. tenant.ask where tenant.update was wanted). */
  near: boolean;
  prohibited: boolean;
  decidedBy: string;
  ms: number;
  failures: string[];
  reason: string;
  /** Tokens and estimated cost, when the agent reports them. */
  usage?: AgentDecision['usage'];
}

export function score(agent: string, cut: Cut, d: AgentDecision): Scored {
  const pass = cut.accept.includes(d.action);
  const party = (a: string) => (a.includes('.') ? a.split('.')[0] : undefined);
  return {
    agent,
    cut: cutId(cut),
    case: cut.case,
    kind: cut.kind,
    action: d.action,
    accept: cut.accept,
    pass,
    near: !pass && !!party(d.action) && party(d.action) !== 'case' && cut.accept.some((a) => party(a) === party(d.action)),
    prohibited: cut.prohibit.includes(d.action),
    decidedBy: d.decidedBy,
    ms: d.ms,
    failures: d.failures,
    reason: d.reason.slice(0, 400),
    usage: d.usage,
  };
}

export interface BenchOptions {
  /** Folder holding the case folders (default: the property examples). */
  caseRoot?: string;
  /** 'outcomes' for example cases; 'none' for cases that already end at the decision moment. */
  withhold?: 'none' | 'outcomes';
  concurrency?: number;
  offline?: boolean;
  log?: (line: string) => void;
}

export async function runBench(agents: Agent[], cuts: Cut[], outDir: string, opts: BenchOptions = {}): Promise<Scored[]> {
  await mkdir(outDir, { recursive: true });
  const jobs = agents.flatMap((agent) => cuts.map((cut) => ({ agent, cut })));
  let done = 0;
  const rows = await pool(jobs, opts.concurrency ?? 6, async ({ agent, cut }) => {
    const d = await agent.decide({ dir: join(opts.caseRoot ?? PROPERTY_DIR, cut.case), track: 'property', cutBefore: cut.cutBefore, asOf: cut.asOf, withhold: opts.withhold ?? 'outcomes', offline: opts.offline });
    const s = score(agent.id, cut, d);
    done++;
    opts.log?.(`[${done}/${jobs.length}] ${s.pass ? 'PASS' : s.prohibited ? 'BAD ' : 'MISS'} ${agent.id} ${s.cut} ${s.action}${s.pass ? '' : ` (accept: ${cut.accept.join(' | ')})`}`);
    return s;
  });
  rows.sort((a, b) => a.agent.localeCompare(b.agent) || a.cut.localeCompare(b.cut, undefined, { numeric: true }));
  await writeFile(join(outDir, 'results.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  await writeFile(join(outDir, 'SUMMARY.md'), summarise(rows));
  return rows;
}

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '–');

export function summarise(rows: Scored[], title = 'Bench', categories?: Record<string, string>): string {
  const agents = [...new Set(rows.map((r) => r.agent))];
  const line = (label: string, rs: Scored[]) =>
    `| ${label} | ${rs.length} | **${pct(rs.filter((r) => r.pass).length, rs.length)}** | ${pct(rs.filter((r) => r.near).length, rs.length)} | ${pct(rs.filter((r) => r.prohibited).length, rs.length)} | ${rs.filter((r) => /fallback|error|none/.test(r.decidedBy)).length} |`;
  const out = [`# ${title}`, '', `${new Date().toISOString()} · ${rows.length / Math.max(1, agents.length)} cuts per agent`, ''];
  out.push('| Agent · cuts | n | Accepted action | Near miss (right party) | Prohibited action | No real decision |', '|---|---|---|---|---|---|');
  for (const a of agents) {
    const rs = rows.filter((r) => r.agent === a);
    out.push(line(`**${a}** all`, rs), line(`${a} determined`, rs.filter((r) => r.kind === 'determined')), line(`${a} judgement`, rs.filter((r) => r.kind === 'judgement')));
  }
  if (categories) {
    const cats = [...new Set(Object.values(categories))].sort();
    out.push('', '## By category', '', `| Category | n | ${agents.map((a) => `${a} accepted`).join(' | ')} |`, `|---|---|${agents.map(() => '---').join('|')}|`);
    for (const c of cats) {
      const n = rows.filter((r) => r.agent === agents[0] && categories[r.case] === c).length;
      out.push(`| ${c} | ${n} | ${agents.map((ag) => { const rs = rows.filter((r) => r.agent === ag && categories[r.case] === c); return `${rs.filter((r) => r.pass).length}/${rs.length}`; }).join(' | ')} |`);
    }
    out.push('', '## Every case', '', `| Case | Category | Accepted | ${agents.map((a) => `${a} chose`).join(' | ')} |`, `|---|---|---|${agents.map(() => '---').join('|')}|`);
    for (const c of [...new Set(rows.map((r) => r.case))].sort()) {
      const first = rows.find((r) => r.case === c)!;
      out.push(`| ${c} | ${categories[c] ?? ''} | ${first.accept.map((a) => `\`${a}\``).join(' ')} | ${agents.map((ag) => { const r = rows.find((x) => x.agent === ag && x.case === c); return r ? `${r.pass ? '✓' : r.prohibited ? '✗⚠' : '✗'} \`${r.action}\`${r.decidedBy === 'error' ? ' (could not load)' : ''}` : ''; }).join(' | ')} |`);
    }
  }
  if (rows.some((r) => r.usage)) {
    out.push('', '## Cost', '', '| Agent | Cuts with usage | Input tokens | Output tokens | Total cost | Per cut |', '|---|---|---|---|---|---|');
    for (const a of agents) {
      const us = rows.filter((r) => r.agent === a && r.usage).map((r) => r.usage!);
      if (!us.length) {
        out.push(`| ${a} | 0 | – | – | not reported | – |`);
        continue;
      }
      const sum = (k: 'inputTokens' | 'outputTokens' | 'costUsd') => us.reduce((t, u) => t + (u[k] ?? 0), 0);
      out.push(`| ${a} | ${us.length} | ${sum('inputTokens').toLocaleString('en-GB')} | ${sum('outputTokens').toLocaleString('en-GB')} | $${sum('costUsd').toFixed(2)} | $${(sum('costUsd') / us.length).toFixed(4)} |`);
    }
  }
  out.push('', '## By expected action', '', `| Expected | n | ${agents.map((a) => `${a} accepted`).join(' | ')} |`, `|---|---|${agents.map(() => '---').join('|')}|`);
  const expected = new Map<string, number>();
  for (const r of rows.filter((x) => x.agent === agents[0])) for (const a of r.accept) expected.set(a, (expected.get(a) ?? 0) + 1);
  for (const [a, n] of [...expected].sort((x, y) => y[1] - x[1])) {
    out.push(`| \`${a}\` | ${n} | ${agents.map((ag) => { const rs = rows.filter((r) => r.agent === ag && r.accept.includes(a)); return pct(rs.filter((r) => r.pass).length, rs.length); }).join(' | ')} |`);
  }
  out.push('', '## Misses', '', '| Agent | Cut | Chose | Accepted |', '|---|---|---|---|');
  for (const r of rows.filter((x) => !x.pass)) out.push(`| ${r.agent} | ${r.cut}${r.prohibited ? ' ⚠' : ''} | \`${r.action}\` | ${r.accept.map((a) => `\`${a}\``).join(' ')} |`);
  return out.join('\n') + '\n';
}
