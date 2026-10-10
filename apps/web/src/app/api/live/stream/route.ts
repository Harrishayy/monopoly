import { liveBus, type LiveSignal } from '@/server/live/intake';

export const dynamic = 'force-dynamic';

const enc = new TextEncoder();

/** Server-Sent Events for the admin console: new cases, new messages, runs and outbound as they happen. */
export function GET() {
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (s: LiveSignal) => controller.enqueue(enc.encode(`data: ${JSON.stringify(s)}\n\n`));
      liveBus.on('signal', send);
      const heartbeat = setInterval(() => controller.enqueue(enc.encode(': keep-alive\n\n')), 15_000);
      cleanup = () => {
        clearInterval(heartbeat);
        liveBus.off('signal', send);
      };
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
}
