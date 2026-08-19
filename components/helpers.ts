import type { Mode } from "./types";

/* Twelve project slots. Same slot, two tunings — dark needs more light in
   the colour or the muted tones disappear against the background. A project
   stores the slot, never a hex value, so it keeps its identity across modes
   instead of looking right in one and wrong in the other. */
export const PALETTES: Record<Mode, string[]> = {
  light: [
    "#7A5C8E", "#3F6B63", "#A6713D", "#5A6E97", "#9A5566", "#4F7A4A",
    "#3E6E7E", "#7C7A3F", "#A2564A", "#5E5A96", "#7A6455", "#8A7A32",
  ],
  dark: [
    "#B79BD6", "#6FBFAE", "#D8A264", "#93AEE0", "#DC8C9E", "#8FC98A",
    "#7FC0D2", "#C4C177", "#DE9184", "#9C97DE", "#C0A894", "#D2C169",
  ],
};

/* ---------- date helpers (local time, no UTC drift) ---------- */
export const pad = (n: number) => String(n).padStart(2, "0");
export const keyOf = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayKey = () => keyOf(new Date());
export const shiftKey = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
/* Consecutive real calendar days, going back from today, where everything
   planned was cleared. A day with nothing logged at all ENDS the streak —
   it does not get skipped over — because "days in a row with everything
   cleared" has to mean actual days in a row, not just the days that
   happened to have something on them. (An earlier version skipped empty
   days instead; it read as a higher number than the days the user could
   actually count for themselves, which is exactly backwards for a figure
   whose only job is to be trusted at a glance.) Today itself still gets a
   grace: still in progress, not yet a miss, so an empty or partly-done
   today doesn't zero out a real streak before the day is over. Shared by
   Statistics and the home-screen widget — one definition, so the two can
   never quietly disagree with each other. */
export function clearStreak(activities: { date: string; done: boolean }[], today: string): number {
  const todayItems = activities.filter((a) => a.date === today);
  const todayDone = todayItems.length > 0 && todayItems.every((a) => a.done);

  let count = todayDone ? 1 : 0;
  let k = shiftKey(today, -1);
  for (let i = 0; i < 400; i++) {
    const items = activities.filter((a) => a.date === k);
    if (items.length === 0 || !items.every((a) => a.done)) break;
    count++;
    k = shiftKey(k, -1);
  }
  return count;
}

/* Monday=0..Sunday=6 — this app's own convention, matching the Monday-first
   calendar grid. Never JS's native Date.getDay() (0=Sunday) on its own; that
   would silently disagree with every other day-of-week idea in this app. */
export const weekdayIndex = (k: string): number => (fromKey(k).getDay() + 6) % 7;

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const formatWeekdays = (days: number[]): string =>
  [...days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d])
    .join(", ");

interface RecurringRuleLike {
  id: string;
  projectId: string;
  title: string;
  weekdays: number[];
  active: boolean;
  /* a date key, not an instant — see toRecurring in db.ts */
  createdAt: string;
}

interface PendingRecurring {
  ruleId: string;
  projectId: string;
  title: string;
  date: string;
  externalId: string;
}

/* Which recurring rows are missing from the window around today, and need to
   be created. Pure and DB-free on purpose — every date computation in it is
   the same string arithmetic as the rest of this file, so it gets the same
   throwaway-test treatment before being wired to a real upsert.

   Two things keep this honest rather than just convenient:
   - it walks *backward* too, not just from today forward, so a rule's actual
     history exists even after days the app wasn't opened at all — that's
     what makes the streak and the weekly review a true record instead of
     "whatever got logged."
   - a rule is never backfilled before its own createdAt: a rule added today
     shouldn't retroactively invent a plan for last Monday, when it did not
     yet exist to be planned.

   existingExternalIds is a Set of `${ruleId}_${date}` already present in
   `activities.external_id` — checked here as a cheap client-side skip (the
   unique index plus ignoreDuplicates is still what makes writing this
   list actually safe; this is just why the list stays small). */
export function pendingRecurringDates(
  rules: RecurringRuleLike[],
  existingExternalIds: ReadonlySet<string>,
  today: string,
  backDays = 14,
  fwdDays = 7
): PendingRecurring[] {
  const out: PendingRecurring[] = [];
  for (const rule of rules) {
    if (!rule.active) continue;
    for (let offset = -backDays; offset <= fwdDays; offset++) {
      const date = shiftKey(today, offset);
      if (date < rule.createdAt) continue;
      if (!rule.weekdays.includes(weekdayIndex(date))) continue;
      const externalId = `${rule.id}_${date}`;
      if (existingExternalIds.has(externalId)) continue;
      out.push({ ruleId: rule.id, projectId: rule.projectId, title: rule.title, date, externalId });
    }
  }
  return out;
}

export const fmtLong = (k: string) =>
  fromKey(k).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
export const fmtShort = (k: string) =>
  fromKey(k).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
/* Real UUIDs, because every primary key in Postgres is one and an optimistic
   insert has to know the id before the row reaches the server. The fallback
   covers browsers without randomUUID on an insecure origin. */
export const uid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = [...crypto.getRandomValues(new Uint8Array(16))].map((b) =>
    b.toString(16).padStart(2, "0")
  );
  hex[6] = ((parseInt(hex[6], 16) & 0x0f) | 0x40).toString(16).padStart(2, "0");
  hex[8] = ((parseInt(hex[8], 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
};

/* ms remaining as MM:SS, clamped at zero so a stale tick never shows a negative */
export const fmtClock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

/* whole minutes as a compact "2h 35m" / "45m" */
export const fmtDuration = (minutes: number) => {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
};

/* "5.2 km · 28m · avg HR 152" for a synced Strava activity — null when the
   activity has none of the fields (manual/import rows, or a Strava type
   with no distance, like a strength workout). */
export function formatStravaMetrics(a: {
  distanceM?: number | null;
  movingTimeS?: number | null;
  avgHr?: number | null;
}): string | null {
  const parts: string[] = [];
  if (a.distanceM) parts.push(`${(a.distanceM / 1000).toFixed(1)} km`);
  if (a.movingTimeS) parts.push(fmtDuration(a.movingTimeS / 60));
  if (a.avgHr) parts.push(`avg HR ${Math.round(a.avgHr)}`);
  return parts.length ? parts.join(" · ") : null;
}

/* ms until the next local midnight — used to re-date an app left open overnight */
export const msUntilMidnight = (now = new Date()) => {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
};

/* ---------- dashboard copy ---------- */
export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late one";
  if (h < 11) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

export function courseNote(items: { done: boolean; title: string }[]) {
  const n = items.length;
  const d = items.filter((i) => i.done).length;
  if (n === 0) return "Nothing plotted for today. Add one thing, or take the day off.";
  if (d === n) return `All ${n} cleared. Nothing left on today's course.`;
  if (d === 0) return `${n} plotted for today. Start with ${items[0].title}.`;
  const next = items.find((i) => !i.done)!;
  return `${d} of ${n} cleared. Next up: ${next.title}.`;
}
