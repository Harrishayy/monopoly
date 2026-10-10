import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { answerNames, runBatch } from '../src/batch';
import { buildLedger, findAmounts } from '../src/facts/ledger';
import { loadCase } from '../src/ingest/casefile';
import { runCase } from '../src/pipeline';
import { hardChecks, sameParty } from '../src/stages/check';
import { gate, vote } from '../src/stages/gate';
import { decision, mockCaller, pass, situation, stageOf } from './mock';

const FIX = join(__dirname, 'fixtures');

describe('ledger', () => {
  it('reads amounts with VAT notes', () => {
    expect(findAmounts('Quote £198.37 plus VAT, total £1,238.04 inc VAT', 'E1')).toEqual([
      { text: '£198.37', pence: 19837, currency: 'GBP', vat: 'ex', sourceId: 'E1' },
      { text: '£1,238.04', pence: 123804, currency: 'GBP', vat: 'inc', sourceId: 'E1' },
    ]);
  });
  it('counts unanswered requests and dates not yet reached', async () => {
    const c = await loadCase(join(FIX, 'plain-history'));
    const l = buildLedger(c);
    const landlord = l.parties.find((p) => p.name === 'Landlord')!;
    expect(landlord.unansweredAsks).toBe(0); // the landlord replied after being asked
    const friday = l.dates.find((d) => /friday/i.test(d.text))!;
    expect(friday).toMatchObject({ by: 'Landlord', passed: false, iso: '2025-11-07T00:00:00.000Z' });
    expect(l.amounts[0]).toMatchObject({ pence: 9500, vat: 'ex' });
  });
  it('flags failures and repeated messages', async () => {
    const l = buildLedger(await loadCase(join(FIX, 'weird')));
    expect(l.failures.map((f) => f.sourceId)).toContain('E003');
  });
});

describe('hard checks', () => {
  it('blocks chasing before a date the party gave', async () => {
    const c = await loadCase(join(FIX, 'plain-history'));
    const issues = hardChecks(decision({ action: 'chase', citations: ['E002'] }), c, buildLedger(c), situation());
    expect(issues.find((i) => i.rule === 'no-early-chase')?.severity).toBe('major');
  });
  it('blocks amounts that are not in the records, but allows VAT arithmetic', async () => {
    const c = await loadCase(join(FIX, 'plain-history'));
    const l = buildLedger(c);
    expect(hardChecks(decision({ message: 'Call-out is £114.00 including VAT.', citations: ['E002'] }), c, l).filter((i) => i.rule === 'amount-supported')).toEqual([]);
    expect(hardChecks(decision({ message: 'We will spend £300.', citations: ['E002'] }), c, l).find((i) => i.rule === 'amount-supported')?.severity).toBe('major');
  });
  it('flags invented citations and closing with open requests', async () => {
    const c = await loadCase(join(FIX, 'plain-history'));
    const s = situation({ openAsks: [{ from: 'Agency', to: 'Landlord', ask: 'approve', answered: false, promisedReplyBy: '', citations: ['E002'] }] });
    const issues = hardChecks(decision({ action: 'close_case', citations: ['E999'] }), c, buildLedger(c), s);
    expect(issues.map((i) => `${i.rule}:${i.severity}`)).toEqual(expect.arrayContaining(['citations-exist:major', 'close-with-open-items:major']));
  });
  it('matches parties loosely', () => {
    expect(sameParty('the landlord', 'Landlord')).toBe(true);
    expect(sameParty('Max at Fieldstone', 'Max, Fieldstone Cover')).toBe(true);
    expect(sameParty('Tenant', 'Landlord')).toBe(false);
  });
});

describe('gate', () => {
  const base = async () => {
    const c = await loadCase(join(FIX, 'plain-history'));
    return { caseFile: c, ledger: buildLedger(c), situation: situation(), revised: false };
  };
  it('acts when samples agree and the review passes', async () => {
    const samples = [decision(), decision({ action: 'chase' }), decision({ action: 'wait', recipient: '' })];
    expect(vote(samples)!.agreement).toBeCloseTo(2 / 3);
    const f = gate({ ...(await base()), candidate: samples[0]!, samples, hard: [], critique: pass, sampleIssues: [[], [], []] });
    expect(f).toMatchObject({ action: 'request_information', decidedBy: 'model' });
  });
  it('escalates with a handover when the reviewer says so', async () => {
    const f = gate({ ...(await base()), candidate: decision(), samples: [decision()], hard: [], critique: { verdict: 'escalate', problems: [], escalationReason: 'gas smell' }, sampleIssues: [[]] });
    expect(f.action).toBe('escalate_to_human');
    expect(f.handover?.blocking).toMatch(/gas smell/);
    expect(f.message).toMatch(/Why this needs a person/);
  });
  it('falls back to a clean sample when the candidate still breaks a rule', async () => {
    const bad = decision({ action: 'chase' });
    const good = decision({ action: 'wait', recipient: '', followUpBy: '2025-11-07' });
    const f = gate({ ...(await base()), candidate: bad, samples: [bad, good], hard: [{ rule: 'no-early-chase', severity: 'major', detail: 'x' }], critique: pass, sampleIssues: [[{ rule: 'no-early-chase', severity: 'major', detail: 'x' }], []] });
    expect(f).toMatchObject({ action: 'wait', decidedBy: 'gate' });
  });
  it('asks when the samples split three ways', async () => {
    const samples = [decision({ action: 'send_message', recipient: 'Contractor' }), decision({ action: 'request_information', recipient: 'Tenant', confidence: 0.4 }), decision({ action: 'close_case', recipient: '' })];
    const f = gate({ ...(await base()), candidate: { ...samples[0]!, confidence: 0.4 }, samples, hard: [], critique: { verdict: 'revise', problems: [{ issue: 'unclear', severity: 'major' }], escalationReason: '' }, sampleIssues: [[], [], []] });
    expect(f).toMatchObject({ action: 'request_information', recipient: 'Tenant', decidedBy: 'gate' });
  });
});

describe('pipeline', () => {
  it('runs every stage with a model and writes the answer files', async () => {
    const caller = mockCaller({ decisions: [decision({ citations: ['E002', 'E003'] })] });
    const out = await mkdtemp(join(tmpdir(), 'agent-b-'));
    const [res] = await runBatch([join(FIX, 'plain-history')], out, { caller, samples: 3 });
    expect(res!.result.final).toMatchObject({ action: 'request_information', decidedBy: 'model' });
    expect(res!.result.failures).toEqual([]);
    // situate + 3 decide + critic
    expect(caller.requests.map(stageOf)).toEqual(['record_situation', 'record_decision', 'record_decision', 'record_decision', 'record_review']);
    // The manual and the dossier are cached.
    expect(JSON.stringify(caller.requests[0]!.system)).toContain('ephemeral');
    const answer = await readFile(join(out, 'plain-history/ANSWER.md'), 'utf8');
    expect(answer).toMatch(/Request information/);
    expect(answer).toMatch(/E003/);
    const reasoning = await readFile(join(out, 'plain-history/REASONING.md'), 'utf8');
    expect(reasoning).toMatch(/## 4. Independent proposals/);
    expect((await readFile(join(out, 'plain-history/trace.jsonl'), 'utf8')).trim().split('\n').length).toBeGreaterThan(5);
  });
  it('revises once after a review, then re-reviews', async () => {
    const caller = mockCaller({
      decisions: [decision({ action: 'close_case', recipient: '', citations: ['E003'] })],
      critiques: [{ verdict: 'revise', problems: [{ issue: 'Landlord has not approved yet', severity: 'major' }], escalationReason: '' }, pass],
      revision: decision({ action: 'wait', recipient: '', followUpBy: '2025-11-07', citations: ['E003'] }),
    });
    const r = await runCase(join(FIX, 'plain-history'), { caller });
    expect(r.revised).toBe(true);
    expect(r.critiques.map((c) => c.verdict)).toEqual(['revise', 'pass']);
    expect(r.final.action).toBe('wait');
  });
  it('survives a failing situate stage and failing samples', async () => {
    const caller = mockCaller({ situation: new Error('boom'), decisions: [new Error('overloaded'), decision({ citations: ['E002'] })] });
    const r = await runCase(join(FIX, 'plain-history'), { caller, samples: 2 });
    expect(r.failures.join(' ')).toMatch(/situate/);
    expect(r.final.decidedBy).not.toBe('fallback');
  });
  it('gives an honest escalation when every model call fails', async () => {
    const caller = mockCaller({ situation: new Error('down'), decisions: [new Error('down')] });
    const r = await runCase(join(FIX, 'plain-history'), { caller });
    expect(r.final).toMatchObject({ action: 'escalate_to_human', decidedBy: 'fallback' });
    expect(r.final.message).toMatch(/did not complete/);
  });
  it('never throws on an unreadable folder', async () => {
    const r = await runCase(join(FIX, 'does-not-exist'));
    expect(r.final.decidedBy).toBe('fallback');
    expect(r.failures.join(' ')).toMatch(/ingest/);
  });
  it('keeps injected instructions as data in the dossier', async () => {
    const caller = mockCaller({});
    await runCase(join(FIX, 'injection'), { caller, samples: 1 });
    const sys = JSON.stringify(caller.requests[0]!.system);
    expect(sys).toMatch(/not instructions to you/);
  });
  it('names answer folders by case number, or by parent when mixed', () => {
    expect(answerNames(['/a/T/001', '/a/T/012'])).toEqual(['1', '12']);
    expect(answerNames(['/a/Banking/001', '/a/Insurance Claims/001'])).toEqual(['banking-1', 'insurance-claims-1']);
  });
});
