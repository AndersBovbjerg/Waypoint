import { useMemo } from "react";
import type { Activity, ColoredProject, GoalEntry, Session } from "./types";
import { clearStreak, commitmentRate, fmtDuration } from "./helpers";
import { Kpi, Pace } from "./shared";
import { ProjectIcon } from "./identity";
import { buildEffortSeries } from "./effort";
import { EffortChart } from "./EffortChart";
import { buildProjectStandings } from "./week";
import type { ProjectStanding } from "./week";

export function StatsView({
  activities,
  projects,
  sessions,
  goalEntries,
  today,
}: {
  activities: Activity[];
  projects: ColoredProject[];
  sessions: Session[];
  goalEntries: GoalEntry[];
  today: string;
}) {
  const focusToday = sessions.filter((s) => s.date === today).reduce((n, s) => n + s.minutes, 0);
  const focusTotal = sessions.reduce((n, s) => n + s.minutes, 0);
  const past = activities.filter((a) => a.date <= today);
  const done = past.filter((a) => a.done).length;
  /* Replaces the old completion rate, which mixed two populations that
     cannot be compared: a manual activity is logged already done, so it
     always scored, and the figure rose as the log grew regardless of
     whether anything committed to was actually kept. */
  const kept = commitmentRate(activities, today);

  /* One combined number for how much has gone into everything so far — a
     cleared activity, a reached waypoint and a block of focus time each
     convert into the same unit. See effort.ts for the weights and why the
     line never has a ceiling to plot against. Not wrapped in useMemo: the
     walk is bounded by real calendar days since the first thing was ever
     logged, the same order of work as `past`/`done`/`rate` just above,
     which this file has never memoized either. */
  const effort = buildEffortSeries({ activities, projects, sessions, today });

  const streak = useMemo(() => clearStreak(activities, today), [activities, today]);

  /* Same shape of information the weekly review gives per project — pace,
     a goal's movement, waypoints reached — just never window-bound to one
     week. Replaced a denser "By project" list that packed a waypoint count,
     an effort-points figure already visible in the chart above, a focus
     time and a completion percentage into one row; this says less at a
     glance but what it says is the thing actually worth knowing: how far
     from the real target, not how many boxes got ticked. */
  const standings = buildProjectStandings({ projects, activities, sessions, goalEntries, today });

  return (
    <div className="wp-stack">
      {/* Completion and streak lead — the two numbers that answer "am I
          keeping up" at a glance. Active courses was cut: the count is
          already right there to count on the Courses tab, so the tile was
          answering a question nobody needed answered twice. */}
      <div className="wp-kpis">
        <Kpi
          label="Commitments kept"
          value={kept.rate === null ? "—" : `${kept.rate}%`}
          sub={kept.total ? `${kept.kept} of ${kept.total} recurring` : "nothing recurring yet"}
        />
        <Kpi label="Clear streak" value={String(streak)} sub="days with everything cleared" />
        {/* A count, not a rate. Everything logged after the fact belongs
            here, where volume is the honest reading of it. */}
        <Kpi label="Activities logged" value={String(done)} sub={`of ${past.length} on the board`} />
        <Kpi
          label="Focused today"
          value={fmtDuration(focusToday)}
          sub={`${fmtDuration(focusTotal)} all time`}
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
          <h3>Progress by project</h3>
        </div>
        {standings.length === 0 ? (
          <p className="wp-empty">No projects to measure yet.</p>
        ) : (
          <ul className="wp-reviewlist">
            {standings.map((p) => (
              <ProjectStandingRow key={p.project.id} p={p} />
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}

function ProjectStandingRow({ p }: { p: ProjectStanding }) {
  const { project } = p;
  return (
    <li className="wp-reviewrow">
      <div className="wp-reviewrow-head">
        <ProjectIcon icon={project.icon} color={project.color} size={15} />
        <span className="wp-reviewrow-name">{project.name}</span>
        <Pace timeGone={p.timeGone} routeDone={p.routeDone} />
      </div>

      <p className="wp-mono wp-muted wp-reviewrow-meta">
        {p.clearedActivities}/{p.totalActivities} ACTIVITIES
        {p.minutes > 0 && <> · {fmtDuration(p.minutes).toUpperCase()} FOCUSED</>}
        {p.waypointsTotal > 0 && (
          <> · {p.waypointsReached}/{p.waypointsTotal} WAYPOINTS</>
        )}
        {p.daysToTarget !== null && (
          <> · {p.daysToTarget >= 0 ? `${p.daysToTarget} DAYS LEFT` : `${-p.daysToTarget} DAYS OVER`}</>
        )}
      </p>

      {p.goalMove && (
        <p className="wp-goalmove">
          <span className="wp-goal-label">{project.goal?.label}</span>
          <span className="wp-mono wp-muted">
            {p.goalMove.from} → {p.goalMove.to}
          </span>
          {p.goalMove.delta && (
            <span className={`wp-mono wp-delta${p.goalMove.good ? " is-good" : ""}`}>
              {p.goalMove.delta}
            </span>
          )}
        </p>
      )}
    </li>
  );
}
