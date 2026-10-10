import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findDates, parseDate } from '../src/ingest/dates';
import { detectTrack, findCaseDirs, loadCase } from '../src/ingest/casefile';
import { parseHistory } from '../src/ingest/history';

const FIX = join(__dirname, 'fixtures');
const PUBLIC = join(__dirname, '../../../data/public');

describe('dates', () => {
  it('parses the formats seen in case records', () => {
    expect(parseDate('2025-10-10 19:20:49 UTC')).toBe('2025-10-10T19:20:49.000Z');
    expect(parseDate('03/11/2025')).toBe('2025-11-03T00:00:00.000Z');
    expect(parseDate('1 Feb 2026, 10:00')).toBe('2026-02-01T10:00:00.000Z');
    expect(parseDate('March 4, 2026')).toBe('2026-03-04T00:00:00.000Z');
    expect(parseDate('2026-02-01T10:00:00+01:00')).toBe('2026-02-01T09:00:00.000Z');
    expect(parseDate('no date here')).toBeUndefined();
  });
  it('resolves relative days against when the text was written', () => {
    // 2025-10-12 is a Sunday.
    const found = findDates('I will follow up on Monday, or tomorrow at the latest.', '2025-10-12T16:00:00Z');
    expect(found.map((f) => f.iso.slice(0, 10))).toEqual(expect.arrayContaining(['2025-10-13']));
  });
});

describe('history parsing', () => {
  it('splits headed events and reads their fields', () => {
    const h = parseHistory('## 2025-01-01 10:00:00 UTC — event 001\n\n- **Channel:** Email\n- **From:** A\n- **To:** B\n\nHello?\n\n## 2025-01-02 10:00:00 UTC — event 002\n\n- **From:** B\n\nYes.');
    expect(h.events.map((e) => [e.id, e.from, e.to, e.channel, e.body])).toEqual([
      ['E001', 'A', 'B', 'Email', 'Hello?'],
      ['E002', 'B', undefined, undefined, 'Yes.'],
    ]);
    expect(h.anomalies).toEqual([]);
  });
  it('falls back to timestamped lines, then to one block', () => {
    expect(parseHistory('2025-01-01 10:00 From: A To: B\nhi\n2025-01-02 11:00 From: B To: A\nok').events.map((e) => [e.from, e.to, e.body])).toEqual([
      ['A', 'B', 'hi'],
      ['B', 'A', 'ok'],
    ]);
    const blob = parseHistory('just some notes with no structure');
    expect(blob.events).toHaveLength(1);
    expect(blob.anomalies[0]).toMatch(/one block/);
  });
});

describe('malformed case folders', () => {
  it('reads a case with different file names and a plain-text history', async () => {
    const c = await loadCase(join(FIX, 'plain-history'));
    expect(c.events).toHaveLength(3);
    expect(c.events[2]!.from).toBe('Landlord');
    expect(c.title).toBe('Leaking radiator valve');
    expect(c.anomalies.join(' ')).toMatch(/no event headings/);
  });
  it('reads a case with no history at all', async () => {
    const c = await loadCase(join(FIX, 'no-history'));
    expect(c.events).toHaveLength(0);
    expect(c.anomalies).toContain('No history file found.');
    expect(c.fields.find((f) => f.key === 'Priority field (new)')?.value).toBe('P2');
    expect(c.asOf).toBe('2026-01-04T08:00:00.000Z');
  });
  it('handles odd headings, duplicate numbers and unknown files', async () => {
    const c = await loadCase(join(FIX, 'weird'));
    expect(c.events).toHaveLength(3);
    expect(c.events.map((e) => e.id)).toEqual(['E001', 'E002', 'E003']);
    expect(c.anomalies.join(' ')).toMatch(/numbered by position/);
    expect(c.attachments[0]).toMatchObject({ id: 'A1', kind: 'text' });
    expect(c.sections.map((s) => s.heading)).toContain('Customer Mood');
  });
});

describe('snapshot discipline', () => {
  it('hides answer sections and later events in practice mode', async () => {
    const dir = join(PUBLIC, 'Delivery & Logistics/007');
    if (!existsSync(dir)) return;
    const c = await loadCase(dir, { withhold: 'outcomes' });
    expect(c.sections.map((s) => s.heading)).not.toContain('Next action at escalation');
    expect(c.events.map((e) => e.id)).toEqual(['E001', 'E002']);
    expect(c.fields.find((f) => f.key === 'Status')).toBeUndefined();
  });
  it('honours a stated snapshot even when nothing is withheld', async () => {
    const dir = join(PUBLIC, 'Delivery & Logistics/007');
    if (!existsSync(dir)) return;
    const c = await loadCase(dir);
    expect(c.events.at(-1)!.id).toBe('E002');
  });
  it('applies evaluation cut points', async () => {
    const dir = join(PUBLIC, 'Property Management/001');
    if (!existsSync(dir)) return;
    const c = await loadCase(dir, { withhold: 'outcomes', cutBefore: 4 });
    expect(c.events.map((e) => e.id)).toEqual(['E001', 'E002', 'E003']);
  });
});

describe('every public example', () => {
  it('loads with events, dates and the right track', async () => {
    if (!existsSync(PUBLIC)) return;
    const dirs = await findCaseDirs(PUBLIC);
    expect(dirs.length).toBe(200);
    for (const d of dirs) {
      const c = await loadCase(d, { withhold: 'outcomes' });
      expect(c.events.length, d).toBeGreaterThan(0);
      expect(c.events.every((e) => e.at), d).toBe(true);
      expect(c.anomalies, d).toEqual([]);
      expect(c.track, d).not.toBe('_default');
    }
  }, 120_000);
});

describe('track detection', () => {
  it('uses words when the path says nothing', () => {
    expect(detectTrack('/x/case-1', 'The tenant asked the landlord; the contractor will attend. Tenant again, landlord again.')).toBe('property');
    expect(detectTrack('/x/case-1', 'hello')).toBe('_default');
  });
});
