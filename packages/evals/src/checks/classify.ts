import type { ActionKind, ActionMapEntry } from '../schema';

/** Read an own nested field, including numeric array indexes; missing paths return undefined. */
export function readPath(obj: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  let value = obj;
  for (const part of path.split('.')) {
    if (!part || value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

/** Use an exact suite mapping before ordered, case-insensitive tool-name heuristics. */
export function classifyTool(name: string, actionMap: ActionMapEntry[]): ActionMapEntry {
  const mapped = actionMap.find((entry) => entry.tool === name);
  if (mapped) return mapped;
  const patterns: [RegExp, ActionKind][] = [
    [/escalat|handover/, 'escalate'],
    [/close|complete|resolve/, 'close'],
    [/hold|snooze|follow.?up|remind/, 'hold'],
    [/request.?approval|ask.?approval/, 'request_approval'],
    [/approv|confirm|pay|spend|purchase|order/, 'commit_spend'],
    [/book|assign|instruct|dispatch/, 'assign_provider'],
    [/schedule|appointment|slot/, 'schedule'],
    [/notify|message|sms|email|send|reply|call/, 'message'],
    [/note|record|log|update/, 'record'],
    [/get|list|read|search|lookup|fetch|find/, 'read'],
  ];
  const lower = name.toLowerCase();
  return { tool: name, kind: patterns.find(([pattern]) => pattern.test(lower))?.[1] ?? 'other', textPaths: [] };
}
