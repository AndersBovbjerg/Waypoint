import type { Activity, ColoredProject, MissReason, Project, RecurringActivity } from "./types";
import { shiftKey, weekdayIndex } from "./helpers";

/* ------------------------------------------------------------------
   Weekly targets, and what the week actually did against them.

   The unit is the one this app is honest about: activities cleared in a
   course, dated inside the week. Plans here are re-drawn week to week by
   things outside the app, so a target says "how many", never "which days" —
   it survives a watch reshuffling every run after a missed one, where a
   fixed calendar would not.

   Pure functions over date keys, like week.ts, so nothing touches UTC.
   ------------------------------------------------------------------ */

export const MISS_REASONS: { value: MissReason; label: string }[] = [
  { value: "no_time", label: "No time" },
  { value: "tired", label: "Tired" },
  { value: "sick", label: "Sick" },
  { value: "forgot", label: "Forgot" },
  { value: "not_priority", label: "Not a priority" },
];

export const reasonLabel = (r: MissReason) => MISS_REASONS.find((x) => x.value === r)?.label ?? r;

const mondayOf = (k: string) => shiftKey(k, -weekdayIndex(k));

/* The target a course is aiming for. One set on the course wins; without
   one, a course whose recurring rule already says "five days a week" has
   said how many it means, so that number is borrowed rather than asking
   twice. Paused rules promise nothing and do not count. */
export function weeklyTarget(
  project: Pick<Project, "id" | "weeklyTarget">,
  recurring: RecurringActivity[]
): { value: number; implied: boolean } | null {
  if (project.weeklyTarget) return { value: project.weeklyTarget, implied: false };
  const days = new Set(
    recurring
      .filter((r) => r.projectId === project.id && r.active)
      .flatMap((r) => r.weekdays)
  ).size;
  return days > 0 ? { value: days, implied: true } : null;
}

/* Activities cleared in a course, dated inside the week that starts on
   `monday`. Dated, not ticked: an old item ticked this week belongs to the
   week it was for, the same rule the review has always used. */
export function doneInWeek(projectId: string, activities: Activity[], monday: string): number {
  const sunday = shiftKey(monday, 6);
  return activities.filter(
    (a) => a.projectId === projectId && a.done && a.date >= monday && a.date <= sunday
  ).length;
}

/* Weeks in a row the target was hit, counting back from the week being
   looked at. A week still in progress that has not hit yet is not a miss —
   it simply is not counted, and the run is read from the week before. */
export function targetStreak(
  projectId: string,
  target: number,
  activities: Activity[],
  monday: string,
  today: string
): number {
  let w = monday;
  if (doneInWeek(projectId, activities, w) < target) {
    if (shiftKey(w, 6) < today) return 0;
    w = shiftKey(w, -7);
  }
  let n = 0;
  for (let i = 0; i < 104; i++) {
    if (doneInWeek(projectId, activities, w) < target) break;
    n++;
    w = shiftKey(w, -7);
  }
  return n;
}

export interface TargetWeek {
  project: ColoredProject;
  target: number;
  /* borrowed from a recurring rule rather than set on the course */
  implied: boolean;
  done: number;
  hit: boolean;
  /* days from today to Sunday, today included; 0 once the week is over */
  daysLeft: number;
  /* fewer than a steady pace would have by now — only ever true while the
     week is running; a finished week is simply hit or not */
  behind: boolean;
  /* how many short of that steady pace, for picking the worst one */
  shortBy: number;
  streak: number;
}

export function targetWeeks({
  projects,
  recurring,
  activities,
  monday,
  today,
}: {
  projects: ColoredProject[];
  recurring: RecurringActivity[];
  activities: Activity[];
  monday: string;
  today: string;
}): TargetWeek[] {
  const sunday = shiftKey(monday, 6);
  const running = today >= monday && today <= sunday;
  const over = sunday < today;
  /* whole days of the week already behind us — today is still open */
  const daysGone = running ? weekdayIndex(today) : over ? 7 : 0;
  const daysLeft = running ? 7 - weekdayIndex(today) : 0;

  const out: TargetWeek[] = [];
  for (const project of projects) {
    if (project.status !== "active") continue;
    const t = weeklyTarget(project, recurring);
    if (!t) continue;
    const done = doneInWeek(project.id, activities, monday);
    const hit = done >= t.value;
    const expected = Math.floor((t.value * daysGone) / 7);
    const shortBy = running && !hit ? Math.max(0, expected - done) : 0;
    out.push({
      project,
      target: t.value,
      implied: t.implied,
      done,
      hit,
      daysLeft,
      behind: shortBy > 0,
      shortBy,
      streak: targetStreak(project.id, t.value, activities, monday, today),
    });
  }
  return out;
}

/* Weeks a target was hit, out of the weeks it was aimed at, over the last
   `weeks` finished weeks. A week before a course existed is not a miss. */
export function targetsHit(
  projects: ColoredProject[],
  recurring: RecurringActivity[],
  activities: Activity[],
  today: string,
  weeks = 4
): { hit: number; total: number } {
  let hit = 0;
  let total = 0;
  const thisMonday = mondayOf(today);
  for (const project of projects) {
    if (project.status !== "active") continue;
    const t = weeklyTarget(project, recurring);
    if (!t) continue;
    for (let i = 1; i <= weeks; i++) {
      const monday = shiftKey(thisMonday, -7 * i);
      if (project.created && shiftKey(monday, 6) < project.created) continue;
      total++;
      if (doneInWeek(project.id, activities, monday) >= t.value) hit++;
    }
  }
  return { hit, total };
}

/* This week's count against your own usual week — the four before it.
   Mid-week the count is "so far" and says so, rather than comparing half a
   week to a whole one and calling it a slump. Null usual when there is no
   history to have a usual from. */
export function momentum(
  activities: Activity[],
  monday: string,
  today: string
): { count: number; usual: number | null; inProgress: boolean } {
  const done = activities.filter((a) => a.done);
  const inWeek = (m: string) => {
    const s = shiftKey(m, 6);
    return done.filter((a) => a.date >= m && a.date <= s).length;
  };
  const first = done.reduce<string | null>((min, a) => (min === null || a.date < min ? a.date : min), null);
  const prior: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const m = shiftKey(monday, -7 * i);
    if (first === null || shiftKey(m, 6) < first) break;
    prior.push(inWeek(m));
  }
  return {
    count: inWeek(monday),
    usual: prior.length ? Math.round(prior.reduce((a, b) => a + b, 0) / prior.length) : null,
    inProgress: today >= monday && today <= shiftKey(monday, 6),
  };
}

/* The week's open items, split at today. What is dated before today and
   still open did not happen; what is dated today or later has not had its
   chance yet and is not a miss — which is the whole point of the split. */
export function missedAndAhead(
  activities: Activity[],
  monday: string,
  today: string
): { missed: Activity[]; ahead: Activity[] } {
  const sunday = shiftKey(monday, 6);
  const open = activities
    .filter((a) => !a.done && a.date >= monday && a.date <= sunday)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return {
    missed: open.filter((a) => a.date < today),
    ahead: open.filter((a) => a.date >= today),
  };
}

export interface Patterns {
  /* Monday..Sunday: planned-in-advance items kept, out of those planned */
  days: { kept: number; total: number }[];
  /* the weekday that slips most, when the evidence is enough to say so */
  worstDay: number | null;
  reasons: { reason: MissReason; count: number }[];
  planned: number;
}

/* Only activities that existed before their day — the recurring ones — say
   anything about keeping to a plan. A manual activity is usually logged
   already done, so counting it would only measure how much got written
   down. Reasons are counted for anything missed in the window. */
export function patterns(
  activities: Activity[],
  reasons: Record<string, MissReason>,
  upTo: string,
  weeks = 8
): Patterns {
  const from = shiftKey(upTo, -7 * weeks);
  const inWindow = activities.filter((a) => a.date > from && a.date < upTo);
  const planned = inWindow.filter((a) => a.source === "recurring");

  const days = Array.from({ length: 7 }, () => ({ kept: 0, total: 0 }));
  for (const a of planned) {
    const d = days[weekdayIndex(a.date)];
    d.total++;
    if (a.done) d.kept++;
  }

  /* A weekday is only called out on real evidence: at least three planned
     on it, and clearly worse than the rest put together. */
  let worstDay: number | null = null;
  let worstRate = Infinity;
  const all = planned.length;
  const allKept = planned.filter((a) => a.done).length;
  days.forEach((d, i) => {
    if (d.total < 3) return;
    const rate = d.kept / d.total;
    const restTotal = all - d.total;
    const restRate = restTotal ? (allKept - d.kept) / restTotal : 1;
    if (rate < restRate - 0.15 && rate < worstRate) {
      worstRate = rate;
      worstDay = i;
    }
  });

  const counts = new Map<MissReason, number>();
  for (const a of inWindow) {
    const r = reasons[a.id];
    if (r && !a.done) counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const reasonList = [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  return { days, worstDay, reasons: reasonList, planned: all };
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/* The review's first line, when there are targets to judge the week by:
   who hit, who slipped and by how much. While the week is still running it
   speaks about pace instead, because a Wednesday is not a verdict. Null when
   no course has a target, so the caller falls back to its own summary. */
export function weekVerdict(weeks: TargetWeek[], running: boolean): string | null {
  if (!weeks.length) return null;
  const name = (w: TargetWeek) => w.project.name;
  const hits = weeks.filter((w) => w.hit);
  const short = weeks.filter((w) => !w.hit);
  const hitLine = hits.length
    ? `${joinNames(hits.map(name))} ${hits.length === 1 ? "has already hit its target" : "have already hit their targets"}.`
    : "";

  if (running) {
    if (!short.length) {
      return hits.length === 1 ? hitLine : "Every weekly target is already hit.";
    }
    const days = weeks[0].daysLeft;
    const left = `${days} day${days === 1 ? "" : "s"} left`;
    const behind = short.filter((w) => w.behind).sort((a, b) => b.shortBy - a.shortBy);
    let lead: string;
    if (behind.length === 1) {
      const b = behind[0];
      lead = `${name(b)} is behind: ${b.done} of ${b.target}, with ${left}.`;
    } else if (behind.length > 1) {
      lead = `${joinNames(behind.map(name))} are behind their targets, with ${left}.`;
    } else {
      lead = short.length === 1 ? `${name(short[0])} is on pace, with ${left}.` : `On pace so far, with ${left}.`;
    }
    return hitLine ? `${lead} ${hitLine}` : lead;
  }

  const out: string[] = [];
  if (hits.length) {
    out.push(`${joinNames(hits.map(name))} hit ${hits.length === 1 ? "its target" : "their targets"}.`);
  }
  if (short.length) {
    const [first, ...rest] = [...short].sort((a, b) => b.target - b.done - (a.target - a.done));
    out.push(`${name(first)} slipped: ${first.done} of ${first.target}.`);
    if (rest.length) out.push(`${joinNames(rest.map(name))} fell short too.`);
  }
  return out.join(" ");
}
