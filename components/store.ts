import type { AppData, Mode, TimerPreset, TimerRuntime, TimerSettings } from "./types";
import { shiftKey, todayKey, uid } from "./helpers";

const DATA_KEY = "waypoint:v3";
const TIMER_KEY = "waypoint:timer";

/* ------------------------------------------------------------------
   Persistence sits behind this interface so phase 2 can swap
   localStorage for Supabase by replacing the implementation below,
   not by touching every component.
   ------------------------------------------------------------------ */
export interface WaypointStore {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  loadTimer(): TimerRuntime | null;
  saveTimer(runtime: TimerRuntime | null): void;
}

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

export const localStore: WaypointStore = {
  async load() {
    return readJSON<AppData>(DATA_KEY);
  },
  async save(data) {
    writeJSON(DATA_KEY, data);
  },
  loadTimer() {
    return readJSON<TimerRuntime>(TIMER_KEY);
  },
  saveTimer(runtime) {
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

/* ---------- first-run sample so the dashboard isn't blank ---------- */
export function seed(): AppData {
  const t = todayKey();
  const p1 = uid();
  const p2 = uid();
  return {
    mode: "light",
    timer: DEFAULT_TIMER,
    sessions: [],
    reviewSeen: null,
    projects: [
      {
        id: p1,
        name: "Three paying web clients",
        purpose: "Turn the side work into income I can rely on.",
        situation: "Two portfolio pieces built, no signed clients yet.",
        approach: "Ten cold approaches a week, mockup only after interest.",
        target: shiftKey(t, 90),
        ci: 0,
        status: "active",
        created: t,
        waypoints: [
          { id: uid(), title: "Portfolio page live", due: shiftKey(t, 7), done: true },
          { id: uid(), title: "20 businesses contacted", due: shiftKey(t, 30), done: false },
          { id: uid(), title: "First signed client", due: shiftKey(t, 55), done: false },
          { id: uid(), title: "Third signed client", due: shiftKey(t, 90), done: false },
        ],
      },
      {
        id: p2,
        name: "Match-fit for the season",
        purpose: "Play a full 90 without dropping off.",
        situation: "Training twice a week, no structured strength work.",
        approach: "Three strength sessions plus one running session weekly.",
        target: shiftKey(t, 60),
        ci: 1,
        status: "active",
        created: t,
        waypoints: [
          { id: uid(), title: "Baseline test done", due: shiftKey(t, 3), done: true },
          { id: uid(), title: "Four weeks unbroken", due: shiftKey(t, 28), done: false },
          { id: uid(), title: "Retest and compare", due: shiftKey(t, 60), done: false },
        ],
      },
    ],
    activities: [
      { id: uid(), projectId: p1, title: "Call the bakery back", date: t, done: false },
      { id: uid(), projectId: p1, title: "Write five outreach emails", date: t, done: true },
      { id: uid(), projectId: p2, title: "Strength session A", date: t, done: false },
      { id: uid(), projectId: p2, title: "Easy 5 km run", date: shiftKey(t, 1), done: false },
      { id: uid(), projectId: p1, title: "Update portfolio copy", date: shiftKey(t, 2), done: false },
      { id: uid(), projectId: p2, title: "Strength session B", date: shiftKey(t, -1), done: true },
      { id: uid(), projectId: p1, title: "List 10 local businesses", date: shiftKey(t, -2), done: true },
      { id: uid(), projectId: p2, title: "Strength session C", date: shiftKey(t, -3), done: false },
    ],
  };
}

/* carry over records from the earlier builds */
export function normalise(saved: AppData): AppData {
  const projects = (saved.projects || []).map((p) => {
    if (typeof p.ci === "number") return p;
    const legacy = ["#A8325A", "#2E6F7E", "#B4762A", "#4E7A3C", "#6A4E8C", "#B4453A"].indexOf(
      (p as { color?: string }).color ?? ""
    );
    return { ...p, ci: legacy >= 0 ? legacy : 0 };
  });
  return {
    mode: (saved.mode === "dark" ? "dark" : "light") as Mode,
    projects,
    activities: saved.activities || [],
    sessions: saved.sessions || [],
    timer: { ...DEFAULT_TIMER, ...(saved.timer || {}) },
    reviewSeen: saved.reviewSeen ?? null,
  };
}
