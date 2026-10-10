// @vitest-environment node
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), 'casework-demo-')), 'test.db');
process.env.TRACK = 'property';

const { prepareVideoDemo, videoDemoState } = await import('./demo-video');
const store = await import('./store');

describe('prepareVideoDemo', () => {
  it('seeds the heating email chain, a sent tenant reply, and a held landlord draft', () => {
    const first = prepareVideoDemo({ reset: true });
    expect(first.caseRef).toBe('LIVE-DEMO');
    expect(first.prepared).toBe(true);
    expect(first.title).toMatch(/heating/i);

    const c = store.liveCase('LIVE-DEMO');
    expect(c?.sources.some((s) => s.kind === 'email' && s.body.includes('two-year-old'))).toBe(true);
    expect(c?.sources.some((s) => s.kind === 'crm')).toBe(true);

    const outbound = store.listOutbound({ caseRef: 'LIVE-DEMO' });
    expect(outbound.some((o) => o.status === 'sent' && o.recipient === 'tenant')).toBe(true);
    expect(outbound.some((o) => o.status === 'awaiting_approval' && o.recipient === 'landlord')).toBe(true);

    const again = prepareVideoDemo();
    expect(again.prepared).toBe(true);
    expect(store.sourcesFor('LIVE-DEMO').filter((s) => s.kind === 'email')).toHaveLength(2);

    prepareVideoDemo({ reset: true });
    expect(videoDemoState().prepared).toBe(true);
    expect(store.listOutbound({ caseRef: 'LIVE-DEMO' })).toHaveLength(2);
  });
});
