import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), 'casework-store-')), 'test.db');
const store = await import('./store');

const now = new Date().toISOString();
store.insertCase({ ref: 'LIVE-001', title: 'Leak', customerName: 'Sam', contact: 'sam@example.com', channel: 'email', status: 'new', createdAt: now, updatedAt: now });
store.insertSource('LIVE-001', { id: 'LIVE-001:event-1', kind: 'email', title: 'Leak', receivedAt: now, body: 'Leak', meta: { threadId: 't1' } });
store.insertOutbound({ id: 'o1', caseRef: 'LIVE-001', runId: null, channel: 'email', recipient: 'Tenant', address: 'sam@example.com', subject: null, body: 'Hi', status: 'awaiting_approval', why: null, createdAt: now, sentAt: null, error: null });

describe('deleting a live case', () => {
  it('hides it everywhere without erasing it, and restores it', () => {
    expect(store.setCaseHidden('LIVE-001', true)).toBe(true);
    expect(store.listLiveCaseRows()).toEqual([]);
    expect(store.liveCase('LIVE-001')).toBeUndefined();
    expect(store.findOpenCaseByContact('sam@example.com')).toBeUndefined();
    expect(store.findCaseByThread('t1')).toBeUndefined();
    expect(store.listOutbound({ status: 'awaiting_approval' })).toEqual([]);
    // Still on record.
    expect(store.getLiveCaseRow('LIVE-001')?.title).toBe('Leak');
    expect(store.listOutbound({ caseRef: 'LIVE-001' })).toHaveLength(1);
    // Refs are never reissued.
    expect(store.nextRef()).toBe('LIVE-002');

    expect(store.setCaseHidden('LIVE-001', false)).toBe(true);
    expect(store.listLiveCaseRows().map((c) => c.ref)).toEqual(['LIVE-001']);
    expect(store.findOpenCaseByContact('sam@example.com')?.ref).toBe('LIVE-001');
  });

  it('reports an unknown case', () => {
    expect(store.setCaseHidden('LIVE-999', true)).toBe(false);
  });
});
