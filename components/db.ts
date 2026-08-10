import type {
  Activity,
  AppData,
  Mode,
  Project,
  ProjectStatus,
  Session,
  TimerSettings,
  WaypointItem,
} from "./types";
import { DEFAULT_TIMER } from "./store";
import { fromKey, keyOf } from "./helpers";
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
});

const toActivity = (r: ActivityRow): Activity => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  date: r.date,
  done: r.done,
  doneAt: r.done_at,
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
  const [projects, waypoints, activities, sessions, prefs] = await Promise.all([
    db.from("projects").select("*").order("created_at", { ascending: true }),
    db.from("waypoints").select("*").order("position", { ascending: true }),
    db.from("activities").select("*").order("date", { ascending: true }),
    db.from("sessions").select("*").order("started_at", { ascending: true }),
    db.from("prefs").select("mode, review_seen, timer").eq("user_id", userId).maybeSingle(),
  ]);

  check(projects.error, "load your projects");
  check(waypoints.error, "load your waypoints");
  check(activities.error, "load your activities");
  check(sessions.error, "load your focus sessions");
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
    sessions: ((sessions.data ?? []) as SessionRow[]).map(toSession),
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

/* ---------- one-time carry-over from the local build ---------- */

/* Ids from before the move were short random strings, not UUIDs, so every id
   is reissued and the references remapped as they go. Runs only into an empty
   account, so it can never overwrite something already in the database. */
export async function importLocal(local: AppData, userId: string, newId: () => string) {
  const db = getSupabase();
  const projectIds = new Map<string, string>();
  const activityIds = new Map<string, string>();

  const projectRows = local.projects.map((p) => {
    const id = newId();
    projectIds.set(p.id, id);
    return projectRow({ ...p, id }, userId);
  });
  if (projectRows.length) {
    check((await db.from("projects").insert(projectRows)).error, "carry over your projects");
  }

  const waypointRows = local.projects.flatMap((p) =>
    p.waypoints.map((w, i) => waypointRow({ ...w, id: newId() }, projectIds.get(p.id)!, i))
  );
  if (waypointRows.length) {
    check((await db.from("waypoints").insert(waypointRows)).error, "carry over your waypoints");
  }

  const activityRows = local.activities
    .filter((a) => projectIds.has(a.projectId))
    .map((a) => {
      const id = newId();
      activityIds.set(a.id, id);
      return activityRow({ ...a, id, projectId: projectIds.get(a.projectId)! }, userId);
    });
  if (activityRows.length) {
    check((await db.from("activities").insert(activityRows)).error, "carry over your activities");
  }

  const sessionRows = local.sessions
    .filter((s) => projectIds.has(s.projectId))
    .map((s) => ({
      id: newId(),
      user_id: userId,
      project_id: projectIds.get(s.projectId)!,
      activity_id: s.activityId ? activityIds.get(s.activityId) ?? null : null,
      date: s.date,
      started_at: s.startedAt,
      ended_at: s.endedAt,
      minutes: s.minutes,
      completed: s.completed,
    }));
  if (sessionRows.length) {
    check((await db.from("sessions").insert(sessionRows)).error, "carry over your focus sessions");
  }

  await savePrefs(userId, {
    mode: local.mode,
    reviewSeen: local.reviewSeen,
    timer: local.timer,
  });
}
