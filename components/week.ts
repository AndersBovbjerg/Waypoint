import type { Activity, ColoredProject, GoalEntry, Session, WaypointItem } from "./types";
import { deltaIsGood, formatDelta, formatGoalValue, valueOn } from "./goal";
import { fromKey, keyOf, shiftKey } from "./helpers";

/* Weeks run Monday to Sunday, matching the calendar grid. All of this works on
   YYYY-MM-DD keys, which compare correctly as plain strings, so nothing here
   ever touches UTC. */

export const startOfWeek = (k: string) => {
  const d = fromKey(k);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return keyOf(d);
};

export const endOfWeek = (k: string) => shiftKey(startOfWeek(k), 6);

export const weekDays = (monday: string) =>
  Array.from({ length: 7 }, (_, i) => shiftKey(monday, i));

export const isSunday = (k: string) => fromKey(k).getDay() === 0;

export const fmtWeekRange = (monday: string) => {
  const a = fromKey(monday);
  const b = fromKey(shiftKey(monday, 6));
  const sameMonth = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString("en-GB", { day: "numeric", month: sameMonth ? undefined : "short" });
  const right = b.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${left} – ${right}`;
};

export interface DayCount {
  key: string;
  planned: number;
  cleared: number;
}

export interface ProjectWeek {
  project: ColoredProject;
  planned: number;
  cleared: number;
  minutes: number;
  waypointsReached: WaypointItem[];
  /* how far through the run to the target date we are, 0–1, null without a
     usable target */
  timeGone: number | null;
  /* share of waypoints ticked, 0–1, null when the project has none */
  routeDone: number | null;
  daysToTarget: number | null;
  /* where the goal's number stood at each end of the week, when there is one */
  goalMove: { from: string; to: string; delta: string | null; good: boolean } | null;
  moved: boolean;
}

export interface Review {
  monday: string;
  sunday: string;
  days: DayCount[];
  planned: number;
  cleared: number;
  minutes: number;
  clearDays: number;
  waypointsReached: number;
  clearedActivities: Activity[];
  openActivities: Activity[];
  projects: ProjectWeek[];
}

const inWeek = (date: string, monday: string, sunday: string) => date >= monday && date <= sunday;

/* A waypoint counts for the week only if we know when it was reached. */
function reachedIn(w: WaypointItem, monday: string, sunday: string) {
  if (!w.done || !w.doneAt) return false;
  const key = keyOf(new Date(w.doneAt));
  return inWeek(key, monday, sunday);
}

export function buildReview({
  projects,
  activities,
  sessions,
  goalEntries,
  anchor,
  today,
}: {
  projects: ColoredProject[];
  activities: Activity[];
  sessions: Session[];
  goalEntries: GoalEntry[];
  /* any day inside the week being reviewed */
  anchor: string;
  today: string;
}): Review {
  const monday = startOfWeek(anchor);
  const sunday = endOfWeek(anchor);

  const weekActivities = activities.filter((a) => inWeek(a.date, monday, sunday));
  const weekSessions = sessions.filter((s) => inWeek(s.date, monday, sunday));

  const days: DayCount[] = weekDays(monday).map((key) => {
    const items = weekActivities.filter((a) => a.date === key);
    return { key, planned: items.length, cleared: items.filter((a) => a.done).length };
  });

  const clearedActivities = weekActivities
    .filter((a) => a.done)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const openActivities = weekActivities
    .filter((a) => !a.done)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const byProject: ProjectWeek[] = projects
    .map((project) => {
      const acts = weekActivities.filter((a) => a.projectId === project.id);
      const cleared = acts.filter((a) => a.done).length;
      const minutes = weekSessions
        .filter((s) => s.projectId === project.id)
        .reduce((n, s) => n + s.minutes, 0);
      const waypointsReached = project.waypoints.filter((w) => reachedIn(w, monday, sunday));

      /* pace: how much of the run to the target has elapsed, against how much
         of the route is walked */
      let timeGone: number | null = null;
      let daysToTarget: number | null = null;
      if (project.target) {
        const target = fromKey(project.target).getTime();
        const start = project.created ? fromKey(project.created).getTime() : NaN;
        const now = fromKey(today).getTime();
        daysToTarget = Math.round((target - now) / 86_400_000);
        if (Number.isFinite(start) && target > start) {
          const elapsed = Math.min(1, Math.max(0, (now - start) / (target - start)));
          /* Pace means nothing in the opening days — with barely any of the run
             gone, ticking one waypoint would read as "ahead". Stay quiet until
             the project has actually been under way for a while. */
          timeGone = elapsed >= 0.05 ? elapsed : null;
        }
      }
      /* The goal at both ends of the week. Comparing the reading in force on
         the Sunday with the one in force the day before the Monday means a
         week with no new reading correctly shows no movement, rather than
         falling back to the starting value. */
      let goalMove: ProjectWeek["goalMove"] = null;
      if (project.goal) {
        const mine = goalEntries.filter((e) => e.projectId === project.id);
        const before = valueOn(project.goal, mine, shiftKey(monday, -1));
        const after = valueOn(project.goal, mine, sunday);
        goalMove = {
          from: formatGoalValue(before, project.goal.unit),
          to: formatGoalValue(after, project.goal.unit),
          delta: formatDelta(before, after, project.goal),
          good: deltaIsGood(before, after, project.goal),
        };
      }

      const routeDone = project.waypoints.length
        ? project.waypoints.filter((w) => w.done).length / project.waypoints.length
        : null;

      return {
        project,
        planned: acts.length,
        cleared,
        minutes,
        waypointsReached,
        timeGone,
        routeDone,
        daysToTarget,
        goalMove,
        moved:
          cleared > 0 ||
          minutes > 0 ||
          waypointsReached.length > 0 ||
          Boolean(goalMove?.delta),
      };
    })
    /* active projects are always worth seeing — a week with nothing on one is
       exactly the thing a review should surface. Archived ones only appear if
       they actually moved. */
    .filter((p) => p.project.status === "active" || p.moved)
    .sort((a, b) => {
      if (a.moved !== b.moved) return a.moved ? -1 : 1;
      return b.cleared + b.waypointsReached.length * 3 - (a.cleared + a.waypointsReached.length * 3);
    });

  return {
    monday,
    sunday,
    days,
    planned: weekActivities.length,
    cleared: clearedActivities.length,
    minutes: weekSessions.reduce((n, s) => n + s.minutes, 0),
    clearDays: days.filter((d) => d.planned > 0 && d.cleared === d.planned).length,
    waypointsReached: byProject.reduce((n, p) => n + p.waypointsReached.length, 0),
    clearedActivities,
    openActivities,
    projects: byProject,
  };
}

/* The written line at the top, in the same voice as the Today note. */
export function reviewNote(r: Review) {
  if (r.planned === 0 && r.minutes === 0) {
    return "Nothing was plotted this week. A quiet week is still a week — plot the next one.";
  }
  const parts: string[] = [];
  if (r.planned > 0) parts.push(`${r.cleared} of ${r.planned} cleared`);
  if (r.waypointsReached > 0) {
    parts.push(`${r.waypointsReached} waypoint${r.waypointsReached === 1 ? "" : "s"} reached`);
  }
  const head = parts.join(", ");

  const best = r.projects.find((p) => p.moved);
  if (!best) return `${head}. Nothing moved on any project this week.`;
  if (r.cleared === r.planned && r.planned > 0) {
    return `${head}. A clean week — every activity on the board is done.`;
  }
  return `${head}. Most movement on ${best.project.name}.`;
}
