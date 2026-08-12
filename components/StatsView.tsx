import { useMemo } from "react";
import type { Activity, ColoredProject, Session } from "./types";
import { fmtDuration, shiftKey } from "./helpers";
import { Kpi } from "./shared";
import { ProjectIcon } from "./identity";
import { buildEffortSeries } from "./effort";
import { EffortChart } from "./EffortChart";

export function StatsView({
  activities,
  projects,
  sessions,
  today,
}: {
  activities: Activity[];
  projects: ColoredProject[];
  sessions: Session[];
  today: string;
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
      <div className="wp-kpis">
        <Kpi label="Effort score" value={String(effort.total)} sub="a cleared task, a waypoint, a focus block — one running total" />
        <Kpi label="Completion rate" value={`${rate}%`} sub={`${done} of ${past.length} cleared`} />
        <Kpi label="Cleared activities" value={String(done)} sub="all time" />
        <Kpi label="Clear streak" value={String(streak)} sub="days with everything cleared" />
        <Kpi
          label="Focused today"
          value={fmtDuration(focusToday)}
          sub={`${fmtDuration(focusTotal)} all time`}
        />
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
    </div>
  );
}
