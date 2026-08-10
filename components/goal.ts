import type { Goal, GoalEntry, GoalUnit } from "./types";
import { pad } from "./helpers";

/* ------------------------------------------------------------------
   Reading and writing a goal's number.

   The value is always stored as a plain number — seconds for a time, kroner
   for money — so the progress arithmetic is the same whatever is being
   measured. The unit only decides how it is typed in and shown.
   ------------------------------------------------------------------ */

export const UNITS: { id: GoalUnit; label: string; hint: string }[] = [
  { id: "number", label: "Number", hint: "3" },
  { id: "time", label: "Time", hint: "1:45:00" },
  { id: "currency", label: "Kroner", hint: "10000" },
  { id: "percent", label: "Percent", hint: "80" },
];

/* Returns null for anything that is not a usable number, so a half-typed
   field never becomes a silent zero. */
export function parseGoalValue(raw: string, unit: GoalUnit): number | null {
  const text = raw.trim();
  if (!text) return null;

  if (unit === "time") {
    const parts = text.split(":");
    if (parts.some((p) => p.trim() === "" || !/^\d+$/.test(p.trim()))) return null;
    const n = parts.map((p) => Number(p));
    /* h:mm:ss, mm:ss, or a bare number read as minutes — which is what
       someone means when they type 45 for a goal time */
    if (n.length === 3) return n[0] * 3600 + n[1] * 60 + n[2];
    if (n.length === 2) return n[0] * 60 + n[1];
    if (n.length === 1) return n[0] * 60;
    return null;
  }

  const cleaned = text.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function formatGoalValue(value: number, unit: GoalUnit): string {
  if (unit === "time") {
    const total = Math.max(0, Math.round(value));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  if (unit === "currency") return `${Math.round(value).toLocaleString("da-DK")} kr`;
  if (unit === "percent") return `${round(value)}%`;
  return round(value).toLocaleString("da-DK");
}

const round = (v: number) => (Number.isInteger(v) ? v : Math.round(v * 10) / 10);

/* A target below the start means smaller is better — true of a race time,
   false of revenue. Asking would only be a chance to get it wrong. */
export const lowerIsBetter = (goal: Goal) => goal.target < goal.start;

/* Where the goal stands now: the most recent reading, or the starting value
   when nothing has been logged yet. */
export function currentValue(goal: Goal, entries: GoalEntry[]): number {
  const latest = latestEntry(entries);
  return latest ? latest.value : goal.start;
}

export function latestEntry(entries: GoalEntry[]): GoalEntry | null {
  if (!entries.length) return null;
  return [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).at(-1)!;
}

/* Share of the distance covered, 0–1. Both parts of the fraction flip sign
   together when the goal counts downwards, so one expression serves both. */
export function goalProgress(goal: Goal, current: number): number {
  const span = goal.target - goal.start;
  if (span === 0) return current === goal.target ? 1 : 0;
  return Math.min(1, Math.max(0, (current - goal.start) / span));
}

export const goalReached = (goal: Goal, current: number) =>
  lowerIsBetter(goal) ? current <= goal.target : current >= goal.target;

/* The change as it happened to the number: 2 500 more kroner is +2.500, two
   minutes faster is −2:00. The sign says which way the number moved and
   nothing else — whether that was the good direction is said by deltaIsGood,
   and shown in colour. Folding both into the sign made a rise in revenue
   read as a loss. */
export function formatDelta(from: number, to: number, goal: Goal): string | null {
  const raw = to - from;
  if (raw === 0) return null;
  return `${raw > 0 ? "+" : "−"}${formatGoalValue(Math.abs(raw), goal.unit)}`;
}

/* Whether that change was in the right direction, for colouring it. */
export const deltaIsGood = (from: number, to: number, goal: Goal) =>
  lowerIsBetter(goal) ? to < from : to > from;

/* The reading in force on a given day: the last one on or before it. Used by
   the weekly review to compare where the goal stood at each end of the week. */
export function valueOn(goal: Goal, entries: GoalEntry[], day: string): number {
  const upTo = entries.filter((e) => e.date <= day);
  const latest = latestEntry(upTo);
  return latest ? latest.value : goal.start;
}
