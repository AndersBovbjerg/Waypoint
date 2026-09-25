import type { WaypointItem } from "./types";
import { fromKey, shiftKey } from "./helpers";

/* Moving a waypoint that slipped, and the route behind it.

   A missed checkpoint rarely slips alone: if the first one is three weeks
   late, the ones planned after it were planned on the assumption that it
   would be done. So moving it moves every later checkpoint not yet reached
   by the same number of days — the spacing you chose when you plotted the
   route is kept, only its start moves. Reached waypoints stay where they
   are; they are history. */

export interface Move {
  id: string;
  title: string;
  from: string;
  to: string;
}

/* whole days from a to b, both YYYY-MM-DD; rounded so a DST night counts as one */
export const daysBetween = (a: string, b: string) =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);

/* The waypoints that would move along with `wid` — not reached, dated, and
   due on or after it. */
export function laterWaypoints(waypoints: WaypointItem[], wid: string): WaypointItem[] {
  const w = waypoints.find((x) => x.id === wid);
  if (!w || !w.due) return [];
  return waypoints.filter((x) => x.id !== wid && !x.done && x.due !== "" && x.due >= w.due);
}

/* Every date change that moving `wid` to `to` makes, the waypoint itself
   first. Empty when nothing would change. */
export function reschedule(
  waypoints: WaypointItem[],
  wid: string,
  to: string,
  shiftLater: boolean
): Move[] {
  const w = waypoints.find((x) => x.id === wid);
  if (!w || !to || w.due === to) return [];
  const moves: Move[] = [{ id: w.id, title: w.title, from: w.due, to }];
  if (!shiftLater || !w.due) return moves;
  const delta = daysBetween(w.due, to);
  for (const x of laterWaypoints(waypoints, wid)) {
    moves.push({ id: x.id, title: x.title, from: x.due, to: shiftKey(x.due, delta) });
  }
  return moves;
}

/* The last date the moves land on, when it is past the course's target
   date — the one case worth asking about. Null otherwise. */
export function pastTarget(moves: Move[], target: string): string | null {
  if (!target) return null;
  const last = moves.reduce((m, x) => (x.to > m ? x.to : m), "");
  return last > target ? last : null;
}
