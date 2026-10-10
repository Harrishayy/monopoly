import { TRACK_META } from '@casework/tracks/meta';

export function GET() {
  return Response.json(Object.values(TRACK_META));
}
