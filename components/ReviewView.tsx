import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Activity, ColoredProject, GoalEntry, MissReason, RecurringActivity, Session } from "./types";
import { fmtShort, shiftKey } from "./helpers";
import { buildReview, fmtWeekRange, reviewNote, startOfWeek } from "./week";
import {
  MISS_REASONS,
  missedAndAhead,
  momentum,
  patterns,
  reasonLabel,
  targetWeeks,
  weekVerdict,
  type TargetWeek,
} from "./targets";
import { LaneRow } from "./Lane";
import { Overlay } from "./Overlay";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const WEEKDAY_NAMES = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

export interface ReviewProps {
  projects: ColoredProject[];
  projectsById: Record<string, ColoredProject>;
  activities: Activity[];
  sessions: Session[];
  goalEntries: GoalEntry[];
  recurring: RecurringActivity[];
  reasons: Record<string, MissReason>;
  today: string;
  onReason: (activityId: string, reason: MissReason) => void;
  onToggle: (id: string) => void;
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

/* The review answers three things, in order: did the week hit what each
   course was aiming for, where does each course stand against its own
   dates, and what did not happen — with why, and whether the why repeats.
   The tiles of counts that used to open it are gone: they read zero most
   weeks and said nothing about what to do next. */
export function ReviewView({
  projects,
  projectsById,
  activities,
  sessions,
  goalEntries,
  recurring,
  reasons,
  today,
  onReason,
  onToggle,
}: ReviewProps) {
  const [anchor, setAnchor] = useState(() => startOfWeek(today));
  const review = buildReview({ projects, activities, sessions, goalEntries, anchor, today });
  const monday = review.monday;
  const sunday = review.sunday;
  const thisWeek = startOfWeek(today);
  const running = today >= monday && today <= sunday;

  const weeks = targetWeeks({ projects, recurring, activities, monday, today });
  const implied = weeks.filter((w) => w.implied).map((w) => w.project.name);
  const withoutTarget = projects.filter(
    (p) => p.status === "active" && !weeks.some((w) => w.project.id === p.id)
  );
  const pulse = momentum(activities, monday, today);
  const { missed, ahead } = missedAndAhead(activities, monday, today);
  /* the eight weeks up to the end of the week on screen, never past today */
  const upTo = shiftKey(sunday, 1) < today ? shiftKey(sunday, 1) : today;
  const pattern = patterns(activities, reasons, upTo, 8);

  /* Most behind its own pace first, so the course that needs next week is
     the one read first. */
  const standings = review.projects
    .filter((pw) => pw.project.status === "active")
    .map((pw) => ({
      pw,
      gap: pw.timeGone !== null && pw.routeDone !== null ? pw.timeGone - pw.routeDone : -Infinity,
    }))
    .sort((a, b) => b.gap - a.gap);

  return (
    <div className="wp-stack">
      <section className="wp-hero">
        <p className="wp-eyebrow wp-mono">Week in review</p>
        <div className="wp-weeknav">
          <button className="wp-icon" onClick={() => setAnchor(shiftKey(anchor, -7))} aria-label="Previous week">
            <ChevronLeft size={16} />
          </button>
          <h2 className="wp-display wp-display-sm">{fmtWeekRange(monday)}</h2>
          <button
            className="wp-icon"
            onClick={() => setAnchor(shiftKey(anchor, 7))}
            aria-label="Next week"
            disabled={monday >= thisWeek}
          >
            <ChevronRight size={16} />
          </button>
          {monday !== thisWeek && (
            <button className="wp-btn wp-weeknow" onClick={() => setAnchor(thisWeek)}>
              This week
            </button>
          )}
        </div>
        <p className="wp-note">{weekVerdict(weeks, running) ?? reviewNote(review)}</p>
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>{running ? "This week" : "The week"}</h3>
          <span className="wp-mono wp-muted">TARGETS</span>
        </div>
        {weeks.length === 0 ? (
          <p className="wp-empty">
            Give a course a weekly target — how many activities a week it aims for — and you&rsquo;ll
            see it fill up here. Set one when you edit a course.
          </p>
        ) : (
          <ul className="wp-targetlist">
            {weeks.map((w) => (
              <TargetRow key={w.project.id} w={w} running={running} />
            ))}
          </ul>
        )}
        <p className="wp-momentum">{momentumLine(pulse)}</p>
        {implied.length > 0 && (
          <p className="wp-card-foot">
            {implied.length === 1
              ? `${implied[0]} takes its target from the days its recurring activity runs on.`
              : `${namesOf(implied)} take their targets from the days their recurring activities run on.`}
          </p>
        )}
        {weeks.length > 0 && withoutTarget.length > 0 && (
          <p className="wp-card-foot">
            No weekly target yet: {namesOf(withoutTarget.map((p) => p.name))}. Set one when you edit a course.
          </p>
        )}
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>Where you stand</h3>
        </div>
        {standings.length === 0 ? (
          <p className="wp-empty">No active courses to stand anywhere.</p>
        ) : (
          <>
            <ul className="wp-lanelist">
              {standings.map(({ pw }) => (
                <LaneRow
                  key={pw.project.id}
                  project={pw.project}
                  timeGone={pw.timeGone}
                  routeDone={pw.routeDone}
                  daysToTarget={pw.daysToTarget}
                  activities={activities}
                  goalEntries={goalEntries}
                  today={today}
                />
              ))}
            </ul>
            <p className="wp-lane-key wp-mono wp-muted">
              <span className="wp-lane-keytick" aria-hidden="true" /> WHERE AN EVEN PACE WOULD HAVE YOU TODAY
            </p>
          </>
        )}
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>Missed activities</h3>
          <span className="wp-mono wp-muted">{missed.length}</span>
        </div>
        {missed.length === 0 ? (
          <p className="wp-empty">
            {running ? "Nothing missed so far this week." : "Nothing missed. Every plan in the week was kept."}
          </p>
        ) : (
          <ul className="wp-misslist">
            {missed.map((a) => (
              <MissedRow
                key={a.id}
                a={a}
                color={projectsById[a.projectId]?.color || "var(--edge)"}
                reason={reasons[a.id]}
                onReason={onReason}
                onToggle={onToggle}
              />
            ))}
          </ul>
        )}

        {running && ahead.length > 0 && (
          <>
            <p className="wp-eyebrow wp-misslist-sub">Still ahead</p>
            <ul className="wp-misslist">
              {ahead.map((a) => (
                <li key={a.id} className="wp-missrow">
                  <div className="wp-missrow-main">
                    <span
                      className="wp-missring"
                      style={{ borderColor: projectsById[a.projectId]?.color || "var(--edge)" }}
                    />
                    <span className="wp-mono wp-muted wp-missrow-date">
                      {a.date === today ? "TODAY" : fmtShort(a.date).toUpperCase()}
                    </span>
                    <span className="wp-missrow-title">{a.title}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <PatternsCard pattern={pattern} />

      <details className="wp-card wp-cleared">
        <summary>
          <h3>What you cleared</h3>
          <span className="wp-mono wp-muted">{review.clearedActivities.length}</span>
          <ChevronRight size={16} className="wp-cleared-chev" aria-hidden="true" />
        </summary>
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
      </details>
    </div>
  );
}

function TargetRow({ w, running }: { w: TargetWeek; running: boolean }) {
  const left = Math.max(0, w.target - w.done);
  let status: string;
  if (w.hit) status = "Target hit";
  else if (running) status = `${left} to go, ${w.daysLeft} day${w.daysLeft === 1 ? "" : "s"} left`;
  else status = `${left} short of ${w.target}`;
  const warn = !w.hit && (!running || w.behind);

  return (
    <li className="wp-targetrow">
      <span className="wp-swatch" style={{ background: w.project.color }} />
      <div className="wp-targetrow-text">
        <span className="wp-targetrow-name">{w.project.name}</span>
        <span className={`wp-targetrow-sub${warn ? " is-warn" : ""}`}>
          {status}
          {w.streak >= 2 && ` · ${w.streak} weeks in a row`}
        </span>
      </div>
      {w.target <= 7 ? (
        <span className="wp-pips" role="img" aria-label={`${w.done} of ${w.target}`}>
          {Array.from({ length: w.target }, (_, i) => (
            <span
              key={i}
              className="wp-pip"
              style={{ borderColor: w.project.color, background: i < w.done ? w.project.color : "transparent" }}
            />
          ))}
        </span>
      ) : (
        <span className="wp-mono wp-muted">
          {w.done}/{w.target}
        </span>
      )}
    </li>
  );
}

/* A missed activity and the one question about it. Once answered, the
   answer sits on the row and can be changed; "Did it anyway" ticks it, which
   takes it off this list altogether. */
function MissedRow({
  a,
  color,
  reason,
  onReason,
  onToggle,
}: {
  a: Activity;
  color: string;
  reason: MissReason | undefined;
  onReason: (activityId: string, reason: MissReason) => void;
  onToggle: (id: string) => void;
}) {
  const [asking, setAsking] = useState(false);
  return (
    <li className="wp-missrow">
      <div className="wp-missrow-main">
        <span className="wp-missring" style={{ borderColor: color }} />
        <span className="wp-mono wp-muted wp-missrow-date">{fmtShort(a.date).toUpperCase()}</span>
        <span className="wp-missrow-title">{a.title}</span>
        <button
          className={`wp-reasontag${reason ? " is-set" : ""}`}
          onClick={() => setAsking((v) => !v)}
          aria-expanded={asking}
          aria-label={reason ? `Reason: ${reasonLabel(reason)}. Change it` : `Why was ${a.title} missed?`}
        >
          {reason ? reasonLabel(reason) : "Why?"}
        </button>
      </div>
      {asking && (
        <div className="wp-reasonchips wp-missrow-chips">
          {MISS_REASONS.map((r) => (
            <button
              key={r.value}
              className={`wp-reasonchip${reason === r.value ? " is-on" : ""}`}
              aria-pressed={reason === r.value}
              onClick={() => {
                onReason(a.id, r.value);
                setAsking(false);
              }}
            >
              {r.label}
            </button>
          ))}
          <button className="wp-reasonchip is-didit" onClick={() => onToggle(a.id)}>
            <Check size={14} strokeWidth={2.75} /> Did it anyway
          </button>
        </div>
      )}
    </li>
  );
}

function PatternsCard({ pattern }: { pattern: ReturnType<typeof patterns> }) {
  const enough = pattern.planned >= 5;
  const top = pattern.reasons[0];
  const maxReason = top?.count ?? 0;

  let insight: string;
  if (!enough) {
    insight = "Patterns need a few weeks of recurring activities before they can say anything.";
  } else {
    const bits: string[] = [];
    if (pattern.worstDay !== null) bits.push(`${WEEKDAY_NAMES[pattern.worstDay]} slip most.`);
    else bits.push("No weekday stands out. Misses are spread across the week.");
    if (top) bits.push(`The reason you give most: ${reasonLabel(top.reason).toLowerCase()}.`);
    insight = bits.join(" ");
  }

  return (
    <section className="wp-card">
      <div className="wp-card-head">
        <h3>Patterns</h3>
        <span className="wp-mono wp-muted">LAST 8 WEEKS</span>
      </div>
      <p className="wp-patterns-insight">{insight}</p>

      {enough && (
        <>
          <p className="wp-mono wp-muted wp-patterns-label">RECURRING ACTIVITIES KEPT, BY WEEKDAY</p>
          <div className="wp-daybars">
            {pattern.days.map((d, i) => {
              const rate = d.total ? d.kept / d.total : 0;
              return (
                <div
                  key={i}
                  className="wp-daybar"
                  title={d.total ? `${d.kept} of ${d.total} kept` : "Nothing planned"}
                >
                  <div className="wp-daybar-track">
                    <div
                      className={`wp-daybar-fill${i === pattern.worstDay ? " is-worst" : ""}${d.total ? "" : " is-empty"}`}
                      style={{ height: d.total ? `${Math.max(4, rate * 100)}%` : "4%" }}
                    />
                  </div>
                  <span className="wp-mono wp-daybar-label">{WEEKDAYS[i]}</span>
                  <span className="wp-mono wp-muted wp-daybar-count">{d.total ? `${d.kept}/${d.total}` : "–"}</span>
                </div>
              );
            })}
          </div>

          <p className="wp-mono wp-muted wp-patterns-label">WHY YOU MISSED</p>
          {pattern.reasons.length === 0 ? (
            <p className="wp-empty">
              No reasons yet. Answer &ldquo;Why?&rdquo; on a missed activity and they&rsquo;ll gather here.
            </p>
          ) : (
            <ul className="wp-reasonbars">
              {pattern.reasons.map((r) => (
                <li key={r.reason}>
                  <span className="wp-reasonbars-label">{reasonLabel(r.reason)}</span>
                  <span className="wp-reasonbars-track">
                    <span style={{ width: `${(r.count / maxReason) * 100}%` }} />
                  </span>
                  <span className="wp-mono wp-muted">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function momentumLine(m: { count: number; usual: number | null; inProgress: boolean }): string {
  const n = `${m.count} ${m.count === 1 ? "activity" : "activities"}`;
  if (m.inProgress) {
    return m.usual === null ? `${n} logged so far.` : `${n} logged so far. Your usual week is ${m.usual}.`;
  }
  if (m.usual === null) return `${n} logged.`;
  const diff = m.count - m.usual;
  if (diff === 0) return `${n} logged, right on your usual week.`;
  return `${n} logged, ${Math.abs(diff)} ${diff > 0 ? "more" : "fewer"} than your usual week.`;
}

const namesOf = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
