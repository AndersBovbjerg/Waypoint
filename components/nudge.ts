import type { Activity, ColoredProject, MissReason, RecurringActivity } from "./types";
import { shiftKey, weekdayIndex } from "./helpers";
import { targetWeeks, type TargetWeek } from "./targets";

/* ------------------------------------------------------------------
   The one card on Today that pulls you by the arm.

   At most one a day, and never more than one kind of question at once. A
   plan that did not happen yesterday comes first — it is the freshest, and
   the reason is still in your head. Failing that, from Wednesday on, the
   course furthest behind its weekly target. Before Wednesday a week has not
   had the time to fall behind in any way worth saying out loud.
   ------------------------------------------------------------------ */

export type Nudge =
  | { kind: "missed"; activity: Activity; project: ColoredProject }
  /* todayItem: an open activity already on today's list for this course —
     ticking that is the move, not logging a second one beside it */
  | { kind: "behind"; week: TargetWeek; todayItem: Activity | null };

export function pickNudge({
  projects,
  activities,
  recurring,
  reasons,
  today,
}: {
  projects: ColoredProject[];
  activities: Activity[];
  recurring: RecurringActivity[];
  reasons: Record<string, MissReason>;
  today: string;
}): Nudge | null {
  const active = new Map(projects.filter((p) => p.status === "active").map((p) => [p.id, p]));
  const yesterday = shiftKey(today, -1);

  /* Recurring first among yesterday's: those were the promises. A manual
     item left open is usually a note to self, not a plan broken. */
  const missed = activities
    .filter((a) => a.date === yesterday && !a.done && !reasons[a.id] && active.has(a.projectId))
    .sort((a, b) => Number(b.source === "recurring") - Number(a.source === "recurring"))[0];
  if (missed) return { kind: "missed", activity: missed, project: active.get(missed.projectId)! };

  if (weekdayIndex(today) < 2) return null;
  const monday = shiftKey(today, -weekdayIndex(today));
  const worst = targetWeeks({ projects, recurring, activities, monday, today })
    .filter((w) => w.behind)
    .sort((a, b) => b.shortBy - a.shortBy)[0];
  if (!worst) return null;
  const todayItem =
    activities.find((a) => a.projectId === worst.project.id && a.date === today && !a.done) ?? null;
  return { kind: "behind", week: worst, todayItem };
}

/* The first thing written under Purpose, trimmed to something a card can
   carry. The user's own words, cut at a word and never reworded. */
export function purposeQuote(purpose: string, max = 180): string | null {
  const first = purpose
    .split(/\n+/)
    .map((s) => s.trim())
    .find(Boolean);
  if (!first) return null;
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "")}…`;
}
