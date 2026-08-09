import type { Mode } from "./types";

/* Six project slots. Same slot, two tunings — dark needs more light in
   the colour or the muted tones disappear against the background. */
export const PALETTES: Record<Mode, string[]> = {
  light: ["#7A5C8E", "#3F6B63", "#A6713D", "#5A6E97", "#9A5566", "#4F7A4A"],
  dark: ["#B79BD6", "#6FBFAE", "#D8A264", "#93AEE0", "#DC8C9E", "#8FC98A"],
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
export const fmtLong = (k: string) =>
  fromKey(k).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
export const fmtShort = (k: string) =>
  fromKey(k).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
export const uid = () => Math.random().toString(36).slice(2, 10);

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
