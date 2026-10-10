import { describe, expect, it } from 'vitest';
import type { ActionMapEntry } from '../schema';
import { classifyTool, readPath } from './classify';

describe('readPath', () => {
  it('reads nested objects and numeric array indexes', () => {
    expect(readPath({ a: { b: [{ c: 42 }] } }, 'a.b.0.c')).toBe(42);
    expect(readPath([{ value: false }], '0.value')).toBe(false);
    expect(readPath({ a: null }, 'a')).toBeNull();
  });

  it.each([undefined, '', 'missing', 'a.missing', 'a.b.1.c', 'a.b.0.c.more', 'a..b', '.a', 'a.'])('returns undefined for missing or invalid path %s', (path) => {
    expect(readPath({ a: { b: [{ c: 42 }] } }, path)).toBeUndefined();
  });

  it.each([null, undefined, false, 2, 'abc'])('handles non-object roots %s', (root) => {
    expect(readPath(root, 'a')).toBeUndefined();
  });

  it('does not read inherited fields', () => {
    expect(readPath({}, 'toString')).toBeUndefined();
    expect(readPath(Object.create({ a: 1 }), 'a')).toBeUndefined();
  });
});

describe('classifyTool', () => {
  it('returns the full exact mapping even when the heuristic differs', () => {
    const entry: ActionMapEntry = { tool: 'job.confirm', kind: 'read', to: 'internal', amountPath: 'pence', textPaths: ['body'] };
    expect(classifyTool('job.confirm', [entry])).toBe(entry);
    expect(classifyTool('JOB.CONFIRM', [entry]).kind).toBe('commit_spend');
  });

  it.each([
    ['escalate', 'escalate'], ['handover', 'escalate'],
    ['close', 'close'], ['complete', 'close'], ['resolve', 'close'],
    ['hold', 'hold'], ['snooze', 'hold'], ['follow_up', 'hold'], ['followup', 'hold'], ['remind', 'hold'],
    ['request_approval', 'request_approval'], ['requestapproval', 'request_approval'], ['ask.approval', 'request_approval'],
    ['approve', 'commit_spend'], ['confirm', 'commit_spend'], ['pay', 'commit_spend'], ['spend', 'commit_spend'], ['purchase', 'commit_spend'], ['order', 'commit_spend'],
    ['book', 'assign_provider'], ['assign', 'assign_provider'], ['instruct', 'assign_provider'], ['dispatch', 'assign_provider'],
    ['schedule', 'schedule'], ['appointment', 'schedule'], ['slot', 'schedule'],
    ['notify', 'message'], ['message', 'message'], ['sms', 'message'], ['email', 'message'], ['send', 'message'], ['reply', 'message'], ['call', 'message'],
    ['note', 'record'], ['record', 'record'], ['log', 'record'], ['update', 'record'],
    ['get', 'read'], ['list', 'read'], ['read', 'read'], ['search', 'read'], ['lookup', 'read'], ['fetch', 'read'], ['find', 'read'],
    ['custom', 'other'],
  ] as const)('classifies %s as %s', (name, kind) => {
    expect(classifyTool(`desk.${name.toUpperCase()}`, [])).toEqual({ tool: `desk.${name.toUpperCase()}`, kind, textPaths: [] });
  });

  it.each([
    ['handover.close', 'escalate'], ['close.hold', 'close'], ['hold.approve', 'hold'],
    ['request_approval.send', 'request_approval'], ['ask_approval.confirm', 'request_approval'],
    ['confirm.schedule', 'commit_spend'], ['book.schedule', 'assign_provider'], ['schedule.send', 'schedule'],
    ['send.update', 'message'], ['update.get', 'record'],
  ] as const)('uses the first applicable heuristic for %s', (name, kind) => {
    expect(classifyTool(name, []).kind).toBe(kind);
  });
});
