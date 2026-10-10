import 'server-only';

/**
 * Starts the live channel adapters once per server process: pollers for providers that can't
 * reach localhost, and outbound senders. Each adapter is a no-op when its env vars are missing.
 */
export async function startChannels() {
  const g = globalThis as unknown as { __caseworkChannels?: boolean };
  if (g.__caseworkChannels) return;
  g.__caseworkChannels = true;
  const adapters = await Promise.allSettled([
    import('./voice').then((m) => m.startVoice()),
    import('./email').then((m) => m.startEmail()),
  ]);
  adapters.forEach((r) => r.status === 'rejected' && console.error('Channel failed to start:', r.reason));
}
