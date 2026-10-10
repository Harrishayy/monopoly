import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { type JudgeClient, type JudgeOptions } from '../schema';
import { buildJudgeRequest, DEFAULT_JUDGE_MODEL, estimateCostUsd, judgeOptionsFromEnv, judgeScenario } from './index';
import { judgeInput, judgeResponse, verdict } from './fixtures';

const dirs: string[] = [];
beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockImplementation(async () => { throw new Error('Network forbidden in judge tests'); }); });
afterEach(async () => {
  expect(globalThis.fetch).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
const options = (client: JudgeClient, overrides: Partial<JudgeOptions> = {}) => judgeOptionsFromEnv({}, { client, cacheDir: null, ...overrides });
async function cacheDir(): Promise<string> { const dir = await mkdtemp(join(tmpdir(), 'casework-judge-')); dirs.push(dir); return dir; }

describe('judge options and requests', () => {
  it('parses defaults, environment and overrides', () => {
    expect(judgeOptionsFromEnv({})).toMatchObject({ enabled: true, model: DEFAULT_JUDGE_MODEL, effort: 'high', samples: 1, concurrency: 4, fallbacks: true });
    expect(judgeOptionsFromEnv({}).cacheDir).toMatch(/cache\/judge$/);
    expect(judgeOptionsFromEnv({ MODEL_JUDGE: 'local', JUDGE_EFFORT: 'xhigh', JUDGE_SAMPLES: '3', JUDGE_CONCURRENCY: '2', JUDGE_FALLBACKS: 'off' })).toMatchObject({ model: 'local', effort: 'xhigh', samples: 3, concurrency: 2, fallbacks: false });
    expect(judgeOptionsFromEnv({ JUDGE_EFFORT: 'bad', JUDGE_SAMPLES: 'bad' }, { effort: 'low', samples: 2, enabled: false, cacheDir: null })).toMatchObject({ effort: 'low', samples: 2, enabled: false, cacheDir: null });
    for (const env of [{ JUDGE_EFFORT: 'bad' }, { JUDGE_SAMPLES: '0' }, { JUDGE_SAMPLES: 'NaN' }, { JUDGE_CONCURRENCY: '1.5' }, { JUDGE_CONCURRENCY: 'Infinity' }]) expect(() => judgeOptionsFromEnv(env)).toThrow();
  });

  it('includes all context and run evidence, keeping the system identical across scenarios', () => {
    const input = judgeInput();
    const request = buildJudgeRequest(input, { model: DEFAULT_JUDGE_MODEL, effort: 'high' });
    expect(request.sample).toBe(0);
    for (const text of [input.materialized.visibleText, input.suite.domainNotes, 'customer: Customer', 'event 006 · 2026-01-01 10:00:00 UTC · Email · Party → Desk\nLater confirmation arrived.', 'The job was completed.', 'Status: Complete', input.materialized.spec.historyDeviates!, 'confirm-scope · required · scope · 3 · all · has-check: false', 'no-spend · prohibited · spend · 3 · all · has-check: true', 'Evidence: event-005', '24000 pence']) expect(request.context).toContain(text);
    expect(request.context).toContain('x'.repeat(3000));
    expect(request.context).not.toContain('x'.repeat(3001));
    for (const text of [input.answer!, input.reasoning!, '0 · tool.called', 'args={"text":"Please confirm the job scope."} status=succeeded', 'confidence=0.8 citations=["event-005"]', '3 · action.blocked', 'queue=Operations desk', 'Scope pending.', 'outcome=needs_info', 'no-spend · ok · major · spend · No spend action succeeded.']) expect(request.output).toContain(text);
    const other = judgeInput(); other.materialized.spec.title = 'Another scenario'; other.materialized.visibleText = 'Different case.';
    expect(buildJudgeRequest(other, request, 2).system).toBe(request.system);
    expect(buildJudgeRequest(other, request, 2).context).not.toBe(request.context);
  });

  it('labels missing artifacts and caps only the trace at 12000 characters', () => {
    const input = judgeInput(); input.answer = null; input.reasoning = null; input.events = null;
    expect(buildJudgeRequest(input, { model: 'local', effort: 'high' }).output).toContain('## ANSWER.md\n(missing)\n\n## REASONING.md\n(missing)\n\n## Trace\n(missing)');
    input.events = Array.from({ length: 500 }, (_, seq) => ({ type: 'step.read' as const, seq, at: '2026-01-01T00:00:00Z', runId: 'test', sourceIds: [], summary: 'A'.repeat(100) }));
    const request = buildJudgeRequest(input, { model: 'local', effort: 'high' });
    expect(request.output.split('## Trace\n')[1]!.split('\n\n## Deterministic checks')[0]!.length).toBe(12000);
    expect(request.context).toContain(input.materialized.visibleText);
  });
});

describe('judge scenario', () => {
  it('returns success, model, usage and cost', async () => {
    const complete = vi.fn(async () => judgeResponse());
    const result = await judgeScenario(judgeInput(), options({ complete }));
    expect(result).toMatchObject({ error: null, model: DEFAULT_JUDGE_MODEL, samples: 1, agreement: null, cached: false, usage: judgeResponse().usage, costUsd: 0.0096 });
    expect(result.verdict).toEqual(verdict());
    expect(result.verdict?.items.every(item => item.uncertain === false)).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('caches successful calls, charges zero on hits, and keys effort, output and sample', async () => {
    const complete = vi.fn(async () => judgeResponse());
    const opts = options({ complete }, { cacheDir: await cacheDir() });
    const first = await judgeScenario(judgeInput(), opts);
    const second = await judgeScenario(judgeInput(), opts);
    expect(second).toMatchObject({ verdict: first.verdict, cached: true, costUsd: 0, usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 } });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(await judgeScenario(judgeInput(), { ...opts, client: undefined })).toMatchObject({ cached: true, costUsd: 0 });
    await judgeScenario(judgeInput(), { ...opts, effort: 'low' });
    const changed = judgeInput(); changed.answer = 'Different output.';
    await judgeScenario(changed, opts);
    await judgeScenario(judgeInput(), { ...opts, samples: 2 });
    expect(complete).toHaveBeenCalledTimes(4);
    expect((await readdir(opts.cacheDir!)).every((name) => /^[0-9a-f]{64}\.json$/.test(name))).toBe(true);
  });

  it('recovers corrupt cache entries and counts only uncached samples', async () => {
    const complete = vi.fn(async () => judgeResponse());
    const opts = options({ complete }, { cacheDir: await cacheDir(), samples: 2 });
    await judgeScenario(judgeInput(), opts);
    const files = await readdir(opts.cacheDir!);
    await writeFile(join(opts.cacheDir!, files[0]!), '{broken');
    const result = await judgeScenario(judgeInput(), opts);
    expect(result.cached).toBe(false);
    expect(result.usage).toEqual(judgeResponse().usage);
    expect(complete).toHaveBeenCalledTimes(3);
    expect(JSON.parse(await readFile(join(opts.cacheDir!, files[0]!), 'utf8')).verdict).toEqual(verdict());
  });

  it('defaults uncertainty in cached verdicts written before the field existed', async () => {
    const complete = vi.fn(async () => judgeResponse());
    const opts = options({ complete }, { cacheDir: await cacheDir() });
    await judgeScenario(judgeInput(), opts);
    const path = join(opts.cacheDir!, (await readdir(opts.cacheDir!))[0]!);
    const value = verdict();
    await writeFile(path, JSON.stringify({ ...judgeResponse(), verdict: {
      ...value, items: value.items.map(({ uncertain, ...item }) => item),
    } }));
    const cached = await judgeScenario(judgeInput(), opts);
    expect(cached).toMatchObject({ cached: true, costUsd: 0, verdict: value });
    expect(cached.verdict?.items.every(item => item.uncertain === false)).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('merges three samples, breaks ties conservatively, and measures agreement', async () => {
    const values = [verdict(), verdict(), verdict()];
    values[1]!.items[0]!.status = 'partial'; values[2]!.items[0]!.status = 'missed';
    values[1]!.items[1]!.status = 'partial'; values[2]!.items[1]!.status = 'partial';
    values[1]!.items[2]!.status = 'not_applicable'; values[2]!.items[2]!.status = 'not_applicable';
    values[1]!.decision.observed = 'wait'; values[2]!.decision.observed = 'close';
    values[1]!.usability.score = 1; values[2]!.usability.score = 2;
    values[1]!.clairvoyance = { found: true, details: 'Used a later fact.' };
    values[0]!.unsupportedClaims = [{ claim: 'Action completed.', explanation: 'No call.' }];
    values[1]!.unsupportedClaims = [{ claim: 'Action completed.', explanation: 'Duplicate.' }, { claim: 'Confirmation received.', explanation: 'No visible fact.' }];
    const complete = vi.fn(async (request) => judgeResponse(values[request.sample]));
    const result = await judgeScenario(judgeInput(), options({ complete }, { samples: 3 }));
    expect(result.verdict?.items.map((item) => item.status)).toEqual(['missed', 'partial', 'not_violated', 'not_violated']);
    expect(result.verdict?.items.map((item) => item.uncertain)).toEqual([true, true, true, false]);
    expect(result.verdict?.items[0]?.explanation).toContain('Samples disagreed');
    expect(result.agreement).toBe(0.25);
    expect(result.verdict).toMatchObject({ decision: { observed: 'ask', match: 'primary' }, usability: { score: 2 }, clairvoyance: { found: true }, topIssue: values[0]!.topIssue, fixArea: values[0]!.fixArea });
    expect(result.verdict?.unsupportedClaims.map((entry) => entry.claim)).toEqual(['Action completed.', 'Confirmation received.']);
    expect(result.usage.inputTokens).toBe(3000);
  });

  it('takes majority decision and recomputes acceptable/wrong match', async () => {
    for (const [observed, match] of [['wait', 'acceptable'], ['close', 'wrong']] as const) {
      const values = [verdict(), verdict(), verdict()];
      values[1]!.decision.observed = observed; values[2]!.decision.observed = observed;
      const result = await judgeScenario(judgeInput(), options({ complete: async (req) => judgeResponse(values[req.sample]) }, { samples: 3 }));
      expect(result.verdict?.decision).toMatchObject({ observed, match });
    }
  });

  it('normalizes missing, extra and duplicate item ids', async () => {
    const value = verdict(); value.items = [value.items[0]!, { ...value.items[0]!, status: 'missed' }, { ...value.items[0]!, id: 'unknown' }];
    const result = await judgeScenario(judgeInput(), options({ complete: async () => judgeResponse(value) }));
    expect(result.verdict?.items.map((item) => item.id)).toEqual(judgeInput().materialized.spec.rubric.map((item) => item.id));
    expect(result.verdict?.items[1]).toMatchObject({ status: 'not_applicable', explanation: 'not graded by judge', uncertain: false });
  });

  it('returns errors, refuses invalid responses, and never caches failures', async () => {
    const dir = await cacheDir();
    const failures: JudgeClient[] = [
      { complete: async () => { throw new Error('Judge declined (category: test)'); } },
      { complete: async () => { throw 'local failure'; } },
      { complete: async () => ({ ...judgeResponse(), stopReason: 'refusal' }) },
      { complete: async () => ({ ...judgeResponse(), stopReason: 'max_tokens' }) },
      { complete: async () => { const response = judgeResponse(); response.verdict.usability.score = 9; return response; } },
    ];
    for (const client of failures) {
      const result = await judgeScenario(judgeInput(), options(client, { cacheDir: dir }));
      expect(result.verdict).toBeNull(); expect(result.error).toBeTruthy(); expect(result.cached).toBe(false);
    }
    expect(await readdir(dir)).toEqual([]);
    const authentication = new Anthropic.AuthenticationError(401, { type: 'authentication_error' }, 'Invalid credentials', new Headers());
    const result = await judgeScenario(judgeInput(), options({ complete: async () => { throw authentication; } }));
    expect(result.error).toBe('Judge unavailable: no valid Anthropic credentials (set ANTHROPIC_API_KEY, use --backend claude-code after `claude` login, or --judge off)');
  });

  it('disabled path does no work', async () => {
    const complete = vi.fn(async () => judgeResponse());
    const result = await judgeScenario(judgeInput(), options({ complete }, { enabled: false }));
    expect(result).toEqual({ verdict: null, model: DEFAULT_JUDGE_MODEL, samples: 0, agreement: null, cached: false, usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: null, error: 'judge disabled' });
    expect(complete).not.toHaveBeenCalled();
  });

  it('contains invalid configuration and cache-write failures without throwing', async () => {
    const complete = vi.fn(async () => judgeResponse());
    expect(await judgeScenario(judgeInput(), { ...options({ complete }), samples: 0 })).toMatchObject({ verdict: null, error: 'samples must be an integer >= 1' });
    expect(complete).not.toHaveBeenCalled();
    const dir = await cacheDir();
    const file = join(dir, 'file'); await writeFile(file, 'Not a directory.');
    const result = await judgeScenario(judgeInput(), options({ complete }, { cacheDir: file }));
    expect(result.verdict).toBeNull(); expect(result.error).toBeTruthy();
    expect(result.usage).toEqual(judgeResponse().usage);
  });

  it('shares concurrency limits between scenarios', async () => {
    let active = 0; let maximum = 0;
    const client: JudgeClient = { complete: async () => {
      active++; maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5)); active--;
      return judgeResponse();
    } };
    await Promise.all(Array.from({ length: 6 }, () => judgeScenario(judgeInput(), options(client, { concurrency: 2 }))));
    expect(maximum).toBe(2);
  });
});

describe('judge cost', () => {
  it('uses all four token categories and rounds to four decimals', () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 1_000_000 };
    expect(estimateCostUsd('claude-opus-5-5', usage)).toBe(29.2);
    expect(estimateCostUsd('claude-sonnet-5-5', usage)).toBe(14.7);
    expect(estimateCostUsd('claude-haiku-5-5', usage)).toBe(0.735);
    expect(estimateCostUsd('local', usage)).toBeNull();
    expect(estimateCostUsd('claude-opus-5-5', { ...usage, inputTokens: 1, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })).toBe(0);
  });
});
