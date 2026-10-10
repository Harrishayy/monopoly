import { directory } from '@/server/live/directory';

/** The agency register (fictional seed): landlords, properties, tenants and contractors. */
export function GET() {
  return Response.json(directory());
}
