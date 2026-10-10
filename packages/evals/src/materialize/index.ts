import { join } from 'node:path';
import type { ConcreteScenario, EvalSuite, HiddenContinuation, MaterializedScenario } from '../schema';
import { auditLeak } from './audit';
import { readRawCase, renderHistoryMd, renderIndexMd, writeRawCase } from './raw';
import { applyEdits, cutCase, introducedText, remapSpec, templateVars, toEscalationFormat } from './transform';

export { readRawCase, writeRawCase, renderIndexMd, renderHistoryMd, extractAttachmentText } from './raw';
export { cutCase, applyEdits, renderTemplate, templateVars, remapSpec, toEscalationFormat } from './transform';
export { auditLeak } from './audit';

/**
 * Write and audit the visible folder for one concrete scenario. Text the scenario's edits introduced is
 * authored input, so the audit treats it as visible material rather than as leaked continuation text.
 */
export async function materializeScenario(args: { scenario: ConcreteScenario; suite: EvalSuite; dataDir: string; outDir: string; folderOverride?: string }): Promise<MaterializedScenario> {
  const { scenario, suite } = args;
  const original = await readRawCase(join(args.dataDir, suite.trackFolder), scenario.spec.case);
  const cut = cutCase(original, scenario.spec);
  const edited = applyEdits(cut.visible, scenario.edits, {
    vars: templateVars(cut.visible), agentSenders: suite.agentSenders,
    seed: scenario.edits.find((edit) => edit.op === 'pad_noise')?.seed ?? 1,
  });
  const spec = remapSpec(scenario.spec, edited.renumbering);
  const visible = scenario.variant === 'escalation'
    ? toEscalationFormat(edited.raw, { ...scenario.escalation, agentSenders: suite.agentSenders }) : edited.raw;
  if (args.folderOverride !== undefined) visible.folder = args.folderOverride;
  const caseDir = await writeRawCase(visible, args.outDir);
  const visibleText = renderIndexMd(visible) + '\n\n' + renderHistoryMd(visible)
    + visible.attachments.map(({ fileName, text }) => `\n\n[attachment ${fileName}]\n${text ?? '[no text]'}`).join('');
  const hidden: HiddenContinuation = { scenarioId: scenario.id, ...cut.hidden, renumbering: edited.renumbering };
  return { scenario, spec, root: args.outDir, caseDir, folder: visible.folder,
    visibleEvents: visible.history.events.map((event) => event.number),
    visibleAttachments: visible.attachments.map((attachment) => attachment.fileName),
    visibleText, hidden, leak: auditLeak({ visibleText, visible, original, hidden, spec, allowed: introducedText(cut.visible, edited) }),
  };
}

/** Convert a scenario id to a filesystem-safe slug. */
export function scenarioSlug(id: string): string {
  return id.replace(/@/g, '_').replace(/~/g, '__').replace(/#/g, '--').replace(/[^A-Za-z0-9._-]/g, '-');
}
