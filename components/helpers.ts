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
/* Consecutive days, going back from today, where every planned activity was
   cleared. A day with nothing planned is skipped rather than breaking the
   streak. If today still has open items, the count starts from yesterday —
   today is still in progress, not yet a miss. Used by Statistics, where the
   point is "did you follow through on what you planned" — a day you never
   scheduled anything shouldn't read as a failure when looking back. */
export function clearStreak(activities: { date: string; done: boolean }[], today: string): number {
  let count = 0;
  let k = today;
  const todayItems = activities.filter((a) => a.date === today);
  if (todayItems.length > 0 && !todayItems.every((a) => a.done)) k = shiftKey(today, -1);
  for (let i = 0; i < 400; i++) {
    const items = activities.filter((a) => a.date === k);
    if (items.length === 0) {
      k = shiftKey(k, -1);
      continue;
    }
    if (items.every((a) => a.done)) {
      count++;
      k = shiftKey(k, -1);
    } else break;
  }
  return count;
}

/* A stricter cousin of clearStreak, for the home-screen widget only: a day
   with nothing logged ENDS the streak instead of being skipped over. The
   whole point of a "don't break the chain" widget is to make inactivity
   visible — clearStreak's leniency (right for reviewing history in
   Statistics) would otherwise leave the widget frozen on an old number
   through days of not opening the app at all, which is exactly backwards
   for something meant to pull you back in. Today itself still gets the same
   grace as clearStreak: still in progress, not yet a miss, so an empty or
   partly-done today doesn't zero out a real streak before the day is over. */
export function engagementStreak(activities: { date: string; done: boolean }[], today: string): number {
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
