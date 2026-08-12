import type { Activity, Project, Session } from "./types";
import { keyOf, shiftKey } from "./helpers";

/* ------------------------------------------------------------------
   One combined unit for "how much have I put into this" — turning three
   different kinds of record into a single running number that only ever
   grows. There is deliberately no ceiling: this is not "how close to the
   goal" (the goal meter and waypoints already answer that, bounded 0–100%),
   it is "how much has actually gone in so far."

   The weights are a judgement call, not a measurement:
     - a cleared activity is worth  1 point  — the everyday unit
     - a reached waypoint is worth  3 points — a checkpoint is worth several
       ordinary days of showing up
     - a focus block is worth       1 point per 25 minutes — tied to the
       shortest timer preset, so one Pomodoro is one point

   Focus minutes accumulate continuously rather than per session, so a
   47-minute sitting and two 30-minute ones both convert at the same rate —
   the running total crosses whole multiples of 25 and a point lands exactly
   there, with nothing lost to rounding a single session down.
   ------------------------------------------------------------------ */

export const ACTIVITY_POINTS = 1;
export const WAYPOINT_POINTS = 3;
export const FOCUS_MINUTES_PER_POINT = 25;

export interface EffortPoint {
  date: string;
  total: number;
}

export interface EffortSeries {
  /* one point per calendar day, from the first thing ever logged through
     `today` — empty when nothing has been logged yet */
  points: EffortPoint[];
  total: number;
  firstDate: string | null;
}

export function buildEffortSeries({
  activities,
  projects,
  sessions,
  today,
  projectId,
}: {
  activities: Activity[];
  projects: Project[];
  sessions: Session[];
  today: string;
  /* omit for the combined total across every project */
  projectId?: string;
}): EffortSeries {
  const acts = projectId ? activities.filter((a) => a.projectId === projectId) : activities;
  const projs = projectId ? projects.filter((p) => p.id === projectId) : projects;
  const sess = projectId ? sessions.filter((s) => s.projectId === projectId) : sessions;

  const deltas = new Map<string, number>();
  const bump = (date: string, n: number) => deltas.set(date, (deltas.get(date) ?? 0) + n);

  /* Tracked separately from `deltas`: the day fifteen minutes were logged is
     the day the series should start, even though that alone earns nothing
     yet. Taking the first date a whole point actually lands on would skip
     straight past real, if partial, effort — the graph would say "since the
     first point," not "since you started." */
  let firstDate: string | null = null;
  const noticed = (date: string) => {
    if (firstDate === null || date < firstDate) firstDate = date;
  };

  /* attributed to when it was actually finished, not the day it was planned
     for — this is a record of effort spent, the opposite framing from the
     weekly review, which deliberately anchors to the plan instead */
  acts
    .filter((a) => a.done)
    .forEach((a) => {
      const d = a.doneAt ? keyOf(new Date(a.doneAt)) : a.date;
      bump(d, ACTIVITY_POINTS);
      noticed(d);
    });

  projs.forEach((p) =>
    p.waypoints.forEach((w) => {
      if (w.done && w.doneAt) {
        const d = keyOf(new Date(w.doneAt));
        bump(d, WAYPOINT_POINTS);
        noticed(d);
      }
    })
  );

  const minutesByDate = new Map<string, number>();
  sess.forEach((s) => {
    if (s.minutes > 0) noticed(s.date);
    minutesByDate.set(s.date, (minutesByDate.get(s.date) ?? 0) + s.minutes);
  });
  let runningMinutes = 0;
  let awardedSoFar = 0;
  [...minutesByDate.keys()].sort().forEach((date) => {
    runningMinutes += minutesByDate.get(date)!;
    const earned = Math.floor(runningMinutes / FOCUS_MINUTES_PER_POINT);
    if (earned > awardedSoFar) {
      bump(date, earned - awardedSoFar);
      awardedSoFar = earned;
    }
  });

  if (firstDate === null) return { points: [], total: 0, firstDate: null };
  /* re-bound to a const: TypeScript can't carry the null-check narrowing of a
     `let` through the closures above that reassign it */
  const start: string = firstDate;
  const points: EffortPoint[] = [];
  let running = 0;
  for (let d = start; d <= today; d = shiftKey(d, 1)) {
    running += deltas.get(d) ?? 0;
    points.push({ date: d, total: running });
  }
  return { points, total: running, firstDate: start };
}

/* A clean ceiling for the y-axis — 1/2/5 × a power of ten, never a value
   the data would sit flush against. */
export function niceCeil(max: number): number {
  if (max <= 0) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  for (const step of [1, 2, 5, 10]) {
    const candidate = step * pow;
    if (candidate >= max) return candidate;
  }
  return 10 * pow;
}
