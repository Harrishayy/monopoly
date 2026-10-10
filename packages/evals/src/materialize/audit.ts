import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { HiddenContinuation, LeakAudit, LeakFinding, RawCase, ScenarioSpec } from '../schema';
import { renderHistoryMd, renderIndexMd } from './raw';
import { writtenFolder } from './state';

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function windows(text: string): Set<string> {
  const fragments = new Set<string>();
  for (let start = 0; start + 40 <= text.length; start++) {
    const fragment = text.slice(start, start + 40);
    if (fragment.trim().length === 40) fragments.add(fragment);
  }
  return fragments;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Audit visible text, index metadata and written files against the hidden continuation. */
export function auditLeak(args: { visibleText: string; visible: RawCase; original: RawCase; hidden: HiddenContinuation; spec: ScenarioSpec }): LeakAudit {
  const { visible, original, hidden, spec } = args;
  const findings: LeakFinding[] = [];
  const visibleText = normalise(args.visibleText);
  const hiddenNumbers = new Set(hidden.events.map((event) => event.number));
  const hiddenFiles = new Set(hidden.attachments.map((attachment) => attachment.fileName));
  const removedHeadings = new Set(hidden.removedSections.map((section) => section.heading.toLowerCase()));
  const removedKeys = new Set(hidden.removedDetails.map((detail) => detail.key.toLowerCase()));
  const originalEvents = original.history.events.filter((event) => !hiddenNumbers.has(event.number));
  const originalAttachments = original.attachments.filter((attachment) => !hiddenFiles.has(attachment.fileName));
  const originalVisible: RawCase = { ...original,
    index: { ...original.index, details: original.index.details.filter((detail) => !removedKeys.has(detail.key.toLowerCase())),
      sections: original.index.sections.filter((section) => !removedHeadings.has(section.heading.toLowerCase())).map((section) =>
        section.heading.toLowerCase() === 'attachments' ? { ...section, body: originalAttachments.map(({ fileName }) => `- [${fileName}](attachments/${fileName})`).join('\n') } : section),
    },
    history: { ...original.history, events: originalEvents }, attachments: originalAttachments,
  };
  const originalMaterial = [
    ...originalVisible.index.sections.map((section) => section.body),
    ...originalEvents.map((event) => event.body),
    ...originalAttachments.map((attachment) => attachment.text ?? ''),
    // Rendered boundaries and field values were visible too; a window may span them.
    renderIndexMd(originalVisible) + '\n\n' + renderHistoryMd(originalVisible),
  ].map(normalise);
  const originalFragments = new Set(originalMaterial.flatMap((text) => [...windows(text)]));
  const visibleFragments = windows(visibleText);
  for (const event of hidden.events) {
    const body = normalise(event.body);
    const sentences = body.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length >= 40);
    const sentence = sentences.find((fragment) => !originalMaterial.some((material) => material.includes(fragment)) && visibleText.includes(fragment));
    const fragment = sentence ?? [...windows(body)].find((candidate) => !originalFragments.has(candidate) && visibleFragments.has(candidate));
    if (fragment) findings.push({ kind: 'event_text', detail: `Hidden event ${event.number} text appears in visible material: ${fragment}` });
  }

  const historyStart = args.visibleText.indexOf(`# ${visible.history.h1}`);
  const indexText = renderIndexMd(visible) + '\n' + (historyStart < 0 ? args.visibleText : args.visibleText.slice(0, historyStart));
  const indexHeadings = [...indexText.matchAll(/^## (.+)$/gm)];
  const attachmentList = indexHeadings.flatMap((heading, i) => heading[1]!.trim().toLowerCase() === 'attachments'
    ? [indexText.slice(heading.index + heading[0].length, indexHeadings[i + 1]?.index ?? indexText.length)] : []).join('\n');
  const folder = writtenFolder(visible);
  const directories = new Set(folder ? [join(folder, 'attachments')] : []);
  for (const attachment of visible.attachments) {
    const source = original.attachments.find((item) => item.fileName === attachment.fileName)?.sourcePath;
    if (source === undefined || resolve(source) !== resolve(attachment.sourcePath)) directories.add(dirname(attachment.sourcePath));
  }
  const diskFiles = new Set<string>();
  for (const directory of directories) {
    try {
      readdirSync(directory).forEach((file) => diskFiles.add(file));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  for (const attachment of hidden.attachments) {
    if (visible.attachments.some((item) => item.fileName === attachment.fileName) || attachmentList.includes(attachment.fileName) || diskFiles.has(attachment.fileName)) {
      findings.push({ kind: 'attachment', detail: `Hidden attachment ${attachment.fileName} appears in the visible attachment list or folder` });
    }
  }
  for (const { heading } of hidden.removedSections) {
    if (new RegExp(`^##[ \\t]+${escapeRegex(heading)}[ \\t]*$`, 'im').test(indexText)) findings.push({ kind: 'section', detail: `Removed section ${heading} appears in the visible index` });
  }
  for (const { key } of hidden.removedDetails) {
    if (new RegExp(`\\*\\*${escapeRegex(key)}:\\*\\*`, 'i').test(indexText)) findings.push({ kind: 'detail', detail: `Removed detail ${key} appears in the visible index` });
  }
  const counts = [...args.visibleText.matchAll(/Total events:\s*(\d+)/gi)].map((match) => Number(match[1]));
  const preambleCounts = [...visible.history.preamble.matchAll(/Total events:\s*(\d+)/gi)].map((match) => Number(match[1]));
  if (!counts.length || !preambleCounts.length || [...counts, ...preambleCounts].some((count) => count !== visible.history.events.length)) {
    findings.push({ kind: 'event_count', detail: `Total events must be ${visible.history.events.length}` });
  }
  const visibleNumbers = new Set(visible.history.events.map((event) => event.number));
  for (const number of visibleNumbers) {
    if (Number(number) > Number(spec.cutAfter)) findings.push({ kind: 'event_count', detail: `Visible event ${number} exceeds cutAfter ${spec.cutAfter}` });
  }
  for (const heading of args.visibleText.matchAll(/^## .+? — event (\d+)[ \t]*$/gm)) {
    if (!visibleNumbers.has(heading[1]!)) findings.push({ kind: 'event_count', detail: `Event heading ${heading[1]} is outside the visible event set` });
  }
  for (const fact of spec.hiddenFacts) {
    if (fact.marker && visibleText.includes(normalise(fact.marker))) findings.push({ kind: 'hidden_fact', detail: `Hidden fact marker appears in visible material: ${fact.marker}` });
  }
  return { ok: findings.length === 0, findings };
}
