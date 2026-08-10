import { useMemo } from "react";
import type { Activity, ColoredProject, Session } from "./types";
import { fmtDuration, fmtShort, shiftKey } from "./helpers";
import { Kpi } from "./shared";
import { ProjectIcon } from "./identity";

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

  const days = Array.from({ length: 14 }, (_, i) => shiftKey(today, i - 13));
  const perDay = days.map((k) => {
    const items = activities.filter((a) => a.date === k);
    return { k, planned: items.length, done: items.filter((a) => a.done).length };
  });
  const peak = Math.max(1, ...perDay.map((d) => d.planned));

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
          <h3>Last fourteen days</h3>
          <span className="wp-mono wp-muted">CLEARED / PLANNED</span>
        </div>
        <div className="wp-bars">
          {perDay.map((d) => (
            <div key={d.k} className="wp-barcol" title={`${fmtShort(d.k)} — ${d.done}/${d.planned}`}>
              <div className="wp-bar" style={{ height: `${(d.planned / peak) * 100}%` }}>
                <div
                  className="wp-bar-fill"
                  style={{ height: d.planned ? `${(d.done / d.planned) * 100}%` : "0%" }}
                />
              </div>
              <span className="wp-mono wp-barlabel">{d.k.slice(-2)}</span>
            </div>
          ))}
        </div>
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
