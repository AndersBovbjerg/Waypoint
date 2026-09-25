import { useEffect, useRef, useState } from "react";
import { Plus, ArrowUpRight, X, CalendarCheck, Undo2, Check, Flag } from "lucide-react";
import type {
  Activity,
  ColoredProject,
  GoalEntry,
  NewActivity,
  WaypointItem,
  TimerSettings,
  UnfiledSession,
} from "./types";
import type { TimerApi } from "./useTimer";
import { fmtDay, fmtLong, fmtShort, fmtWeekday, greeting, courseNote, shiftKey, keyOf } from "./helpers";
import { currentValue, goalProgress } from "./goal";
import { ActivityRow, MiniRoute } from "./shared";
import { ProjectIcon } from "./identity";
import { TimerCard } from "./TimerCard";
import { Select } from "./Select";
import { localStore } from "./store";
import type { TargetWeek } from "./targets";

/* Long enough to notice the row change and reach for it, short enough that
   the list is not left lying about what it contains. */
const UNDO_MS = 5000;

export function TodayView({
  items,
  name,
  projects,
  projectsById,
  activities,
  goalEntries,
  today,
  timer,
  timerSettings,
  onTimerSettings,
  unfiled,
  onFileSession,
  onDropSession,
  reviewDue,
  onOpenReview,
  onDismissReview,
  onToggle,
  onToggleWaypoint,
  onRemove,
  onAdd,
  onOpenProject,
  targets,
  nudge,
}: {
  items: Activity[];
  /* empty until setup has been through, and the greeting simply drops the
     comma rather than guessing at one */
  name: string;
  projects: ColoredProject[];
  projectsById: Record<string, ColoredProject>;
  activities: Activity[];
  goalEntries: GoalEntry[];
  today: string;
  timer: TimerApi;
  timerSettings: TimerSettings;
  onTimerSettings: (s: TimerSettings) => void;
  unfiled: UnfiledSession[];
  onFileSession: (u: UnfiledSession, projectId: string, activityId: string | null) => void;
  onDropSession: (id: string) => void;
  reviewDue: { cleared: number; planned: number; waypoints: number } | null;
  onOpenReview: () => void;
  onDismissReview: () => void;
  onToggle: (id: string) => void;
  onToggleWaypoint: (pid: string, wid: string) => void;
  onRemove: (id: string) => void;
  onAdd: (a: NewActivity) => void;
  onOpenProject: (id: string) => void;
  /* this week's count against each course's weekly target */
  targets: TargetWeek[];
  /* the one card that pulls you by the arm, when there is one today */
  nudge: React.ReactNode;
}) {
  const [title, setTitle] = useState("");
  /* derived rather than synced in an effect, so the stored course is the
     default from the very first render and stays valid if the list changes.
     Seeding from localStorage is safe here because this view never renders
     on the server — Waypoint holds the boot screen until its load effect
     has run, so there is no markup to mismatch. */
  const [chosen, setPid] = useState<string>(() => localStore.loadLastCourse() ?? "");
  const pid = projects.some((p) => p.id === chosen) ? chosen : projects[0]?.id || "";

  /* ---------- the add row, collapsed until asked for ----------
     Both the one-line button and the full row are always rendered; which of
     them is visible at a given width is a media query's job, not React's.
     Deciding it in JS would mean reading the viewport during render, which
     is the reliable way to get a hydration mismatch. Here the phone shows
     the button until `adding`, the desktop never shows it at all, and the
     row is hidden only where the button replaced it. */
  const [adding, setAdding] = useState(false);
  const addField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (adding) addField.current?.focus();
  }, [adding]);

  /* ---------- delete, with five seconds to change your mind ----------
     The row is taken off the list immediately and the database is only told
     once the window closes, so undo costs nothing and needs no second write.
     Leaving the screen commits whatever is still waiting: a deletion you
     walked away from is a deletion you meant. */
  const [pending, setPending] = useState<string[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const removeRef = useRef(onRemove);
  useEffect(() => {
    removeRef.current = onRemove;
  });
  useEffect(
    () => () => {
      timers.current.forEach((t, id) => {
        clearTimeout(t);
        removeRef.current(id);
      });
      timers.current.clear();
    },
    []
  );

  const requestRemove = (id: string) => {
    setPending((p) => [...p, id]);
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        setPending((p) => p.filter((x) => x !== id));
        removeRef.current(id);
      }, UNDO_MS)
    );
  };

  const undoRemove = (id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setPending((p) => p.filter((x) => x !== id));
  };

  /* Waypoints that belong to today: the ones due today, and any earlier
     one still not reached — a checkpoint that slipped does not stop being
     today's business. One reached today stays on the list after its tick,
     so the row does not vanish from under the thumb that ticked it. */
  const dueWaypoints = projects
    .flatMap((p) => p.waypoints.map((w) => ({ w, project: p })))
    .filter(
      ({ w }) =>
        w.due === today ||
        (w.due !== "" && w.due < today && (!w.done || (w.doneAt != null && keyOf(new Date(w.doneAt)) === today)))
    )
    .sort((a, b) => (a.w.due < b.w.due ? -1 : a.w.due > b.w.due ? 1 : 0));

  /* A row on its way out should not still be counted in "2/5". */
  const live = items.filter((i) => !pending.includes(i.id));
  const done = live.filter((i) => i.done).length + dueWaypoints.filter(({ w }) => w.done).length;
  const total = live.length + dueWaypoints.length;

  const submit = () => {
    if (!title.trim() || !pid) return;
    onAdd({ projectId: pid, title: title.trim(), date: today });
    localStore.saveLastCourse(pid);
    setTitle("");
  };

  const week = Array.from({ length: 7 }, (_, i) => shiftKey(today, i + 1));
  const upcoming = activities
    .filter((a) => week.includes(a.date))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  /* A recurring rule arrives here as one row per day, so "Læs 25 min" on
     five weekdays filled the whole card with five identical lines — five
     facts the reader already had. Consecutive days carrying the same title
     on the same course collapse into one row, which has room to say the one
     thing the five did not: that it runs Mon–Fri. Only *consecutive* days
     merge, so a genuine gap still reads as a gap. */
  const upcomingGroups = upcoming.reduce<
    { id: string; title: string; projectId: string; from: string; to: string; count: number }[]
  >((acc, a) => {
    const last = acc[acc.length - 1];
    if (last && last.title === a.title && last.projectId === a.projectId && shiftKey(last.to, 1) === a.date) {
      last.to = a.date;
      last.count += 1;
      return acc;
    }
    acc.push({ id: a.id, title: a.title, projectId: a.projectId, from: a.date, to: a.date, count: 1 });
    return acc;
  }, []);

  return (
    <div className="wp-stack">
      <section className="wp-hero">
        <h2 className="wp-greet">{name ? `${greeting()}, ${name}` : greeting()}</h2>
        <p className="wp-note wp-note-sm">
          {fmtLong(today)} · {courseNote([...dueWaypoints.map(({ w }) => w), ...items])}
        </p>
      </section>

      {nudge}

      {reviewDue && (
        <section className="wp-card wp-reviewprompt">
          <div className="wp-card-head">
            <h3>The week is done</h3>
            <button className="wp-icon" onClick={onDismissReview} aria-label="Dismiss the weekly review">
              <X size={16} />
            </button>
          </div>
          <p className="wp-note wp-note-sm">
            {reviewDue.cleared} of {reviewDue.planned} cleared
            {reviewDue.waypoints > 0 &&
              `, ${reviewDue.waypoints} waypoint${reviewDue.waypoints === 1 ? "" : "s"} reached`}
            . Take five minutes and look back before plotting the next one.
          </p>
          <button className="wp-btn wp-btn-solid" onClick={onOpenReview}>
            <CalendarCheck size={15} /> Open the review
          </button>
        </section>
      )}

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>To do today</h3>
          <span className="wp-mono wp-muted">
            {done}/{total}
          </span>
        </div>

        {dueWaypoints.length > 0 && (
          <ul className={`wp-list${items.length ? " wp-duelist" : ""}`}>
            {dueWaypoints.map(({ w, project }) => (
              <WaypointRow
                key={w.id}
                w={w}
                project={project}
                today={today}
                onToggle={() => onToggleWaypoint(project.id, w.id)}
              />
            ))}
          </ul>
        )}

        {items.length === 0 ? (
          /* Deliberately nothing. The hero two cards up already says
             "Nothing plotted for today. Add one thing, or take the day off."
             — kinder and more specific than this line ever was. Once the add
             row collapsed, the sentence was also pointing at a control that
             is no longer below it, and a third voice repeating the other two
             was the noise this card was accused of. */
          null
        ) : (
          <ul className="wp-list">
            {items.map((a) =>
              pending.includes(a.id) ? (
                /* role="status" because the row changing under your thumb is
                   the only notice this action gives; without it a screen
                   reader hears the item vanish and never hears that there is
                   five seconds to take it back. Polite, so it waits its turn. */
                <li className="wp-row wp-row-undo" key={a.id} role="status">
                  <span className="wp-row-title wp-muted">Deleted &ldquo;{a.title}&rdquo;</span>
                  <button className="wp-undo" onClick={() => undoRemove(a.id)}>
                    <Undo2 size={14} /> Undo
                  </button>
                </li>
              ) : (
                <ActivityRow
                  key={a.id}
                  a={a}
                  project={projectsById[a.projectId]}
                  onToggle={onToggle}
                  onRemove={requestRemove}
                />
              )
            )}
          </ul>
        )}

        {!adding && (
          <button className="wp-addbtn" onClick={() => setAdding(true)} disabled={!projects.length}>
            <Plus size={16} /> Add an activity
          </button>
        )}

        <div className={`wp-addrow${adding ? "" : " is-collapsed"}`}>
          <input
            ref={addField}
            className="wp-input"
            placeholder="Add an activity for today"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Select
            className="wp-select"
            value={pid}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            onChange={setPid}
            ariaLabel="Project"
          />
          <button className="wp-btn wp-btn-solid" onClick={submit} disabled={!projects.length}>
            <Plus size={15} /> Add
          </button>
        </div>
        {!projects.length && <p className="wp-empty">Create a project first — every activity belongs to one.</p>}
      </section>

      <div className="wp-grid-2">
        <section className="wp-card">
          <div className="wp-card-head">
            <h3>Active courses</h3>
            <span className="wp-mono wp-muted">{projects.length}</span>
          </div>
          {projects.length === 0 ? (
            <p className="wp-empty">No active projects.</p>
          ) : (
            <ul className="wp-minilist">
              {projects.map((p) => {
                /* A goal is a more honest answer to "how far along is
                   this" than a waypoint count — it says how far from the
                   actual target, not just how many checkpoints were ticked.
                   Projects without one (not every course has a number to
                   chase) keep the waypoint reading rather than showing
                   nothing. */
                const goalPct = p.goal
                  ? goalProgress(p.goal, currentValue(p.goal, goalEntries.filter((e) => e.projectId === p.id)))
                  : null;
                const wDone = p.waypoints.filter((w) => w.done).length;
                /* A course with a weekly target answers "am I keeping up"
                   with this week's count rather than its whole-route one —
                   the bar below still draws the route. */
                const week = targets.find((t) => t.project.id === p.id);
                return (
                  <li key={p.id}>
                    <button className="wp-minirow" onClick={() => onOpenProject(p.id)}>
                      <ProjectIcon icon={p.icon} color={p.color} size={15} />
                      <span className="wp-minirow-name">{p.name}</span>
                      {week ? (
                        <span
                          className={`wp-mono ${week.behind ? "wp-drifttext" : "wp-muted"}`}
                          title={`${week.done} of ${week.target} this week`}
                        >
                          {week.done}/{week.target} THIS WEEK
                        </span>
                      ) : (
                        <span className="wp-mono wp-muted">
                          {p.goal ? `${Math.round((goalPct ?? 0) * 100)}%` : `${wDone}/${p.waypoints.length}`}
                        </span>
                      )}
                      <ArrowUpRight size={14} className="wp-muted" />
                    </button>
                    {p.goal ? (
                      <div className="wp-goal-track">
                        <div
                          className="wp-goal-fill"
                          style={{ width: `${(goalPct ?? 0) * 100}%`, background: p.color }}
                        />
                      </div>
                    ) : (
                      <MiniRoute waypoints={p.waypoints} color={p.color} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="wp-card">
          <div className="wp-card-head">
            <h3>Next seven days</h3>
            <span className="wp-mono wp-muted">{upcoming.length}</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="wp-empty">Nothing plotted for the coming week.</p>
          ) : (
            <ul className="wp-minilist">
              {upcomingGroups.slice(0, 8).map((g) => (
                <li key={g.id} className="wp-upcoming">
                  <span className="wp-mono wp-muted wp-upcoming-date">
                    {g.count === 1 ? fmtShort(g.from) : `${fmtDay(g.from)}–${fmtShort(g.to)}`}
                  </span>
                  <span
                    className="wp-dot"
                    style={{ background: projectsById[g.projectId]?.color || "var(--line)" }}
                  />
                  <span className="wp-upcoming-title">{g.title}</span>
                  {g.count > 1 && (
                    <span className="wp-mono wp-muted wp-upcoming-span">
                      {fmtWeekday(g.from)}&ndash;{fmtWeekday(g.to)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <TimerCard
        timer={timer}
        settings={timerSettings}
        onSettings={onTimerSettings}
        projects={projects}
        projectsById={projectsById}
        todayItems={items}
        unfiled={unfiled}
        onFile={onFileSession}
        onDrop={onDropSession}
      />
    </div>
  );
}

/* A waypoint on Today reads like an activity row but is not one: the ring
   carries a flag until it is reached, the right-hand side says when it was
   due instead of offering a bin — a checkpoint is deleted from its course,
   not from the day. */
function WaypointRow({
  w,
  project,
  today,
  onToggle,
}: {
  w: WaypointItem;
  project: ColoredProject;
  today: string;
  onToggle: () => void;
}) {
  const [ticking, setTicking] = useState(false);
  const late = w.due < today;
  return (
    <li
      className={`wp-row wp-wprow${w.done ? " is-done" : ""}`}
      style={{ "--course": project.color } as React.CSSProperties}
    >
      <button
        className={`wp-check${ticking ? " is-ticking" : ""}`}
        style={{ borderColor: project.color, background: w.done ? project.color : "transparent", color: "var(--tick)" }}
        onClick={() => {
          setTicking(!w.done);
          onToggle();
        }}
        onAnimationEnd={() => setTicking(false)}
        aria-pressed={w.done}
        aria-label={w.done ? `Mark waypoint ${w.title} as not reached` : `Mark waypoint ${w.title} as reached`}
      >
        {w.done ? (
          <Check size={13} strokeWidth={3} color="currentColor" />
        ) : (
          <Flag size={10} strokeWidth={2.75} color={project.color} aria-hidden="true" />
        )}
      </button>
      <span className="wp-row-title">
        {w.title}
        <span className="wp-row-course">
          {" · "}
          {project.name}
        </span>
      </span>
      <span className="wp-tag">{project.name}</span>
      <span className={`wp-mono wp-wprow-when${late && !w.done ? " wp-drifttext" : " wp-muted"}`}>
        {w.done ? "REACHED" : late ? `DUE ${fmtShort(w.due).toUpperCase()}` : "WAYPOINT"}
      </span>
    </li>
  );
}
