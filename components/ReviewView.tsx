import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Activity, ColoredProject, GoalEntry, Session } from "./types";
import { fmtDuration, fmtShort, shiftKey } from "./helpers";
import { buildReview, fmtWeekRange, reviewNote, startOfWeek } from "./week";
import { Kpi, Pace } from "./shared";
import { ProjectIcon } from "./identity";
import { describeEstimate, routeEstimate } from "./route";
import { Overlay } from "./Overlay";

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

  /* buildReview has always produced this and the screen has never shown it,
     which is most of why the review reads as a report rather than a
     decision: the half that answers "am I on track" was computed and thrown
     away. Ordered by how far behind its own pace a course is, so the one
     that needs next week is first and named. */
  const standings = useMemo(
    () =>
      review.projects
        .map((pw) => ({
          pw,
          estimate: routeEstimate(pw.project, activities, goalEntries),
          gap: pw.timeGone !== null && pw.routeDone !== null ? pw.timeGone - pw.routeDone : -Infinity,
        }))
        .sort((a, b) => b.gap - a.gap),
    [review.projects, activities, goalEntries]
  );

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
          label="Commitments kept"
          value={
            review.commitments.total
              ? `${review.commitments.kept}/${review.commitments.total}`
              : "—"
          }
          sub={review.commitments.total ? "recurring, due by now" : "nothing recurring this week"}
        />
        <Kpi
          label="Activities logged"
          value={String(review.cleared)}
          sub={`of ${review.planned} on the board`}
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
          <h3>Where you stand</h3>
          <span className="wp-mono wp-muted">{standings.length}</span>
        </div>
        {standings.length === 0 ? (
          <p className="wp-empty">No active courses to stand anywhere.</p>
        ) : (
          <ul className="wp-reviewlist">
            {standings.map(({ pw, estimate }) => (
              <li key={pw.project.id} className={`wp-reviewrow${pw.moved ? "" : " is-still"}`}>
                <div className="wp-reviewrow-head">
                  <ProjectIcon icon={pw.project.icon} color={pw.project.color} size={15} />
                  <span className="wp-reviewrow-name">{pw.project.name}</span>
                  <Pace timeGone={pw.timeGone} routeDone={pw.routeDone} />
                </div>

                {/* The distance, in the unit actually recorded. Absent rather
                    than guessed when the course has too little history to
                    average -- a made-up number here would be worse than
                    silence, because it is the one line meant to be acted on. */}
                {estimate ? (
                  <p className="wp-reviewrow-distance">{describeEstimate(estimate)}</p>
                ) : (
                  <p className="wp-reviewrow-still wp-muted">
                    Not enough of this route walked yet to say how far the next one is.
                  </p>
                )}

                <p className="wp-mono wp-muted wp-reviewrow-meta">
                  {pw.cleared}/{pw.planned} CLEARED
                  {pw.minutes > 0 && <> · {fmtDuration(pw.minutes).toUpperCase()} FOCUSED</>}
                  {pw.waypointsReached.length > 0 && (
                    <> · {pw.waypointsReached.length} WAYPOINT{pw.waypointsReached.length > 1 ? "S" : ""} REACHED</>
                  )}
                  {pw.goalMove?.delta && (
                    <> · {pw.goalMove.delta}</>
                  )}
                </p>
              </li>
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
                  <span className="wp-dot" style={{ background: projectsById[a.projectId]?.color || "var(--edge)" }} />
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
                      border: `1.5px solid ${projectsById[a.projectId]?.color || "var(--edge)"}`,
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
