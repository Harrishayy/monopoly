import type { CaseEdit, EventDraft, HiddenContinuation, KeyValue, RawCase, RawEvent, ScenarioSpec } from '../schema';
import { editedLastNumber, rememberLastNumber } from './state';

const REMOVED_SECTIONS = new Set(['overview', 'outcome', 'next action at escalation', 'boundaries and remaining work']);
const REMOVED_DETAILS = new Set(['status', 'updated', 'completed']);

function replaceSection(raw: RawCase, heading: string, body: string, after: string): void {
  raw.index.sections = raw.index.sections.filter((section) => section.heading.toLowerCase() !== heading.toLowerCase());
  const position = raw.index.sections.findIndex((section) => section.heading.toLowerCase() === after.toLowerCase());
  raw.index.sections.splice(position < 0 ? raw.index.sections.length : position + 1, 0, { heading, body });
}

function setDetail(details: KeyValue[], key: string, value: string): void {
  const detail = details.find((item) => item.key.toLowerCase() === key.toLowerCase());
  if (detail) detail.value = value;
  else details.push({ key, value });
}

function updateCount(raw: RawCase): void {
  raw.history.preamble = raw.history.preamble.replace(/Total events:\s*\d+/gi, `Total events: ${raw.history.events.length}`);
}

/** Separate visible case data from the continuation at the scenario cut. */
export function cutCase(raw: RawCase, spec: ScenarioSpec): { visible: RawCase; hidden: Omit<HiddenContinuation, 'scenarioId' | 'renumbering'> } {
  if (!raw.history.events.some((event) => event.number === spec.cutAfter)) {
    throw new Error(`Cannot cut case ${raw.folder}: event ${spec.cutAfter} does not exist`);
  }
  const visible = structuredClone(raw);
  const hidden: Omit<HiddenContinuation, 'scenarioId' | 'renumbering'> = {
    events: visible.history.events.filter((event) => Number(event.number) > Number(spec.cutAfter)), attachments: [],
    removedSections: visible.index.sections.filter((section) => REMOVED_SECTIONS.has(section.heading.toLowerCase())),
    removedDetails: visible.index.details.filter((detail) => REMOVED_DETAILS.has(detail.key.toLowerCase())),
  };
  visible.history.events = visible.history.events.filter((event) => Number(event.number) <= Number(spec.cutAfter));
  visible.index.sections = visible.index.sections.filter((section) => !REMOVED_SECTIONS.has(section.heading.toLowerCase()));
  visible.index.details = visible.index.details.filter((detail) => !REMOVED_DETAILS.has(detail.key.toLowerCase()));
  const visibleFiles = new Set(raw.attachments.filter(({ fileName }) =>
    !spec.attachments.exclude.includes(fileName) && (spec.attachments.include.includes(fileName) || visible.history.events.some((event) => event.body.includes(fileName))),
  ).map(({ fileName }) => fileName));
  hidden.attachments = visible.attachments.filter(({ fileName }) => !visibleFiles.has(fileName)).map(({ fileName, text }) => ({ fileName, text }));
  visible.attachments = visible.attachments.filter(({ fileName }) => visibleFiles.has(fileName));
  const attachmentBody = visible.attachments.length
    ? visible.attachments.map(({ fileName }) => `- [${fileName}](attachments/${fileName})`).join('\n')
    : 'No attachments are required or available for this case.';
  const attachmentSections = visible.index.sections.filter((section) => section.heading.toLowerCase() === 'attachments');
  if (attachmentSections.length) attachmentSections.forEach((section) => { section.body = attachmentBody; });
  else visible.index.sections.push({ heading: 'Attachments', body: attachmentBody });
  updateCount(visible);
  if (spec.question !== undefined) replaceSection(visible, 'Decision required', spec.question, 'Initial request');
  return { visible, hidden };
}

/** Replace known case placeholders and leave unknown placeholders untouched. */
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{([^{}]+)\}\}/g, (placeholder, name: string) => Object.hasOwn(vars, name) ? vars[name]! : placeholder);
}

/** Collect the template variables available from a raw case. */
export function templateVars(raw: RawCase): Record<string, string> {
  return { title: raw.index.title, folder: raw.folder, lastAt: raw.history.events.at(-1)?.at ?? '',
    ...Object.fromEntries(raw.index.details.map(({ key, value }) => [`detail:${key}`, value])),
  };
}

function timestamp(at: string): number {
  const milliseconds = Date.parse(at.replace(' ', 'T').replace(/ UTC$/, 'Z'));
  if (!Number.isFinite(milliseconds)) throw new Error(`Invalid event timestamp: ${at}`);
  return milliseconds;
}

function formatTime(milliseconds: number): string {
  return new Date(milliseconds).toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
}

function draftEvent(draft: EventDraft, previous: RawEvent | undefined, vars: Record<string, string>, following?: RawEvent): RawEvent {
  const at = draft.at === undefined
    ? formatTime(previous ? timestamp(previous.at) + 45 * 60_000 : following ? timestamp(following.at) - 45 * 60_000 : 45 * 60_000)
    : renderTemplate(draft.at, vars);
  return { number: '', at,
    fields: draft.fields.map(({ key, value }) => ({ key, value: renderTemplate(value, vars) })), body: renderTemplate(draft.body, vars),
  };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ state >>> 15, state | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

/** Apply case edits and return the original-to-visible event numbering. */
export function applyEdits(raw: RawCase, edits: CaseEdit[], opts?: { seed?: number; vars?: Record<string, string>; agentSenders?: string[] }): { raw: RawCase; renumbering: Record<string, string | null> } {
  const result = structuredClone(raw);
  const originals = new Map(result.history.events.map((event) => [event, event.number]));
  const renumbering: Record<string, string | null> = Object.fromEntries(raw.history.events.map((event) => [event.number, event.number]));
  const vars = opts?.vars ?? templateVars(raw);
  const renumber = () => {
    for (const original of Object.keys(renumbering)) renumbering[original] = null;
    result.history.events.forEach((event, i) => {
      event.number = String(i + 1).padStart(3, '0');
      const original = originals.get(event);
      if (original !== undefined) renumbering[original] = event.number;
    });
  };
  const eventIndex = (number: string) => {
    const index = result.history.events.findIndex((event) => event.number === number);
    if (index < 0) throw new Error(`Cannot edit case ${raw.folder}: visible event ${number} does not exist`);
    return index;
  };
  for (const edit of edits) {
    switch (edit.op) {
      case 'append_event': {
        const event = draftEvent(edit.event, result.history.events.at(-1), vars);
        event.number = String(Number(result.history.events.at(-1)?.number ?? 0) + 1).padStart(3, '0');
        result.history.events.push(event);
        break;
      }
      case 'insert_event': {
        const index = eventIndex(edit.before);
        result.history.events.splice(index, 0, draftEvent(edit.event, result.history.events[index - 1], vars, result.history.events[index]));
        renumber();
        break;
      }
      case 'remove_event':
        result.history.events.splice(eventIndex(edit.number), 1);
        renumber();
        break;
      case 'replace_text': {
        const replace = (body: string) => body.replaceAll(edit.find, () => renderTemplate(edit.replace, vars));
        if (edit.in === 'event') {
          if (edit.number === undefined) throw new Error('replace_text in event requires an event number');
          const event = result.history.events[eventIndex(edit.number)]!;
          event.body = replace(event.body);
        } else {
          if (edit.in === 'any') result.history.events.forEach((event) => { event.body = replace(event.body); });
          result.index.sections.filter((section) => edit.in === 'any' || section.heading.toLowerCase() === 'initial request')
            .forEach((section) => { section.body = replace(section.body); });
        }
        break;
      }
      case 'pad_noise': {
        const senders = (opts?.agentSenders ?? []).map((sender) => new RegExp(sender, 'i'));
        const candidates = result.history.events.filter((event) => event.body.length <= 300 && event.fields.some(({ key, value }) => key.toLowerCase() === 'from' && senders.some((sender) => sender.test(value))));
        if (!candidates.length || !edit.count) break;
        const random = mulberry32(opts?.seed ?? edit.seed);
        for (let i = 0; i < edit.count; i++) {
          const event = structuredClone(candidates[Math.floor(random() * candidates.length)]!);
          const position = Math.floor(random() * (result.history.events.length + 1));
          const previous = result.history.events[position - 1];
          const next = result.history.events[position];
          const left = previous ? timestamp(previous.at) : timestamp(next!.at) - 45 * 60_000;
          const right = next ? timestamp(next.at) : left + 45 * 60_000;
          event.at = formatTime(left + Math.floor((right - left) / 2000) * 1000);
          result.history.events.splice(position, 0, event);
        }
        renumber();
        break;
      }
      case 'set_detail':
        setDetail(result.index.details, edit.key, renderTemplate(edit.value, vars));
        break;
    }
  }
  updateCount(result);
  rememberLastNumber(renumbering, result.history.events.at(-1)?.number ?? '000');
  return { raw: result, renumbering };
}

/** Remap scenario evidence and the cut to edited event numbering, without mutation. */
export function remapSpec(spec: ScenarioSpec, renumbering: Record<string, string | null>): ScenarioSpec {
  const result = structuredClone(spec);
  const remap = (refs: string[]) => refs.flatMap((ref) => {
    let removed = false;
    const mapped = ref.replace(/event-(\d{3})(?!\d)/g, (match, number: string) => {
      if (!Object.hasOwn(renumbering, number)) return match;
      if (renumbering[number] === null) { removed = true; return match; }
      return `event-${renumbering[number]}`;
    });
    return removed ? [] : [mapped];
  });
  result.rubric.forEach((item) => {
    item.evidence = remap(item.evidence);
    if (item.check?.type === 'cites_any') item.check.refs = remap(item.check.refs);
  });
  const surviving = Object.values(renumbering).filter((number): number is string => number !== null);
  result.cutAfter = editedLastNumber(renumbering) ?? surviving.sort((a, b) => Number(a) - Number(b)).at(-1) ?? '000';
  return result;
}

/** Convert a raw case to the escalation snapshot format without mutation. */
export function toEscalationFormat(raw: RawCase, opts: { context?: string; question?: string; agentSenders: string[] }): RawCase {
  const result = structuredClone(raw);
  result.history.events.forEach((event, i) => {
    event.fields = [{ key: 'Stage', value: i === result.history.events.length - 1 ? 'Escalation' : 'Context' },
      ...event.fields.filter((field) => field.key.toLowerCase() !== 'stage')];
  });
  result.history.preamble = `All identities, records and communications are fictional. Total events: ${result.history.events.length}.`;
  setDetail(result.index.details, 'Escalated', result.history.events.at(-1)?.at ?? '');
  if (opts.context !== undefined) {
    result.index.sections = result.index.sections.filter((section) => section.heading.toLowerCase() !== 'context');
    const initial = result.index.sections.findIndex((section) => section.heading.toLowerCase() === 'initial request');
    result.index.sections.splice(initial < 0 ? 0 : initial, 0, { heading: 'Context', body: opts.context });
  }
  if (opts.question !== undefined) replaceSection(result, 'Decision required', opts.question, 'Initial request');
  return result;
}
