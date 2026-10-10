import { listRuns } from '@/server/runs';

/** Runs that handed a case to a person, newest first. Batch and eval runs are included. */
export function GET() {
  return Response.json(listRuns().filter((r) => r.handover));
}
