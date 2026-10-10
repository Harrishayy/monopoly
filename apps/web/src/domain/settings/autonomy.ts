import type { Autonomy } from '@casework/core';

/** What each autonomy level means, in one sentence. Plain module so Server Components can read it. */
export const AUTONOMY: Record<Autonomy, { label: string; explain: string }> = {
  suggest: { label: 'Suggest', explain: 'The agent drafts the next step and a person sends it. Nothing leaves without a click.' },
  ask_first: { label: 'Ask first', explain: 'The agent takes reversible steps itself and asks before anything that spends money or can’t be undone.' },
  autonomous: { label: 'Autonomous', explain: 'The agent acts within policy on its own. Policy rules and always-escalate triggers still apply.' },
};
