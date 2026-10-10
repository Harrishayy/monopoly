import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Case } from '@casework/core';
import { assess } from './assess';
import { amountsIn, partyOf, toEvents } from './events';
import { pack } from './index';
import { tools } from './tools';

const PUBLIC = resolve(import.meta.dirname, '../../../../data/public');
const hasData = existsSync(PUBLIC);

describe('events', () => {
  it('reads amounts in pence', () => {
    expect(amountsIn('Quote £172.51 + VAT, or £1,370 total; invoice GBP 75.11')).toEqual([17251, 137000, 7511]);
  });

  it('tells the agency from its automation', () => {
    expect(partyOf('Agency / system', 'Update', 'Maintenance provider assigned')).toBe('system');
    expect(partyOf('Agency / system', 'Email', 'Good morning, the tenant has reported')).toBe('agency');
    expect(partyOf('Maintenance provider', 'Email', '')).toBe('contractor');
    expect(partyOf('Cedar Homes', 'Email', '')).toBe('contractor');
    expect(partyOf('Not specified', 'Note', '')).toBe('none');
  });
});

const at = (c: Case, cut: number) => ({
  ...c,
  sources: c.sources.filter((s) => !/:event-(\d+)$/.test(s.id) || Number(s.id.match(/(\d+)$/)![1]) < cut),
});
const timeOf = (c: Case, n: number) => c.sources.find((s) => s.id.endsWith(`event-${String(n).padStart(3, '0')}`))!.receivedAt;

describe.skipIf(!hasData)('assess on the example cases', () => {
  let cases: Map<string, Case>;
  beforeAll(async () => {
    cases = new Map((await pack.loadCases(PUBLIC, { withhold: 'outcomes' })).map((c) => [c.ref, c]));
  }, 60_000);

  it('asks the landlord first and bars sending a contractor (PM-011 before event 4)', () => {
    const c = cases.get('PM-011')!;
    const a = assess(at(c, 4), { asOf: timeOf(c, 4) });
    expect(a.stage).toMatch(/landlord not yet asked/);
    expect(a.suggested[0]!.action).toBe('landlord.request_approval');
    expect(a.barred.map((b) => b.action)).toContain('contractor.assign');
  });

  it('assigns once the landlord says yes (PM-011 before event 10)', () => {
    const c = cases.get('PM-011')!;
    const a = assess(at(c, 10), { asOf: timeOf(c, 10) });
    expect(a.stage).toMatch(/Landlord approved/);
    expect(a.suggested[0]!.action).toBe('contractor.assign');
    expect(a.barred.map((b) => b.action)).not.toContain('contractor.assign');
    expect(a.facts.some((f) => f.sourceIds.includes('PM-011:event-009'))).toBe(true);
  });

  it('chases a silent landlord after three days and never closes an open job (PM-016 before event 6)', () => {
    const c = cases.get('PM-016')!;
    const a = assess(at(c, 6), { asOf: timeOf(c, 6) });
    expect(a.waitingOn?.party).toBe('landlord');
    expect(a.suggested.map((s) => s.action)).toContain('landlord.chase');
    expect(a.barred.map((b) => b.action)).toContain('case.close');
  });

  it('dates attachments by the event that brought them, so cuts cannot see later documents', () => {
    const invoice = cases.get('PM-003')!.sources.find((s) => s.id.endsWith('attachment-02-cleaning-invoice.pdf'))!;
    expect((invoice.meta as { event?: number }).event).toBeGreaterThan(10);
    expect(invoice.receivedAt).not.toBe(cases.get('PM-003')!.sources[0]!.receivedAt);
  });

  it('sets system noise aside', () => {
    const a = assess(cases.get('PM-011')!);
    expect(a.noise.some((n) => n.sourceId === 'PM-011:event-028')).toBe(true);
  });

  it('assesses every case without throwing, and every fact cites a real source', () => {
    for (const c of cases.values()) {
      const ids = new Set(c.sources.map((s) => s.id));
      const a = assess(c);
      for (const f of [...a.facts, ...a.flags]) for (const id of f.sourceIds) expect(ids.has(id)).toBe(true);
      expect(toEvents(c).length).toBeGreaterThan(0);
    }
  });
});

describe('eval cuts', () => {
  const cuts = JSON.parse(readFileSync(resolve(import.meta.dirname, 'eval/cuts.json'), 'utf8')) as {
    case: string;
    accept: string[];
    prohibit: string[];
  }[];
  const names = new Set(tools.map((t) => t.name));

  it('only use actions the pack offers, and never both accept and prohibit one', () => {
    expect(cuts.length).toBeGreaterThan(200);
    for (const c of cuts) {
      for (const a of [...c.accept, ...c.prohibit]) expect(names.has(a)).toBe(true);
      expect(c.accept.some((a) => c.prohibit.includes(a))).toBe(false);
    }
  });
});
