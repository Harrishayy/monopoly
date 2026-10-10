/**
 * Shared constants for the 60-second video run. Client-safe: no server imports.
 * The case is seeded by `/demo` and `/api/demo/video`.
 */
export const VIDEO_DEMO_REF = 'LIVE-DEMO';

export interface VideoShot {
  id: 'problem' | 'email' | 'call' | 'result';
  clock: string;
  screen: string;
  href: string;
  /** What to say on Loom, timed for ~60 seconds total. */
  say: string;
}

export const VIDEO_SHOTS: VideoShot[] = [
  {
    id: 'problem',
    clock: '0:00–0:12',
    screen: 'Architecture',
    href: '/architecture',
    say: 'Letting agencies drown in this. A tenant emails, then emails again, then phones. Someone re-reads the whole thread just to decide the next step. Casework does the reading. It acts on the routine moves, and it stops when a person is needed.',
  },
  {
    id: 'email',
    clock: '0:12–0:28',
    screen: 'Inbox · conversation',
    href: `/cases/${VIDEO_DEMO_REF}?tab=conversation`,
    say: 'This came in yesterday. Alex at Elm Road — boiler banging, then no hot water. The agent asked for the error code on its own. This morning Alex writes back: still no heat, and a two-year-old in a freezing flat. That changes the job. The agent will not send a contractor. It held a landlord approval for a person.',
  },
  {
    id: 'call',
    clock: '0:28–0:50',
    screen: 'Tenant portal · live call',
    href: '/portal?demo=1',
    say: 'Alex is on the phone now. Still no heat, a child in the flat, and we still need access. The call lands on this same case while we talk.',
  },
  {
    id: 'result',
    clock: '0:50–0:60',
    screen: 'Review messages',
    href: `/cases/${VIDEO_DEMO_REF}?tab=review`,
    say: 'The draft is ready: urgency, the child, access this afternoon. A person clicks send. And on our LLM-judge harness, we hit 94 percent.',
  },
];

/** Lines to say on the portal call as Alex Demo, then hang up. Keep it under 20 seconds. */
export const VIDEO_CALL_LINES = [
  'Heating still completely off. The baby’s room is freezing.',
  'I can give access after four this afternoon.',
  'Worcester boiler, no error code — just dead.',
];

/** Prefill on /portal?demo=1 so the call joins LIVE-DEMO. */
export const VIDEO_PORTAL_DETAILS = {
  name: 'Alex Demo',
  email: 'alex.tenant@example.com',
  address: 'Flat 2, 12 Elm Road, Testford TF1 2AB',
};
