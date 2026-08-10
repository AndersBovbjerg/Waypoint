import type { TimerPreset, TimerRuntime, TimerSettings } from "./types";

/* ------------------------------------------------------------------
   Timer defaults, and the one thing that still belongs on the device.

   Your projects, activities and sessions live in the database — see db.ts.
   What stays here is the countdown of a timer that is running right now: it
   is about this window rather than about you, it has to survive a reload
   without a round trip, and it would be meaningless on another machine.
   ------------------------------------------------------------------ */

const TIMER_KEY = "waypoint:timer";

function readJSON<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* quota or private-mode failures must not take the app down */
    console.error("Could not save", e);
  }
}

export const localStore = {
  loadTimer(): TimerRuntime | null {
    return readJSON<TimerRuntime>(TIMER_KEY);
  },
  saveTimer(runtime: TimerRuntime | null): void {
    writeJSON(TIMER_KEY, runtime);
  },
};

/* ---------- timer defaults ---------- */
export const PRESETS: TimerPreset[] = [
  { id: "25-5", label: "25 / 5", focus: 25, break: 5, longBreak: 15, cycles: 4 },
  { id: "50-10", label: "50 / 10", focus: 50, break: 10, longBreak: 20, cycles: 3 },
  { id: "90-20", label: "90 / 20", focus: 90, break: 20, longBreak: 30, cycles: 2 },
  { id: "custom", label: "Custom", focus: 30, break: 8, longBreak: 20, cycles: 4 },
];

export const DEFAULT_TIMER: TimerSettings = {
  presetId: "25-5",
  custom: { focus: 30, break: 8 },
  autoStartBreak: true,
  autoStartFocus: false,
  sound: true,
};

export const IDLE_RUNTIME: TimerRuntime = {
  phase: "idle",
  endsAt: null,
  paused: null,
  totalMs: 0,
  cycle: 0,
  isLongBreak: false,
  projectId: null,
  activityId: null,
  startedAt: null,
};

/* Resolve a preset to the minutes actually in force, honouring a custom pair. */
export function resolvePreset(settings: TimerSettings): TimerPreset {
  const found = PRESETS.find((p) => p.id === settings.presetId) ?? PRESETS[0];
  if (found.id !== "custom") return found;
  return { ...found, focus: settings.custom.focus, break: settings.custom.break };
}
