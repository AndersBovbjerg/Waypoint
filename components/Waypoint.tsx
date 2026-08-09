"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react";
import type {
  AppData,
  Activity,
  ColoredProject,
  NewActivity,
  Project,
  ProjectStatus,
  Session,
  TimerSettings,
} from "./types";
import { PALETTES, fmtLong, shiftKey, uid } from "./helpers";
import { DEFAULT_TIMER, localStore, normalise, seed } from "./store";
import { useToday, useMinuteTick } from "./useToday";
import { useTimer } from "./useTimer";
import { TimerBadge } from "./TimerCard";
import { buildReview, isSunday, startOfWeek } from "./week";
import { canNotify, notify } from "./notify";
import { ReviewModal, ReviewView } from "./ReviewView";
import { TodayView } from "./TodayView";
import { ProjectsView } from "./ProjectsView";
import { ProjectDetail } from "./ProjectDetail";
import { CalendarView } from "./CalendarView";
import { StatsView } from "./StatsView";
import { ProjectModal } from "./ProjectModal";
import { ImportModal } from "./ImportModal";

type View = "today" | "projects" | "calendar" | "review" | "stats";

/* The hour on a Sunday when the review stops waiting and opens itself. */
const REVIEW_HOUR = 9;

/* =============================== APP =============================== */
export default function Waypoint() {
  const [data, setData] = useState<AppData>({
    mode: "light",
    projects: [],
    activities: [],
    sessions: [],
    timer: DEFAULT_TIMER,
    reviewSeen: null,
  });
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("today");
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  /* recomputed at midnight, not once per mount — this window stays open */
  const today = useToday();
  const tick = useMinuteTick();

  useEffect(() => {
    let alive = true;
    localStore.load().then((saved) => {
      if (!alive) return;
      setData(saved && Array.isArray(saved.projects) ? normalise(saved) : seed());
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ready) void localStore.save(data);
  }, [data, ready]);

  const mode = data.mode === "dark" ? "dark" : "light";
  const palette = PALETTES[mode];
  const update = (fn: (d: AppData) => AppData) => setData((d) => fn(d));

  /* ---------- mutations ---------- */
  const saveProject = (p: Project) =>
    update((d) => ({
      ...d,
      projects: d.projects.some((x) => x.id === p.id)
        ? d.projects.map((x) => (x.id === p.id ? p : x))
        : [...d.projects, p],
    }));

  const removeProject = (id: string) =>
    update((d) => ({
      ...d,
      projects: d.projects.filter((p) => p.id !== id),
      activities: d.activities.filter((a) => a.projectId !== id),
    }));

  const setStatus = (id: string, status: ProjectStatus) =>
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, status } : p)) }));

  const toggleWaypoint = (pid: string, wid: string) =>
    update((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id !== pid
          ? p
          : {
              ...p,
              waypoints: p.waypoints.map((w) =>
                w.id === wid
                  ? { ...w, done: !w.done, doneAt: !w.done ? new Date().toISOString() : null }
                  : w
              ),
            }
      ),
    }));

  const addWaypoint = (pid: string, title: string, due: string) =>
    update((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id !== pid ? p : { ...p, waypoints: [...p.waypoints, { id: uid(), title, due, done: false }] }
      ),
    }));

  const removeWaypoint = (pid: string, wid: string) =>
    update((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id !== pid ? p : { ...p, waypoints: p.waypoints.filter((w) => w.id !== wid) }
      ),
    }));

  const addActivity = (a: NewActivity) =>
    update((d) => ({ ...d, activities: [...d.activities, { id: uid(), done: false, ...a }] }));

  const addManyActivities = (list: NewActivity[]) =>
    update((d) => ({
      ...d,
      activities: [...d.activities, ...list.map((a) => ({ id: uid(), done: false, ...a }))],
    }));

  const toggleActivity = (id: string) =>
    update((d) => ({
      ...d,
      activities: d.activities.map((a) =>
        a.id === id ? { ...a, done: !a.done, doneAt: !a.done ? new Date().toISOString() : null } : a
      ),
    }));

  const removeActivity = (id: string) =>
    update((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));

  const addSession = useCallback(
    (s: Session) => update((d) => ({ ...d, sessions: [...d.sessions, s] })),
    []
  );

  const setTimerSettings = (timer: TimerSettings) => update((d) => ({ ...d, timer }));

  const timer = useTimer({ settings: data.timer, onSession: addSession, enabled: ready });

  /* ---------- derived ---------- */
  const projects = useMemo<ColoredProject[]>(
    () => data.projects.map((p) => ({ ...p, color: palette[(p.ci ?? 0) % palette.length] })),
    [data.projects, palette]
  );
  const projectsById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])) as Record<string, ColoredProject>,
    [projects]
  );
  const activeProjects = projects.filter((p) => p.status === "active");

  /* The Sunday review, once a week. Before nine it waits quietly as a card on
     Today; from nine it opens itself. Both states are derived from the same
     two facts — the clock and whether this week has been settled — so closing
     the window is simply recording the week, with no separate open/closed flag
     that could disagree with them. */
  const thisMonday = startOfWeek(today);
  const pending = isSunday(today) && data.reviewSeen !== thisMonday;
  /* `tick` is not used for its value — reading it is what ties this to the
     minute timer, so nine o'clock is noticed on a window that never reloads. */
  void tick;
  const pastNine = new Date().getHours() >= REVIEW_HOUR;
  const reviewModalOpen = ready && pending && pastNine;

  const reviewDue = useMemo(() => {
    if (!pending || pastNine) return null;
    const r = buildReview({
      projects,
      activities: data.activities,
      sessions: data.sessions,
      anchor: today,
      today,
    });
    return { cleared: r.cleared, planned: r.planned, waypoints: r.waypointsReached };
  }, [pending, pastNine, today, data.activities, data.sessions, projects]);

  const markReviewSeen = () => update((d) => ({ ...d, reviewSeen: thisMonday }));

  /* If nine o'clock arrives while the window is in the background, the opened
     modal is not seen by anyone. Only fires on the transition, so reloading on
     a Sunday afternoon does not set it off again, and never prompts for
     permission on its own — the timer is where that is asked for. */
  const wasPending = useRef<boolean | null>(null);
  useEffect(() => {
    const due = reviewModalOpen;
    if (wasPending.current === false && due && canNotify()) {
      notify("Your week is ready", "Sunday review — see how the week went.", "waypoint-review");
    }
    wasPending.current = due;
  }, [reviewModalOpen]);
  const todayItems = data.activities
    .filter((a: Activity) => a.date === today)
    .sort((a, b) => Number(a.done) - Number(b.done));

  if (!ready) {
    return (
      <div className="wp-root wp-boot" data-mode="light">
        <span className="wp-mono wp-muted">Loading your courses…</span>
      </div>
    );
  }

  return (
    <div className="wp-root" data-mode={mode}>
      <header className="wp-head">
        <div className="wp-brand">
          <span className="wp-logo" aria-hidden="true" />
          <div>
            <h1>Waypoint</h1>
            <p className="wp-mono wp-muted wp-date">{fmtLong(today).toUpperCase()}</p>
          </div>
        </div>

        <div className="wp-headright">
          <TimerBadge
            timer={timer}
            onClick={() => {
              setView("today");
              setOpenProject(null);
            }}
          />
          <nav className="wp-nav" aria-label="Sections">
            {([
              ["today", "Today"],
              ["projects", "Projects"],
              ["calendar", "Calendar"],
              ["review", "Review"],
              ["stats", "Statistics"],
            ] as [View, string][]).map(([k, label]) => (
              <button
                key={k}
                className={`wp-tab${view === k ? " is-on" : ""}`}
                onClick={() => {
                  setView(k);
                  setOpenProject(null);
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          <button
            className="wp-modebtn"
            onClick={() => update((d) => ({ ...d, mode: mode === "dark" ? "light" : "dark" }))}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={mode === "dark" ? "Light mode" : "Dark mode"}
          >
            {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="wp-main">
        {view === "today" && (
          <TodayView
            items={todayItems}
            projects={activeProjects}
            projectsById={projectsById}
            activities={data.activities}
            today={today}
            timer={timer}
            timerSettings={data.timer}
            onTimerSettings={setTimerSettings}
            reviewDue={reviewDue}
            onOpenReview={() => {
              markReviewSeen();
              setView("review");
              setOpenProject(null);
            }}
            onDismissReview={markReviewSeen}
            onToggle={toggleActivity}
            onRemove={removeActivity}
            onAdd={addActivity}
            onOpenProject={(id) => {
              setOpenProject(id);
              setView("projects");
            }}
          />
        )}

        {view === "projects" && !openProject && (
          <ProjectsView
            projects={projects}
            activities={data.activities}
            onOpen={setOpenProject}
            onNew={() =>
              setEditing({
                id: uid(),
                name: "",
                purpose: "",
                situation: "",
                approach: "",
                target: shiftKey(today, 30),
                ci: data.projects.length % 6,
                status: "active",
                created: today,
                waypoints: [],
              })
            }
            onStatus={setStatus}
            onDelete={removeProject}
          />
        )}

        {view === "projects" && openProject && projectsById[openProject] && (
          <ProjectDetail
            project={projectsById[openProject]}
            activities={data.activities.filter((a) => a.projectId === openProject)}
            today={today}
            onBack={() => setOpenProject(null)}
            onEdit={() => setEditing(projectsById[openProject])}
            onToggleWaypoint={toggleWaypoint}
            onAddWaypoint={addWaypoint}
            onRemoveWaypoint={removeWaypoint}
            onAddActivity={addActivity}
            onToggleActivity={toggleActivity}
            onRemoveActivity={removeActivity}
          />
        )}

        {view === "calendar" && (
          <CalendarView
            activities={data.activities}
            projects={projects}
            projectsById={projectsById}
            today={today}
            onToggle={toggleActivity}
            onRemove={removeActivity}
            onAdd={addActivity}
            onImport={() => setImportOpen(true)}
          />
        )}

        {view === "review" && (
          <ReviewView
            projects={projects}
            projectsById={projectsById}
            activities={data.activities}
            sessions={data.sessions}
            today={today}
          />
        )}

        {view === "stats" && (
          <StatsView
            activities={data.activities}
            projects={projects}
            sessions={data.sessions}
            today={today}
          />
        )}
      </main>

      {editing && (
        <ProjectModal
          draft={editing}
          palette={palette}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            const { color: _color, ...clean } = p;
            void _color;
            saveProject(clean as Project);
            setEditing(null);
          }}
        />
      )}

      {reviewModalOpen && (
        <ReviewModal
          projects={projects}
          projectsById={projectsById}
          activities={data.activities}
          sessions={data.sessions}
          today={today}
          onClose={markReviewSeen}
        />
      )}

      {importOpen && (
        <ImportModal
          projects={activeProjects}
          today={today}
          onClose={() => setImportOpen(false)}
          onImport={(list) => {
            addManyActivities(list);
            setImportOpen(false);
          }}
        />
      )}
    </div>
  );
}
