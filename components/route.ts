import type { Activity, Goal, GoalEntry, Project, WaypointItem } from "./types";
import { formatGoalValue, lowerIsBetter } from "./goal";
import { fromKey, keyOf, shiftKey } from "./helpers";

/* ------------------------------------------------------------------
   The route, measured in the only unit the user actually records.

   Progress here is deliberately a *distance*, not a percentage. "66%" is a
   fact about a bar; "about three activities from your next waypoint" names
   the thing you would do next, which is the only form of progress this
   product can act on.

   Everything is counted in activities, including movement toward a numeric
   goal, so one sentence reads the same whatever kind of course it describes.
   ------------------------------------------------------------------ */

export interface RouteEstimate {
  /* activities, rounded, never below one — an estimate of zero on something
     not yet ticked would be a promise the data cannot make */
  remaining: number;
  toward: "waypoint" | "goal";
  /* the waypoint's title, or the goal's label */
  label: string;
  /* how many historical samples the average rests on. One is not enough to
     average anything, so nothing is returned below two; this is carried so
     the caller can be more tentative on thin evidence. */
  samples: number;
}

const doneOn = (activities: Activity[], projectId: string) =>
  activities
    .filter((a) => a.projectId === projectId && a.done)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

const countBetween = (list: Activity[], after: string, upTo: string) =>
  list.filter((a) => a.date > after && a.date <= upTo).length;

/* Waypoints that were reached *and* say when. done_at was added late, so a
   checkpoint ticked before it existed carries null and cannot be a sample —
   using it would place an unknown number of activities in an unknown span. */
const datedReached = (waypoints: WaypointItem[]) =>
  waypoints
    .filter((w) => w.done && w.doneAt)
    .map((w) => ({ w, key: keyOf(new Date(w.doneAt as string)) }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));

/* The average cost of a waypoint on this course, in activities.
   Needs two intervals: one sample is an anecdote, and waypoints differ enough
   in size that a single one would mislead confidently. */
export function activitiesPerWaypoint(project: Project, activities: Activity[]): number | null {
  const reached = datedReached(project.waypoints);
  if (reached.length < 2) return null;
  const list = doneOn(activities, project.id);

  const samples: number[] = [];
  for (let i = 1; i < reached.length; i++) {
    samples.push(countBetween(list, reached[i - 1].key, reached[i].key));
  }
  const usable = samples.filter((n) => n > 0);
  if (usable.length < 2) return null;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}

/* How much one activity is worth against the goal's own number, derived from
   the readings rather than assumed. Returns null when the readings do not
   move, move the wrong way, or have no activities to attribute movement to. */
export function goalUnitsPerActivity(
  project: Project,
  goal: Goal,
  entries: GoalEntry[],
  activities: Activity[]
): number | null {
  const mine = entries
    .filter((e) => e.projectId === project.id)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (mine.length < 2) return null;

  const first = mine[0];
  const last = mine[mine.length - 1];
  const moved = lowerIsBetter(goal) ? first.value - last.value : last.value - first.value;
  if (moved <= 0) return null;

  const spent = countBetween(doneOn(activities, project.id), first.date, last.date);
  if (spent < 1) return null;
  return moved / spent;
}

/* The sentence's arithmetic. Prefers the next waypoint — it is nearer, and a
   checkpoint you can name beats a number you cannot picture — and falls back
   to the goal when the route is finished or has no usable history. */
export function routeEstimate(
  project: Project,
  activities: Activity[],
  goalEntries: GoalEntry[]
): RouteEstimate | null {
  const next = project.waypoints.find((w) => !w.done);
  const perWaypoint = activitiesPerWaypoint(project, activities);

  if (next && perWaypoint !== null) {
    const reached = datedReached(project.waypoints);
    const since = reached.length
      ? countBetween(doneOn(activities, project.id), reached[reached.length - 1].key, "9999-12-31")
      : doneOn(activities, project.id).length;
    return {
      remaining: Math.max(1, Math.round(perWaypoint - since)),
      toward: "waypoint",
      label: next.title,
      samples: Math.max(0, reached.length - 1),
    };
  }

  if (project.goal) {
    const rate = goalUnitsPerActivity(project, project.goal, goalEntries, activities);
    if (rate === null) return null;
    const mine = goalEntries
      .filter((e) => e.projectId === project.id)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const current = mine[mine.length - 1].value;
    const left = lowerIsBetter(project.goal)
      ? current - project.goal.target
      : project.goal.target - current;
    if (left <= 0) return null;
    return {
      remaining: Math.max(1, Math.round(left / rate)),
      toward: "goal",
      label: project.goal.label,
      samples: mine.length - 1,
    };
  }

  return null;
}

/* "about three activities" — always hedged, because the average behind it is
   built from waypoints that were never the same size as each other. */
export function describeEstimate(e: RouteEstimate): string {
  const n = e.remaining === 1 ? "about 1 activity" : `about ${e.remaining} activities`;
  return e.toward === "waypoint" ? `${n} from ${e.label}` : `${n} from ${e.label}`;
}

/* ------------------------------------------------------------------
   Plotting a route.

   The user's plans are adaptive and externally owned — a missed workout
   re-plans every one after it — so activities cannot be scheduled weeks
   ahead. Waypoints can: they are the stable layer. This turns "I need a
   structured plan and don't have one" into checkpoints spaced across the
   time actually available, which is also the answer to not knowing what date
   to put on something vague. The dates come from the target, not from a
   guess.
   ------------------------------------------------------------------ */

export interface WaypointDraft {
  title: string;
  due: string;
}

export function plotRoute({
  count,
  from,
  target,
  goal,
}: {
  count: number;
  /* today; the first checkpoint lands after it, never on it */
  from: string;
  /* the course's target date */
  target: string;
  goal: Goal | null;
}): WaypointDraft[] {
  const span = Math.round((fromKey(target).getTime() - fromKey(from).getTime()) / 86_400_000);
  if (count < 1 || span < 1) return [];
  const n = Math.min(count, span);

  return Array.from({ length: n }, (_, i) => {
    const step = i + 1;
    const due = shiftKey(from, Math.max(1, Math.round((span * step) / n)));
    if (!goal) return { title: "", due };
    /* The numbers are spaced the same way the dates are, so a checkpoint
       names a reading rather than a vague intention. */
    const value = goal.start + ((goal.target - goal.start) * step) / n;
    return { title: `Reach ${formatGoalValue(value, goal.unit)}`, due };
  });
}
