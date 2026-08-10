import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Flag, X } from "lucide-react";
import type { Activity, ColoredProject, GoalEntry, Session } from "./types";
import { fmtDuration, fmtShort, shiftKey } from "./helpers";
import { buildReview, fmtWeekRange, reviewNote, startOfWeek } from "./week";
import type { ProjectWeek } from "./week";
import { Kpi } from "./shared";
import { Overlay } from "./Overlay";
import { ProjectIcon } from "./identity";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export interface ReviewProps {
  projects: ColoredProject[];
  projectsById: Record<string, ColoredProject>;
  activities: Activity[];
  sessions: Session[];
  goalEntries: GoalEntry[];
  today: string;
}

/* The Sunday-morning window. It wraps the very same review the tab shows, so
   there is one implementation and the two can never drift apart. */
export function ReviewModal({ onClose, ...props }: ReviewProps & { onClose: () => void }) {
  return (
    <Overlay dirty={false} onClose={onClose} wide>
      {() => (
      <>
        <div className="wp-card-head wp-modal-bar">
          <h3>Your week</h3>
          <button className="wp-icon" onClick={onClose} aria-label="Close the review">
            <X size={16} />
          </button>
        </div>
        <ReviewView {...props} />
        <div className="wp-modal-actions wp-modal-foot">
          <button className="wp-btn wp-btn-solid" onClick={onClose}>
            Done — plot the next one
          </button>
        </div>
      </>
      )}
    </Overlay>
  );
}

export function ReviewView({
  projects,
  projectsById,
  activities,
  sessions,
  goalEntries,
  today,
}: ReviewProps) {
  const [anchor, setAnchor] = useState(() => startOfWeek(today));
  const review = useMemo(
    () => buildReview({ projects, activities, sessions, goalEntries, anchor, today }),
    [projects, activities, sessions, goalEntries, anchor, today]
  );

  const thisWeek = startOfWeek(today);
  const peak = Math.max(1, ...review.days.map((d) => d.planned));

  return (
    <div className="wp-stack">
      <section className="wp-hero">
        <p className="wp-eyebrow wp-mono">Week in review</p>
        <div className="wp-weeknav">
          <button className="wp-icon" onClick={() => setAnchor(shiftKey(anchor, -7))} aria-label="Previous week">
            <ChevronLeft size={16} />
          </button>
          <h2 className="wp-display wp-display-sm">{fmtWeekRange(review.monday)}</h2>
          <button
            className="wp-icon"
            onClick={() => setAnchor(shiftKey(anchor, 7))}
            aria-label="Next week"
            disabled={review.monday >= thisWeek}
          >
            <ChevronRight size={16} />
          </button>
          {review.monday !== thisWeek && (
            <button className="wp-btn wp-weeknow" onClick={() => setAnchor(thisWeek)}>
              This week
            </button>
          )}
        </div>
        <p className="wp-note">{reviewNote(review)}</p>
      </section>

      <div className="wp-kpis">
        <Kpi
          label="Cleared"
          value={`${review.cleared}/${review.planned}`}
          sub={review.planned ? `${Math.round((review.cleared / review.planned) * 100)}% of the week` : "nothing plotted"}
        />
        <Kpi
          label="Waypoints reached"
          value={String(review.waypointsReached)}
          sub="checkpoints passed"
        />
        <Kpi label="Focused" value={fmtDuration(review.minutes)} sub="logged this week" />
        <Kpi label="Clear days" value={String(review.clearDays)} sub="everything done" />
      </div>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>Across the week</h3>
          <span className="wp-mono wp-muted">CLEARED / PLANNED</span>
        </div>
        <div className="wp-bars wp-weekbars">
          {review.days.map((d, i) => (
            <div
              key={d.key}
              className={`wp-barcol${d.key === today ? " is-today" : ""}`}
              title={`${fmtShort(d.key)} — ${d.cleared}/${d.planned}`}
            >
              <div className="wp-bar" style={{ height: `${(d.planned / peak) * 100}%` }}>
                <div
                  className="wp-bar-fill"
                  style={{ height: d.planned ? `${(d.cleared / d.planned) * 100}%` : "0%" }}
                />
              </div>
              <span className="wp-mono wp-barlabel">{WEEKDAYS[i]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>Progress by project</h3>
          <span className="wp-mono wp-muted">{review.projects.filter((p) => p.moved).length} MOVED</span>
        </div>
        {review.projects.length === 0 ? (
          <p className="wp-empty">No projects yet. Create one to start plotting a course.</p>
        ) : (
          <ul className="wp-reviewlist">
            {review.projects.map((p) => (
              <ProjectRow key={p.project.id} p={p} />
            ))}
          </ul>
        )}
      </section>

      <div className="wp-grid-2">
        <section className="wp-card">
          <div className="wp-card-head">
            <h3>What you cleared</h3>
            <span className="wp-mono wp-muted">{review.clearedActivities.length}</span>
          </div>
          {review.clearedActivities.length === 0 ? (
            <p className="wp-empty">Nothing cleared this week.</p>
          ) : (
            <ul className="wp-minilist">
              {review.clearedActivities.map((a) => (
                <li key={a.id} className="wp-upcoming">
                  <span className="wp-mono wp-muted wp-upcoming-date">{fmtShort(a.date)}</span>
                  <span className="wp-dot" style={{ background: projectsById[a.projectId]?.color || "var(--rule)" }} />
                  <span className="wp-upcoming-title">{a.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="wp-card">
          <div className="wp-card-head">
            <h3>Left open</h3>
            <span className="wp-mono wp-muted">{review.openActivities.length}</span>
          </div>
          {review.openActivities.length === 0 ? (
            <p className="wp-empty">Nothing left hanging. The whole week is closed out.</p>
          ) : (
            <ul className="wp-minilist">
              {review.openActivities.map((a) => (
                <li key={a.id} className="wp-upcoming">
                  <span className="wp-mono wp-muted wp-upcoming-date">{fmtShort(a.date)}</span>
                  <span
                    className="wp-dot"
                    style={{
                      border: `1.5px solid ${projectsById[a.projectId]?.color || "var(--rule)"}`,
                    }}
                  />
                  <span className="wp-upcoming-title">{a.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ProjectRow({ p }: { p: ProjectWeek }) {
  const { project } = p;
  return (
    <li className={`wp-reviewrow${p.moved ? "" : " is-still"}`}>
      <div className="wp-reviewrow-head">
        <ProjectIcon icon={project.icon} color={project.color} size={15} />
        <span className="wp-reviewrow-name">{project.name}</span>
        <Pace p={p} />
      </div>

      <p className="wp-mono wp-muted wp-reviewrow-meta">
        {p.cleared}/{p.planned} ACTIVITIES
        {p.minutes > 0 && <> · {fmtDuration(p.minutes).toUpperCase()} FOCUSED</>}
        {p.routeDone !== null && (
          <> · {Math.round(p.routeDone * 100)}% OF ROUTE</>
        )}
        {p.daysToTarget !== null && (
          <> · {p.daysToTarget >= 0 ? `${p.daysToTarget} DAYS LEFT` : `${-p.daysToTarget} DAYS OVER`}</>
        )}
      </p>

      {p.goalMove?.delta && (
        <p className="wp-goalmove">
          <span className="wp-goal-label">{project.goal?.label}</span>
          <span className="wp-mono wp-muted">
            {p.goalMove.from} → {p.goalMove.to}
          </span>
          <span className={`wp-mono wp-delta${p.goalMove.good ? " is-good" : ""}`}>
            {p.goalMove.delta}
          </span>
        </p>
      )}

      {p.waypointsReached.length > 0 && (
        <ul className="wp-reached">
          {p.waypointsReached.map((w) => (
            <li key={w.id}>
              <span className="wp-reached-mark" style={{ background: project.color, color: "var(--tick)" }}>
                <Flag size={10} />
              </span>
              <span>{w.title}</span>
            </li>
          ))}
        </ul>
      )}

      {!p.moved && <p className="wp-empty wp-reviewrow-still">Nothing logged this week.</p>}
    </li>
  );
}

/* Route walked against time spent. Stated plainly — it is a fact about the
   dates, not a verdict on the week. */
function Pace({ p }: { p: ProjectWeek }) {
  if (p.timeGone === null || p.routeDone === null) return null;
  const gap = p.routeDone - p.timeGone;
  const label = gap >= 0.05 ? "AHEAD" : gap <= -0.15 ? "BEHIND PACE" : "ON PACE";
  const tone = gap <= -0.15 ? "is-behind" : gap >= 0.05 ? "is-ahead" : "";
  return (
    <span className={`wp-pace wp-mono ${tone}`} title={`${Math.round(p.routeDone * 100)}% of the route, ${Math.round(p.timeGone * 100)}% of the time`}>
      {label === "AHEAD" && <Check size={11} strokeWidth={3} />}
      {label}
    </span>
  );
}
