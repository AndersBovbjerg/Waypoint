import { useState } from "react";
import { Plus, ArrowUpRight, X, CalendarCheck } from "lucide-react";
import type { Activity, ColoredProject, NewActivity, TimerSettings } from "./types";
import type { TimerApi } from "./useTimer";
import { fmtShort, greeting, courseNote, shiftKey } from "./helpers";
import { ActivityRow, CourseStrip, MiniRoute } from "./shared";
import { TimerCard } from "./TimerCard";

export function TodayView({
  items,
  projects,
  projectsById,
  activities,
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
        <p className="wp-eyebrow wp-mono">Today&rsquo;s course</p>
        <h2 className="wp-display">{greeting()}, Anders.</h2>
        <p className="wp-note">{courseNote(items)}</p>
        <CourseStrip items={items} projectsById={projectsById} />
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

      <TimerCard
        timer={timer}
        settings={timerSettings}
        onSettings={onTimerSettings}
        projects={projects}
        projectsById={projectsById}
        todayItems={items}
      />

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
          <select className="wp-input wp-select" value={pid} onChange={(e) => setPid(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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
                const wDone = p.waypoints.filter((w) => w.done).length;
                return (
                  <li key={p.id}>
                    <button className="wp-minirow" onClick={() => onOpenProject(p.id)}>
                      <span className="wp-swatch" style={{ background: p.color }} />
                      <span className="wp-minirow-name">{p.name}</span>
                      <span className="wp-mono wp-muted">
                        {wDone}/{p.waypoints.length}
                      </span>
                      <ArrowUpRight size={14} className="wp-muted" />
                    </button>
                    <MiniRoute waypoints={p.waypoints} color={p.color} />
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
    </div>
  );
}
