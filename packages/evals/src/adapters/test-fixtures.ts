import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Case, type TrackPack } from '@casework/core';
import { EvalSuite, type AgentRunInput } from '../schema';
import { fixtureSuite } from '../testing/fixtures';

/** Construct a neutral pack loading case-file and event sources from a supplied root. */
export function fakePack(): TrackPack {
  const suite = EvalSuite.parse(fixtureSuite);
  return {
    id: suite.track, label: 'Fixture Track', vocabulary: { case: 'Case', cases: 'Cases', customer: 'Customer', handler: 'Operations desk' },
    autonomy: 'autonomous', policy: { rules: [], mustEscalate: [] }, systemPrompt: '', tools: [],
    async loadCases(root) {
      const trackDir = join(root, suite.trackFolder);
      const folders = (await readdir(trackDir, { withFileTypes: true })).filter((entry) => entry.isDirectory() && /^\d{3}$/.test(entry.name));
      return Promise.all(folders.map(async ({ name }) => {
        const ref = `${suite.refPrefix}-${name}`;
        const index = await readFile(join(trackDir, name, 'index.md'), 'utf8');
        const history = await readFile(join(trackDir, name, 'history.md'), 'utf8');
        const sources = [{ id: `${ref}:case`, kind: 'doc', title: 'Case file', receivedAt: '2026-01-01T00:00:00Z', body: index }];
        for (const match of history.matchAll(/^## [^\n]*event (\d{3})[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)) {
          sources.push({ id: `${ref}:event-${match[1]}`, kind: 'doc', title: `Event ${match[1]}`, receivedAt: '2026-01-01T00:00:00Z', body: match[2]! });
        }
        return Case.parse({ ref, track: suite.track, title: 'A job', customer: { name: 'Customer' }, status: 'new', sources });
      }));
    },
  };
}

/** Create one visible case and a separate hidden continuation for adapter unit tests. */
export async function fakeInput(dir: string): Promise<AgentRunInput> {
  const suite = EvalSuite.parse(fixtureSuite);
  const spec = suite.scenarios[0]!;
  const scenario = { id: spec.id, baseId: spec.id, variant: 'base' as const, spec, edits: [] };
  const root = join(dir, 'visible');
  const caseDir = join(root, suite.trackFolder, spec.case);
  await mkdir(caseDir, { recursive: true });
  await writeFile(join(caseDir, 'index.md'), '# Case 001: A job\n\n## Initial request\nPlease confirm the scope.\n');
  await writeFile(join(caseDir, 'history.md'), '# Case history\n\n## 2026-01-01 00:00:00 UTC — event 001\n- **From:** Customer\n\nPlease confirm the scope.\n');
  return {
    scenario, suite, outDir: join(dir, 'out'), signal: new AbortController().signal, timeoutMs: 2000, repeat: 1,
    materialized: { scenario, spec, root, caseDir, folder: spec.case, visibleEvents: ['001'], visibleAttachments: [], visibleText: 'Visible case only',
      hidden: { scenarioId: spec.id, events: [], attachments: [], removedSections: [], removedDetails: [], renumbering: {} }, leak: { ok: true, findings: [] } },
  };
}
