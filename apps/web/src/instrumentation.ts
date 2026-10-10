/** Next calls this once when the server starts. Live channels only run in the Node runtime. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./server/config');
    const { startChannels } = await import('./server/live/channels');
    await startChannels();
  }
}
