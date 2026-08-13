import { useEffect, useMemo, useState } from "react";
import type { Activity, ColoredProject, Session } from "./types";
import { fmtDuration, shiftKey } from "./helpers";
import { Kpi } from "./shared";
import { ProjectIcon } from "./identity";
import { buildEffortSeries } from "./effort";
import { EffortChart } from "./EffortChart";
import { Select } from "./Select";
import * as db from "./db";
import type { StravaConnection } from "./db";

/* Off until Strava's API is actually paid for and the migration/env vars are
   in place — see WAYPOINT.md's Phase 3 section. Flip to true to bring the
   card back; the underlying feature is built and was verified before this
   flag was added. */
const STRAVA_ENABLED = false;

/* Connect once, then pick which course a synced run gets filed under.
   Loads its own state rather than threading it through Waypoint's mutate()
   machinery — this is one row, read once, edited rarely, and the OAuth
   round trip happens on a server route this component never touches. */
function StravaCard({ userId, projects }: { userId: string; projects: ColoredProject[] }) {
  const [connection, setConnection] = useState<StravaConnection | null | "loading">("loading");
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    let cancelled = false;
    db.getStravaConnection(userId)
      .then((c) => {
        if (!cancelled) setConnection(c);
      })
      .catch(() => {
        if (!cancelled) setConnection(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <section className="wp-card">
      <div className="wp-card-head">
        <h3>Strava</h3>
      </div>
      {connection === "loading" ? (
        <p className="wp-empty">Checking your connection…</p>
      ) : connection === null ? (
        <div className="wp-stravaconnect">
          <p className="wp-empty">
            Connect Strava to have a finished run show up here already logged.
          </p>
          <a className="wp-btn" href={`/api/strava/connect?state=${encodeURIComponent(userId)}`}>
            Connect Strava
          </a>
        </div>
      ) : (
        <div className="wp-stravaconnect">
          <p className="wp-empty">
            Connected — new runs are logged automatically as they land in Strava.
          </p>
          <label className="wp-stravaproject">
            <span className="wp-mono wp-muted">FILE SYNCED RUNS UNDER</span>
            <Select
              value={connection.syncProjectId ?? ""}
              placeholder="Choose a course"
              disabled={savingProject}
              ariaLabel="Course synced Strava activities are filed under"
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(v) => {
                if (!v) return;
                setSavingProject(true);
                setConnection((c) => (c && c !== "loading" ? { ...c, syncProjectId: v } : c));
                db.setStravaSyncProject(userId, v).finally(() => setSavingProject(false));
              }}
            />
          </label>
        </div>
      )}
    </section>
  );
}

export function StatsView({
  activities,
  projects,
  sessions,
  today,
  userId,
}: {
  activities: Activity[];
  projects: ColoredProject[];
  sessions: Session[];
  today: string;
  userId: string;
}) {
  const focusToday = sessions.filter((s) => s.date === today).reduce((n, s) => n + s.minutes, 0);
  const focusTotal = sessions.reduce((n, s) => n + s.minutes, 0);
  const minutesByProject = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((s) => {
      map[s.projectId] = (map[s.projectId] || 0) + s.minutes;
    });
    return map;
  }, [sessions]);
  const past = activities.filter((a) => a.date <= today);
  const done = past.filter((a) => a.done).length;
  const rate = past.length ? Math.round((done / past.length) * 100) : 0;

  /* One combined number for how much has gone into everything so far — a
     cleared activity, a reached waypoint and a block of focus time each
     convert into the same unit. See effort.ts for the weights and why the
     line never has a ceiling to plot against. Not wrapped in useMemo: the
     walk is bounded by real calendar days since the first thing was ever
     logged, the same order of work as `past`/`done`/`rate` just above,
     which this file has never memoized either. */
  const effort = buildEffortSeries({ activities, projects, sessions, today });
  const effortByProject: Record<string, number> = {};
  projects.forEach((p) => {
    effortByProject[p.id] = buildEffortSeries({
      activities,
      projects,
      sessions,
      today,
      projectId: p.id,
    }).total;
  });

  const streak = useMemo(() => {
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
  }, [activities, today]);

  return (
    <div className="wp-stack">
      {/* Completion and streak lead — the two numbers that answer "am I
          keeping up" at a glance. Effort score used to sit first with the
          longest explanation of the six; it's the most abstract measure
          here, so it moved off the strongest position (first read, best
          recalled) rather than occupying it by accident of code order. */}
      <div className="wp-kpis">
        <Kpi label="Completion rate" value={`${rate}%`} sub={`${done} of ${past.length} cleared`} />
        <Kpi label="Clear streak" value={String(streak)} sub="days with everything cleared" />
        <Kpi label="Cleared activities" value={String(done)} sub="all time" />
        <Kpi
          label="Focused today"
          value={fmtDuration(focusToday)}
          sub={`${fmtDuration(focusTotal)} all time`}
        />
        <Kpi label="Effort score" value={String(effort.total)} sub="a cleared task, a waypoint, a focus block — one running total" />
        <Kpi
          label="Active courses"
          value={String(projects.filter((p) => p.status === "active").length)}
          sub={`${projects.length} total`}
        />
      </div>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>Effort</h3>
          <span className="wp-mono wp-muted">1 CLEARED = 1 · 1 WAYPOINT = 3 · 25 MIN FOCUS = 1</span>
        </div>
        <EffortChart series={effort} />
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>By project</h3>
        </div>
        {projects.length === 0 ? (
          <p className="wp-empty">No projects to measure yet.</p>
        ) : (
          <ul className="wp-statlist">
            {projects.map((p) => {
              const acts = activities.filter((a) => a.projectId === p.id && a.date <= today);
              const d = acts.filter((a) => a.done).length;
              const pc = acts.length ? Math.round((d / acts.length) * 100) : 0;
              const w = p.waypoints.filter((x) => x.done).length;
              return (
                <li key={p.id} className="wp-statrow">
                  <ProjectIcon icon={p.icon} color={p.color} size={15} />
                  <span className="wp-statname">{p.name}</span>
                  <span className="wp-mono wp-muted">
                    {w}/{p.waypoints.length} WP
                  </span>
                  <span className="wp-mono wp-muted wp-stateffort">{effortByProject[p.id] ?? 0} PTS</span>
                  <span className="wp-mono wp-muted wp-stattime">
                    {minutesByProject[p.id] ? fmtDuration(minutesByProject[p.id]).toUpperCase() : "—"}
                  </span>
                  <span className="wp-statbar">
                    <span className="wp-statbar-fill" style={{ width: `${pc}%`, background: p.color }} />
                  </span>
                  <span className="wp-mono wp-statpct">{pc}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {STRAVA_ENABLED && <StravaCard userId={userId} projects={projects} />}
    </div>
  );
}
