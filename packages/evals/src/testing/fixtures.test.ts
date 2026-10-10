import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EvalSuite } from '../schema';
import { FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER, fixtureSuite } from './fixtures';

describe('neutral fixtures', () => {
  it('parses the suite with scenario defaults and all variant types', () => {
    const suite = EvalSuite.parse(fixtureSuite);
    expect(isAbsolute(FIXTURE_DATA_DIR)).toBe(true);
    expect(suite.scenarios.map((scenario) => scenario.id)).toEqual(['FX-001@005', 'FX-002@002']);
    expect(suite.scenarios[0]?.rubric).toHaveLength(4);
    expect(suite.perturbations[0]?.edits[0]?.op).toBe('append_event');
    expect(suite.escalationTwins[0]?.scenario).toBe('FX-001@005');
    expect(suite.actionMap).toHaveLength(3);
  });

  it('provides classic history with eight events and attachments at the specified events', async () => {
    const dir = join(FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER, '001');
    const history = await readFile(join(dir, 'history.md'), 'utf8');
    expect(history.match(/^## .* — event \d{3}$/gm)).toHaveLength(8);
    expect(history).toContain('Total events: 8');
    expect(history.slice(history.indexOf('## 2026-02-02 09:45:00'), history.indexOf('<a id="event-005">'))).toContain('note-01.txt');
    expect(history.slice(history.indexOf('## 2026-02-02 11:30:00'), history.indexOf('<a id="event-008">'))).toContain('quote-02.txt');
    expect(await readFile(join(dir, 'attachments/note-01.txt'), 'utf8')).toContain('Confirm whether both units');
    expect(await readFile(join(dir, 'attachments/quote-02.txt'), 'utf8')).toContain('24000 pence');
  });

  it('provides an escalation index and five staged events', async () => {
    const dir = join(FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER, '002');
    const [index, history] = await Promise.all(['index.md', 'history.md'].map((name) => readFile(join(dir, name), 'utf8')));
    expect(index).toContain('## Context');
    expect(index).toContain('## Next action at escalation');
    expect(index).toContain('## Boundaries and remaining work');
    expect(history?.match(/^## .* — event \d{3}$/gm)).toHaveLength(5);
    expect(history?.match(/^- \*\*Stage:\*\*/gm)).toHaveLength(5);
    expect(history).toContain('- **Stage:** Escalation');
  });
});
