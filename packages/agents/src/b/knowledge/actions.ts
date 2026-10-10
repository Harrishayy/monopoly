import { getPack } from '@casework/tracks';
import type { ActionKind } from '../types';

export interface DomainAction {
  name: string;
  description: string;
}

/** Track ids in this package → the pack registry's ids. */
const PACK_ID: Record<string, string> = { property: 'property', insurance: 'claims', banking: 'banking', logistics: 'logistics' };

/**
 * The track's own next-step actions (shared with agent A through the track pack), or undefined for a track
 * without a pack. Agent B then picks one of these instead of a generic verb, so both agents answer in one vocabulary.
 */
export function domainActions(track: string): DomainAction[] | undefined {
  const id = PACK_ID[track];
  if (!id) return undefined;
  try {
    const tools = getPack(id).tools;
    return tools.length ? tools.map((t) => ({ name: t.name, description: t.description })) : undefined;
  } catch {
    return undefined;
  }
}

/** The generic verb a domain action amounts to, so the rule checks and the gate work on either vocabulary. */
export function genericOf(domainAction: string): ActionKind {
  const verb = domainAction.split('.').at(-1) ?? domainAction;
  if (verb === 'chase') return 'chase';
  if (verb === 'escalate' || verb === 'handover') return 'escalate_to_human';
  if (verb === 'wait' || verb === 'hold') return 'wait';
  if (verb === 'close') return 'close_case';
  if (verb === 'note' || verb === 'record') return 'update_record';
  if (/^(ask|request|request_approval|verify|confirm)$/.test(verb)) return 'request_information';
  return 'send_message';
}

export function renderCatalogue(actions: DomainAction[]): string {
  return actions.map((a) => `- ${a.name}: ${a.description}`).join('\n');
}
