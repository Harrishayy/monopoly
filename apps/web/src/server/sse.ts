import 'server-only';
import { getRun, subscribe, type RunSignal } from './runs';

const enc = new TextEncoder();

/**
 * Streams a run as Server-Sent Events. Each event's id is its seq, so the browser's
 * EventSource resumes with Last-Event-ID after a dropped connection.
 */
export function runEventStream(runId: string, afterSeq = -1): Response {
  const rec = getRun(runId);
  if (!rec) return Response.json({ error: `No run ${runId}` }, { status: 404 });

  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (s: RunSignal) => {
        if (s.kind === 'event') {
          controller.enqueue(enc.encode(`id: ${s.event.seq}\ndata: ${JSON.stringify(s.event)}\n\n`));
        } else {
          controller.enqueue(enc.encode(`event: end\ndata: ${JSON.stringify({ error: s.error ?? null })}\n\n`));
          cleanup();
          controller.close();
        }
      };
      rec.events.filter((e) => e.seq > afterSeq).forEach((event) => send({ kind: 'event', event }));
      if (rec.finished) return send({ kind: 'end', error: rec.error });
      const unsubscribe = subscribe(runId, send);
      const heartbeat = setInterval(() => controller.enqueue(enc.encode(': keep-alive\n\n')), 15_000);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
  });
}
