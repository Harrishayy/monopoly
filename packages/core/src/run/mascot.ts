import type { RunEvent } from '../schema';

export type MascotState = 'idle' | 'think' | 'act' | 'fail' | 'esc' | 'done';

/** Maps the latest run event to what the mascot shows. Pure; shared by web and tests. */
export function mascotFor(event: RunEvent | undefined): MascotState {
  if (!event) return 'idle';
  switch (event.type) {
    case 'run.started':
    case 'step.read':
    case 'decision.made':
    case 'action.blocked':
      return 'think';
    case 'tool.called':
    case 'tool.succeeded':
      return 'act';
    case 'tool.failed':
      return 'fail';
    case 'escalation.created':
      return 'esc';
    case 'run.completed':
      return event.outcome === 'resolved' ? 'done' : event.outcome === 'failed' ? 'fail' : 'esc';
  }
}
