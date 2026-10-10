import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKS } from '../index';
import { channelKind, parseHistory, parseIndex } from './cases';

const PUBLIC = resolve(import.meta.dirname, '../../../../data/public');
const hasData = existsSync(PUBLIC);

describe('parseIndex', () => {
  it('reads title, details and sections', () => {
    const idx = parseIndex(
      '# Case 007: Lounge lighting\n\n## Case details\n\n- **Status:** Completed\n- **Created:** 2025-09-27 14:10:08 UTC\n\n## Initial request\n\nTwo spotlights\n\n## Outcome\n\nDone',
    );
    expect(idx.title).toBe('Lounge lighting');
    expect(idx.details.get('status')).toBe('Completed');
    expect(idx.sections.get('initial request')).toBe('Two spotlights');
    expect(idx.sections.has('case details')).toBe(false);
  });
});

describe('parseHistory', () => {
  it('splits events and their fields from the body', () => {
    const [e] = parseHistory(
      '# Case 1 history\n\n<a id="event-001"></a>\n## 2025-09-27 14:10:09 UTC — event 001\n\n- **Channel:** SMS\n- **From:** Agency\n- **To:** Tenant\n\nHello there\n- not a field',
    );
    expect(e).toMatchObject({ number: '001', at: '2025-09-27T14:10:09.000Z', body: 'Hello there\n- not a field' });
    expect(e!.fields.get('channel')).toBe('SMS');
  });

  it('maps every supplied channel to a source kind', () => {
    expect(channelKind('Verified call')).toBe('call');
    expect(channelKind('Secure chat')).toBe('sms');
    expect(channelKind('Depot work queue')).toBe('ticket');
    expect(channelKind('Hold')).toBe('crm');
    expect(channelKind('Internal note')).toBe('note');
  });
});

describe.skipIf(!hasData)('supplied cases (data/public)', () => {
  for (const pack of Object.values(PACKS)) {
    it(`loads all 50 ${pack.label} cases`, async () => {
      const cases = await pack.loadCases(PUBLIC);
      expect(cases).toHaveLength(50);
      for (const c of cases) {
        expect(c.sources.length).toBeGreaterThan(1);
        expect(c.sources.filter((s) => s.kind === 'doc').every((s) => !s.body.startsWith('[Could not read'))).toBe(true);
      }
      expect(new Set(cases.map((c) => c.ref)).size).toBe(50);
    }, 60_000);

    it(`hides how ${pack.label} examples ended when asked`, async () => {
      const full = await pack.loadCases(PUBLIC);
      const hidden = await pack.loadCases(PUBLIC, { withhold: 'outcomes' });
      for (const c of hidden) {
        expect(c.sources[0]!.body).not.toMatch(/^## (Outcome|Overview|Next action at escalation)$/m);
        expect(c.sources[0]!.body).not.toMatch(/^- (status|completed):/m);
      }
      expect(full[0]!.sources[0]!.body).toMatch(/^## Outcome$/m);
    }, 60_000);
  }
});
