export type Mode = "light" | "dark";
export type ProjectStatus = "active" | "archived";

export interface WaypointItem {
  id: string;
  title: string;
  due: string;
  done: boolean;
  /* when the checkpoint was reached. Without this a weekly review cannot say
     which waypoints moved *this* week. Absent on anything ticked before the
     field existed, which reads correctly as "reached at some earlier point". */
  doneAt?: string | null;
}

export interface Project {
  id: string;
  name: string;
  purpose: string;
  situation: string;
  approach: string;
  target: string;
  ci: number;
  status: ProjectStatus;
  created: string;
  waypoints: WaypointItem[];
  /* resolved from the colour slot at render time; never persisted */
  color?: string;
}

export interface Activity {
  id: string;
  projectId: string;
  title: string;
  date: string;
  done: boolean;
  doneAt?: string | null;
}

/* ---------- focus timer ---------- */

/* A completed stretch of focused work, logged against a project.
   Unlike activities, a session is a real moment in time, not a plain date —
   `date` is the local day key it belongs to, kept for grouping. */
export interface Session {
  id: string;
  projectId: string;
  activityId: string | null;
  date: string;
  startedAt: string;
  endedAt: string;
  minutes: number;
  /* false when the session was stopped early rather than run to the bell */
  completed: boolean;
}

export interface TimerPreset {
  id: string;
  label: string;
  focus: number;
  break: number;
  longBreak: number;
  /* focus blocks between long breaks; 0 disables long breaks */
  cycles: number;
}

export interface TimerSettings {
  presetId: string;
  custom: { focus: number; break: number };
  autoStartBreak: boolean;
  autoStartFocus: boolean;
  sound: boolean;
}

export type TimerPhase = "idle" | "focus" | "break";

/* The live countdown. Stored separately from the rest so a reload picks up
   a session that is still running — endsAt is an absolute timestamp, so
   elapsed time is correct even if the tab was throttled or closed. */
export interface TimerRuntime {
  phase: TimerPhase;
  /* epoch ms when the current phase ends; null while paused or idle */
  endsAt: number | null;
  /* ms left at the moment of pausing; null while running */
  paused: number | null;
  /* full length of the current phase, so elapsed = totalMs - remaining.
     Derived this way, a pause never inflates the time logged. */
  totalMs: number;
  /* which break comes next is decided by how many focus blocks are done */
  cycle: number;
  isLongBreak: boolean;
  projectId: string | null;
  activityId: string | null;
  /* epoch ms the current focus block began, for logging the session */
  startedAt: number | null;
}

export interface AppData {
  mode: Mode;
  projects: Project[];
  activities: Activity[];
  sessions: Session[];
  timer: TimerSettings;
  /* Monday key of the last week whose review was opened or dismissed, so the
     Sunday prompt stops nagging once it has been dealt with. */
  reviewSeen: string | null;
}

/* A project with its colour slot resolved to a hex value. */
export type ColoredProject = Project & { color: string };

/* The shape passed to add-activity handlers before an id/done is assigned. */
export interface NewActivity {
  projectId: string;
  title: string;
  date: string;
}
