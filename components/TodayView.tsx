import { useState } from "react";
import { Plus, ArrowUpRight, X, CalendarCheck } from "lucide-react";
import type { Activity, ColoredProject, GoalEntry, NewActivity, TimerSettings } from "./types";
import type { TimerApi } from "./useTimer";
import { fmtLong, fmtShort, greeting, courseNote, shiftKey } from "./helpers";
import { currentValue, goalProgress } from "./goal";
import { ActivityRow, MiniRoute } from "./shared";
import { ProjectIcon } from "./identity";
import { TimerCard } from "./TimerCard";
import { Select } from "./Select";

export function TodayView({
  items,
  projects,
  projectsById,
  activities,
  goalEntries,
  today,
  timer,
  timerSettings,
  onTimerSettings,
  reviewDue,
  onOpenReview,
  onDismissReview,
  onToggle,
  onRemove,
  onAdd,
  onOpenProject,
}: {
  items: Activity[];
  projects: ColoredProject[];
  projectsById: Record<string, ColoredProject>;
  activities: Activity[];
  goalEntries: GoalEntry[];
  today: string;
  timer: TimerApi;
  timerSettings: TimerSettings;
  onTimerSettings: (s: TimerSettings) => void;
  reviewDue: { cleared: number; planned: number; waypoints: number } | null;
  onOpenReview: () => void;
  onDismissReview: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (a: NewActivity) => void;
  onOpenProject: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  /* derived rather than synced in an effect, so the first project is the
     default from the very first render and stays valid if the list changes */
  const [chosen, setPid] = useState("");
  const pid = projects.some((p) => p.id === chosen) ? chosen : projects[0]?.id || "";
  const done = items.filter((i) => i.done).length;

  const submit = () => {
    if (!title.trim() || !pid) return;
    onAdd({ projectId: pid, title: title.trim(), date: today });
    setTitle("");
  };

  const week = Array.from({ length: 7 }, (_, i) => shiftKey(today, i + 1));
  const upcoming = activities
    .filter((a) => week.includes(a.date))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="wp-stack">
      <section className="wp-hero">
        <h2 className="wp-greet">{greeting()}, Anders</h2>
        <p className="wp-note wp-note-sm">
          {fmtLong(today)} · {courseNote(items)}
        </p>
      </section>

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
            {done}/{items.length}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="wp-empty">Nothing here yet. Add the first thing below.</p>
        ) : (
          <ul className="wp-list">
            {items.map((a) => (
              <ActivityRow
                key={a.id}
                a={a}
                project={projectsById[a.projectId]}
                onToggle={onToggle}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}

        <div className="wp-addrow">
          <input
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
                return (
                  <li key={p.id}>
                    <button className="wp-minirow" onClick={() => onOpenProject(p.id)}>
                      <ProjectIcon icon={p.icon} color={p.color} size={15} />
                      <span className="wp-minirow-name">{p.name}</span>
                      <span className="wp-mono wp-muted">
                        {p.goal ? `${Math.round((goalPct ?? 0) * 100)}%` : `${wDone}/${p.waypoints.length}`}
                      </span>
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
              {upcoming.slice(0, 8).map((a) => (
                <li key={a.id} className="wp-upcoming">
                  <span className="wp-mono wp-muted wp-upcoming-date">{fmtShort(a.date)}</span>
                  <span
                    className="wp-dot"
                    style={{ background: projectsById[a.projectId]?.color || "var(--rule)" }}
                  />
                  <span className="wp-upcoming-title">{a.title}</span>
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
      />
    </div>
  );
}
