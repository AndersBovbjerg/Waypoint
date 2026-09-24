import { Check, Plus, X } from "lucide-react";
import type { MissReason } from "./types";
import type { Nudge } from "./nudge";
import { purposeQuote } from "./nudge";
import { MISS_REASONS } from "./targets";

/* The card that pulls you by the arm. It quotes back the reason you gave
   for the course when you set it — your words, not the app's — and asks
   one thing: what got in the way, or whether you will put one in now.
   Every answer closes it for the day; see pickNudge for when it appears. */
export function NudgeCard({
  nudge,
  onReason,
  onDidIt,
  onLog,
  onClose,
}: {
  nudge: Nudge;
  onReason: (activityId: string, reason: MissReason) => void;
  /* ticks an activity: yesterday's missed one, or today's on the list */
  onDidIt: (activityId: string) => void;
  onLog: (projectId: string) => void;
  onClose: () => void;
}) {
  const project = nudge.kind === "missed" ? nudge.project : nudge.week.project;
  const quote = purposeQuote(project.purpose);

  let line: string;
  if (nudge.kind === "missed") {
    line = `${nudge.activity.title} didn't happen yesterday.`;
  } else {
    const { done, target, daysLeft } = nudge.week;
    line = `${done} of ${target} this week, with ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`;
  }

  return (
    <section
      className="wp-card wp-nudge"
      style={{ "--course": project.color } as React.CSSProperties}
      aria-label="A nudge about one of your courses"
    >
      <div className="wp-nudge-head">
        <span className="wp-swatch" style={{ background: project.color }} />
        <span className="wp-eyebrow wp-nudge-course">{project.name}</span>
        <button className="wp-icon" onClick={onClose} aria-label="Not now">
          <X size={16} />
        </button>
      </div>

      <p className="wp-nudge-title">
        Hey mester. <span className="wp-nudge-line">{line}</span>
      </p>

      {quote && (
        <figure className="wp-nudge-quote">
          <blockquote>&ldquo;{quote}&rdquo;</blockquote>
          <figcaption className="wp-mono">YOU, WHEN YOU SET THIS COURSE</figcaption>
        </figure>
      )}

      {nudge.kind === "missed" ? (
        <>
          <p className="wp-nudge-ask">{quote ? "Still true? What got in the way?" : "What got in the way?"}</p>
          <div className="wp-reasonchips">
            {MISS_REASONS.map((r) => (
              <button
                key={r.value}
                className="wp-reasonchip"
                onClick={() => onReason(nudge.activity.id, r.value)}
              >
                {r.label}
              </button>
            ))}
            <button className="wp-reasonchip is-didit" onClick={() => onDidIt(nudge.activity.id)}>
              <Check size={14} strokeWidth={2.75} /> Did it anyway
            </button>
          </div>
        </>
      ) : (
        <>
          {quote && <p className="wp-nudge-ask">Still true?</p>}
          {nudge.todayItem && (
            <p className="wp-nudge-today">{nudge.todayItem.title} is on today&rsquo;s list.</p>
          )}
          <div className="wp-nudge-actions">
            {nudge.todayItem ? (
              <button className="wp-btn wp-btn-solid" onClick={() => onDidIt(nudge.todayItem!.id)}>
                <Check size={15} strokeWidth={2.75} /> Tick it off
              </button>
            ) : (
              <button className="wp-btn wp-btn-solid" onClick={() => onLog(project.id)}>
                <Plus size={15} /> Log one now
              </button>
            )}
            <button className="wp-btn wp-btn-ghost" onClick={onClose}>
              Not now
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* What is left of the card once it has been answered: one line saying where
   the answer went, and a way to put it away. */
export function NudgeAck({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <section className="wp-card wp-nudge wp-nudge-ack" role="status">
      <p className="wp-nudge-acktext">{text}</p>
      <button className="wp-icon" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </section>
  );
}
