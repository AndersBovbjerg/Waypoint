import type {
  Activity,
  AppData,
  Goal,
  GoalEntry,
  GoalUnit,
  Mode,
  Project,
  ProjectStatus,
  RecurringActivity,
  Session,
  TimerSettings,
  WaypointItem,
} from "./types";
import { DEFAULT_TIMER } from "./store";
import { fromKey, keyOf, uid } from "./helpers";
import { getSupabase } from "./supabase";

/* ------------------------------------------------------------------
   The database, one record at a time.

   The localStorage store saved the whole dataset on every change, which is
   fine for a few kilobytes and wrong for Postgres — a single tick would
   rewrite every row the user owns. Everything here is scoped to the record
   that actually changed, so a write is small and a failure can be rolled
   back on its own.

   Dates keep the same discipline as the rest of the app: `date`, `due` and
   `target` are plain Postgres dates and travel as YYYY-MM-DD strings, while
   anything that is a real instant is a timestamptz. `created_at` is an
   instant, so it is converted to a local day key on the way in — never with
   toISOString, which would shift the day for anyone east of UTC.
   ------------------------------------------------------------------ */

interface ProjectRow {
  id: string;
  name: string;
  purpose: string | null;
  situation: string | null;
  approach: string | null;
  target: string | null;
  ci: number;
  status: string;
  created_at: string;
  goal_label: string | null;
  goal_unit: string | null;
  goal_start: number | null;
  goal_target: number | null;
  icon: string | null;
}

interface GoalEntryRow {
  id: string;
  project_id: string;
  date: string;
  value: number;
}

interface WaypointRow {
  id: string;
  project_id: string;
  title: string;
  due: string | null;
  done: boolean;
  done_at: string | null;
  position: number;
}

interface ActivityRow {
  id: string;
  project_id: string;
  title: string;
  date: string;
  done: boolean;
  done_at: string | null;
  source?: string | null;
  external_id?: string | null;
  distance_m?: number | null;
  moving_time_s?: number | null;
  elapsed_time_s?: number | null;
  avg_hr?: number | null;
  max_hr?: number | null;
  elevation_gain_m?: number | null;
  activity_type?: string | null;
}

interface RecurringRow {
  id: string;
  project_id: string;
  title: string;
  weekdays: number[];
  active: boolean;
  created_at: string;
}

interface SessionRow {
  id: string;
  project_id: string;
  activity_id: string | null;
  date: string;
  started_at: string;
  ended_at: string;
  minutes: number;
  completed: boolean;
}

interface PrefsRow {
  mode: string | null;
  review_seen: string | null;
  timer: Partial<TimerSettings> | null;
}

/* ---------- row → app ---------- */

const toWaypoint = (r: WaypointRow): WaypointItem => ({
  id: r.id,
  title: r.title,
  due: r.due ?? "",
  done: r.done,
  doneAt: r.done_at,
});

/* A goal only exists once it has a name and both ends of the journey. Half a
   goal is no goal, and it would make the progress arithmetic meaningless. */
const toGoal = (r: ProjectRow): Goal | null =>
  r.goal_label && r.goal_start !== null && r.goal_target !== null
    ? {
        label: r.goal_label,
        unit: (r.goal_unit ?? "number") as GoalUnit,
        start: Number(r.goal_start),
        target: Number(r.goal_target),
      }
    : null;

const toGoalEntry = (r: GoalEntryRow): GoalEntry => ({
  id: r.id,
  projectId: r.project_id,
  date: r.date,
  value: Number(r.value),
});

const toProject = (r: ProjectRow, waypoints: WaypointItem[]): Project => ({
  id: r.id,
  name: r.name,
  purpose: r.purpose ?? "",
  situation: r.situation ?? "",
  approach: r.approach ?? "",
  target: r.target ?? "",
  ci: r.ci,
  status: (r.status === "archived" ? "archived" : "active") as ProjectStatus,
  created: keyOf(new Date(r.created_at)),
  waypoints,
  goal: toGoal(r),
  icon: r.icon,
});

const toActivity = (r: ActivityRow): Activity => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  date: r.date,
  done: r.done,
  doneAt: r.done_at,
  source: r.source ?? "manual",
  externalId: r.external_id ?? null,
  distanceM: r.distance_m ?? null,
  movingTimeS: r.moving_time_s ?? null,
  elapsedTimeS: r.elapsed_time_s ?? null,
  avgHr: r.avg_hr ?? null,
  maxHr: r.max_hr ?? null,
  elevationGainM: r.elevation_gain_m ?? null,
  activityType: r.activity_type ?? null,
});

const toSession = (r: SessionRow): Session => ({
  id: r.id,
  projectId: r.project_id,
  activityId: r.activity_id,
  date: r.date,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  minutes: r.minutes,
  completed: r.completed,
});

/* created_at is an instant; converted to a local day key on the way in for
   the same reason projects.created is — pendingRecurringDates compares it
   against other date keys as a plain string, never through Date again. */
const toRecurring = (r: RecurringRow): RecurringActivity => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  weekdays: r.weekdays,
  active: r.active,
  createdAt: keyOf(new Date(r.created_at)),
});

/* ---------- app → row ---------- */

const projectRow = (p: Project, userId: string) => ({
  id: p.id,
  user_id: userId,
  name: p.name,
  purpose: p.purpose,
  situation: p.situation,
  approach: p.approach,
  /* an empty date input must become null, not the empty string */
  target: p.target || null,
  ci: p.ci,
  status: p.status,
  created_at: p.created ? fromKey(p.created).toISOString() : new Date().toISOString(),
  goal_label: p.goal?.label || null,
  goal_unit: p.goal?.unit ?? null,
  goal_start: p.goal ? p.goal.start : null,
  goal_target: p.goal ? p.goal.target : null,
  icon: p.icon,
});

const waypointRow = (w: WaypointItem, projectId: string, position: number) => ({
  id: w.id,
  project_id: projectId,
  title: w.title,
  due: w.due || null,
  done: w.done,
  done_at: w.doneAt ?? null,
  position,
});

const activityRow = (a: Activity, userId: string, source = "manual") => ({
  id: a.id,
  user_id: userId,
  project_id: a.projectId,
  title: a.title,
  date: a.date,
  done: a.done,
  done_at: a.doneAt ?? null,
  source,
});

/* Supabase returns errors rather than throwing. Surfacing the message keeps
   the copy rule — say what happened, not "something went wrong". */
function check(error: { message: string } | null, doing: string): void {
  if (error) throw new Error(`Could not ${doing}: ${error.message}`);
}

export async function loadAll(userId: string): Promise<AppData> {
  const db = getSupabase();
  const [projects, waypoints, activities, recurring, sessions, goalEntries, prefs] =
    await Promise.all([
      db.from("projects").select("*").order("created_at", { ascending: true }),
      db.from("waypoints").select("*").order("position", { ascending: true }),
      db.from("activities").select("*").order("date", { ascending: true }),
      db.from("recurring_activities").select("*").order("created_at", { ascending: true }),
      db.from("sessions").select("*").order("started_at", { ascending: true }),
      db.from("goal_entries").select("*").order("date", { ascending: true }),
      db.from("prefs").select("mode, review_seen, timer").eq("user_id", userId).maybeSingle(),
    ]);

  check(projects.error, "load your projects");
  check(waypoints.error, "load your waypoints");
  check(activities.error, "load your activities");
  /* Unlike Strava, there's no flag gating this — recurring_activities is
     queried on every load, not behind a toggle, so unlike Strava's rollout
     this one genuinely cannot deploy before migration-phase-4-recurring.sql
     has been run. A missing table here fails the whole app's load, not just
     one feature. */
  check(recurring.error, "load your recurring activities");
  check(sessions.error, "load your focus sessions");
  check(goalEntries.error, "load your goal readings");
  check(prefs.error, "load your preferences");

  const byProject = new Map<string, WaypointItem[]>();
  ((waypoints.data ?? []) as WaypointRow[]).forEach((w) => {
    const list = byProject.get(w.project_id) ?? [];
    list.push(toWaypoint(w));
    byProject.set(w.project_id, list);
  });

  const p = (prefs.data ?? null) as PrefsRow | null;

  return {
    mode: (p?.mode === "dark" ? "dark" : "light") as Mode,
    projects: ((projects.data ?? []) as ProjectRow[]).map((r) =>
      toProject(r, byProject.get(r.id) ?? [])
    ),
    activities: ((activities.data ?? []) as ActivityRow[]).map(toActivity),
    recurringActivities: ((recurring.data ?? []) as RecurringRow[]).map(toRecurring),
    sessions: ((sessions.data ?? []) as SessionRow[]).map(toSession),
    goalEntries: ((goalEntries.data ?? []) as GoalEntryRow[]).map(toGoalEntry),
    timer: { ...DEFAULT_TIMER, ...(p?.timer ?? {}) },
    reviewSeen: p?.review_seen ?? null,
  };
}

/* ---------- projects ---------- */

export async function saveProject(p: Project, userId: string) {
  const db = getSupabase();
  check((await db.from("projects").upsert(projectRow(p, userId))).error, "save the project");
  /* A project saved from the modal carries whatever waypoints it already had;
     the modal itself never edits them, so this only matters on first insert. */
  if (p.waypoints.length) {
    const rows = p.waypoints.map((w, i) => waypointRow(w, p.id, i));
    check((await db.from("waypoints").upsert(rows)).error, "save the waypoints");
  }
}

export async function deleteProject(id: string) {
  const db = getSupabase();
  /* waypoints and activities both cascade on the foreign key, so this is one
     statement rather than three */
  check((await db.from("projects").delete().eq("id", id)).error, "delete the project");
}

export async function setProjectStatus(id: string, status: ProjectStatus) {
  const db = getSupabase();
  check(
    (await db.from("projects").update({ status }).eq("id", id)).error,
    status === "archived" ? "archive the project" : "reactivate the project"
  );
}

/* ---------- waypoints ---------- */

export async function addWaypoint(w: WaypointItem, projectId: string, position: number) {
  const db = getSupabase();
  check(
    (await db.from("waypoints").insert(waypointRow(w, projectId, position))).error,
    "add the waypoint"
  );
}

export async function setWaypointDone(id: string, done: boolean, doneAt: string | null) {
  const db = getSupabase();
  check(
    (await db.from("waypoints").update({ done, done_at: doneAt }).eq("id", id)).error,
    "update the waypoint"
  );
}

export async function deleteWaypoint(id: string) {
  const db = getSupabase();
  check((await db.from("waypoints").delete().eq("id", id)).error, "delete the waypoint");
}

/* ---------- activities ---------- */

export async function addActivity(a: Activity, userId: string) {
  const db = getSupabase();
  check((await db.from("activities").insert(activityRow(a, userId))).error, "add the activity");
}

export async function addActivities(list: Activity[], userId: string) {
  const db = getSupabase();
  const rows = list.map((a) => activityRow(a, userId, "import"));
  check((await db.from("activities").insert(rows)).error, "import the activities");
}

export async function setActivityDone(id: string, done: boolean, doneAt: string | null) {
  const db = getSupabase();
  check(
    (await db.from("activities").update({ done, done_at: doneAt }).eq("id", id)).error,
    "update the activity"
  );
}

export async function deleteActivity(id: string) {
  const db = getSupabase();
  check((await db.from("activities").delete().eq("id", id)).error, "delete the activity");
}

/* ---------- recurring activities ---------- */

export async function addRecurring(r: RecurringActivity, userId: string) {
  const db = getSupabase();
  check(
    (
      await db.from("recurring_activities").insert({
        id: r.id,
        user_id: userId,
        project_id: r.projectId,
        title: r.title,
        weekdays: r.weekdays,
        active: r.active,
        created_at: fromKey(r.createdAt).toISOString(),
      })
    ).error,
    "add the recurring activity"
  );
}

export async function setRecurringWeekdays(id: string, weekdays: number[]) {
  const db = getSupabase();
  check(
    (await db.from("recurring_activities").update({ weekdays }).eq("id", id)).error,
    "update the recurring activity"
  );
}

export async function setRecurringActive(id: string, active: boolean) {
  const db = getSupabase();
  check(
    (await db.from("recurring_activities").update({ active }).eq("id", id)).error,
    active ? "reactivate the recurring activity" : "pause the recurring activity"
  );
}

export async function deleteRecurring(id: string) {
  const db = getSupabase();
  check(
    (await db.from("recurring_activities").delete().eq("id", id)).error,
    "delete the recurring activity"
  );
}

/* Turns pendingRecurringDates' candidates into real activity rows. Written
   with ignoreDuplicates rather than a plain insert: two tabs open at once,
   or this running twice in a race, must never be able to touch a row that
   already exists — Postgres does ON CONFLICT DO NOTHING, so `.select()`
   returns only what was genuinely just inserted, and anything already there
   (including one already checked off) is left completely alone. */
export async function materializeRecurring(
  candidates: { ruleId: string; projectId: string; title: string; date: string; externalId: string }[],
  userId: string
): Promise<Activity[]> {
  if (candidates.length === 0) return [];
  const db = getSupabase();
  const rows = candidates.map((c) => ({
    id: uid(),
    user_id: userId,
    project_id: c.projectId,
    title: c.title,
    date: c.date,
    done: false,
    done_at: null,
    source: "recurring",
    external_id: c.externalId,
  }));
  const { data, error } = await db
    .from("activities")
    .upsert(rows, { onConflict: "user_id,source,external_id", ignoreDuplicates: true })
    .select();
  check(error, "generate today's recurring activities");
  return ((data ?? []) as ActivityRow[]).map(toActivity);
}

/* ---------- sessions ---------- */

export async function addSession(s: Session, userId: string) {
  const db = getSupabase();
  check(
    (
      await db.from("sessions").insert({
        id: s.id,
        user_id: userId,
        project_id: s.projectId,
        activity_id: s.activityId,
        date: s.date,
        started_at: s.startedAt,
        ended_at: s.endedAt,
        minutes: s.minutes,
        completed: s.completed,
      })
    ).error,
    "log the focus session"
  );
}

/* ---------- prefs ---------- */

export async function savePrefs(
  userId: string,
  prefs: { mode?: Mode; reviewSeen?: string | null; timer?: TimerSettings }
) {
  const db = getSupabase();
  const row: Record<string, unknown> = { user_id: userId };
  if (prefs.mode !== undefined) row.mode = prefs.mode;
  if (prefs.reviewSeen !== undefined) row.review_seen = prefs.reviewSeen;
  if (prefs.timer !== undefined) row.timer = prefs.timer;
  check((await db.from("prefs").upsert(row)).error, "save your preferences");
}

/* ---------- goal readings ---------- */

export async function addGoalEntry(e: GoalEntry, userId: string) {
  const db = getSupabase();
  check(
    (
      await db.from("goal_entries").insert({
        id: e.id,
        user_id: userId,
        project_id: e.projectId,
        date: e.date,
        value: e.value,
      })
    ).error,
    "log the reading"
  );
}

export async function deleteGoalEntry(id: string) {
  const db = getSupabase();
  check((await db.from("goal_entries").delete().eq("id", id)).error, "delete the reading");
}

/* ---------- Strava ---------- */

export interface StravaConnection {
  athleteId: number;
  syncProjectId: string | null;
}

/* Only the columns the UI needs — never the tokens themselves, which stay
   server-side. RLS still scopes this to the signed-in user's own row. */
export async function getStravaConnection(userId: string): Promise<StravaConnection | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from("strava_tokens")
    .select("athlete_id, sync_project_id")
    .eq("user_id", userId)
    .maybeSingle();
  check(error, "load your Strava connection");
  return data ? { athleteId: data.athlete_id, syncProjectId: data.sync_project_id } : null;
}

export async function setStravaSyncProject(userId: string, projectId: string) {
  const db = getSupabase();
  check(
    (await db.from("strava_tokens").update({ sync_project_id: projectId }).eq("user_id", userId))
      .error,
    "set your Strava sync project"
  );
}
