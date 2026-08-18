"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sun, Moon, LogOut, X, Compass, Layers, Calendar, CalendarCheck, BarChart3 } from "lucide-react";
import type {
  AppData,
  Activity,
  ColoredProject,
  NewActivity,
  NewRecurringActivity,
  Project,
  ProjectStatus,
  GoalEntry,
  Session,
  TimerSettings,
  WaypointItem,
} from "./types";
import { PALETTES, pendingRecurringDates, shiftKey, todayKey, uid } from "./helpers";
import { DEFAULT_TIMER } from "./store";
import * as db from "./db";
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

/* One list drives both the top tab row (desktop) and the bottom tab bar
   (mobile/tablet) — same views, same order, just a different shell around
   them depending on where the thumb actually is. */
const TABS: [View, string, typeof Compass][] = [
  ["today", "Today", Compass],
  ["projects", "Courses", Layers],
  ["calendar", "Calendar", Calendar],
  ["review", "Review", CalendarCheck],
  ["stats", "Stats", BarChart3],
];

/* The hour on a Sunday when the review stops waiting and opens itself. */
const REVIEW_HOUR = 9;

/* =============================== APP =============================== */
const EMPTY: AppData = {
  mode: "light",
  projects: [],
  activities: [],
  recurringActivities: [],
  sessions: [],
  goalEntries: [],
  timer: DEFAULT_TIMER,
  reviewSeen: null,
};

/* How the Strava consent screen ended. The callback route can only redirect to
   a URL, so the outcome arrives as a query param and is read once, at load —
   a redirect is always a fresh document, so there is nothing to re-read later.
   Safe to seed React state from: nothing is rendered until the account's data
   has loaded, so the server's markup and the first client render agree. */
const stravaResult =
  typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("strava");

const stravaFailure =
  stravaResult === "denied"
    ? "Strava was not connected — the request was declined."
    : stravaResult === "error"
      ? "Could not connect Strava. Try again from the Strava card in Statistics."
      : null;

export default function Waypoint({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(stravaFailure);
  /* landing on Statistics after connecting is the point: the course that
     synced runs get filed under is still to be chosen */
  const [view, setView] = useState<View>(stravaResult === "connected" ? "stats" : "today");
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  /* recomputed at midnight, not once per mount — this window stays open */
  const today = useToday();
  const tick = useMinuteTick();

  /* Mutations read and write this rather than React state, so two changes in
     the same tick both build on each other. A rollback snapshot taken from
     state could be one commit behind and would undo the wrong thing. */
  const dataRef = useRef<AppData>(EMPTY);
  const apply = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        /* The account is the only source. There was a carry-over from
           localStorage here, but the only thing localStorage ever held was
           the prototype's sample data — so it wrote demo projects into a real
           account. An empty account starts empty; the empty states already
           invite the first move. */
        const loaded = await db.loadAll(userId);
        if (!alive) return;

        /* Turning recurring rules into today's (and the next week's, and any
           genuinely missed) activity rows, before the first paint — so
           there's never a flash of an empty Today that then pops in a
           moment later. Its own try/catch: a hiccup here shouldn't block the
           rest of the app from showing data that already loaded fine. */
        try {
          const existingExternalIds = new Set(
            loaded.activities
              .filter((a) => a.source === "recurring" && a.externalId)
              .map((a) => a.externalId as string)
          );
          const pending = pendingRecurringDates(loaded.recurringActivities, existingExternalIds, todayKey());
          const created = await db.materializeRecurring(pending, userId);
          if (created.length) loaded.activities = [...loaded.activities, ...created];
        } catch (e) {
          console.warn("Could not generate recurring activities:", e);
        }

        if (!alive) return;
        dataRef.current = loaded;
        setData(loaded);
        setReady(true);
      } catch (e) {
        if (!alive) return;
        setFailure(e instanceof Error ? e.message : "Could not reach the database.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  /* Coming back from Strava, the outcome is taken out of the address bar so a
     reload does not replay it. Only the URL is touched here — the state it
     implies was seeded at first render, because setting it from an effect
     would render the wrong screen first and then correct it. */
  useEffect(() => {
    if (stravaResult) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  /* Change the screen now, tell the database after. If the write fails the
     change is taken back and said out loud, rather than the app quietly
     showing something the database does not contain. */
  const mutate = useCallback(
    (optimistic: (d: AppData) => AppData, write: () => Promise<void>) => {
      const before = dataRef.current;
      apply(optimistic(before));
      write().catch((e: unknown) => {
        apply(before);
        setFailure(e instanceof Error ? e.message : "That change did not save.");
      });
    },
    [apply]
  );

  const mode = data.mode === "dark" ? "dark" : "light";
  const palette = PALETTES[mode];

  /* Carry the mode up to <html>, so the browser's own canvas matches and no
     pale edge shows around a dark app. The same pass fixes theme-color: the
     static one in layout.tsx follows the operating system, while the app
     follows this toggle, so a dark app on a light phone got a light status
     bar. Written to the DOM rather than held in state — it is the document
     being kept in step with the app, not the other way round. */
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    /* One tag of our own, created once and only ever updated. An earlier
       version removed every theme-color meta first — but those are rendered
       by Next from the viewport export, so React owns them. Deleting a node
       out from under React makes its next update throw on removeChild, in
       the middle of the commit, which takes the rest of the page down with
       it. Never remove what React rendered. */
    let meta = document.head.querySelector<HTMLMetaElement>("meta[data-wp-theme]");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.setAttribute("data-wp-theme", "");
      document.head.appendChild(meta);
    }
    meta.content = mode === "dark" ? "#17131D" : "#F3F1F5";
  }, [mode]);

  /* ---------- mutations ----------
     Each one changes the screen and writes just the record that moved. */
  const saveProject = (p: Project) =>
    mutate(
      (d) => ({
        ...d,
        projects: d.projects.some((x) => x.id === p.id)
          ? d.projects.map((x) => (x.id === p.id ? p : x))
          : [...d.projects, p],
      }),
      () => db.saveProject(p, userId)
    );

  const removeProject = (id: string) =>
    mutate(
      (d) => ({
        ...d,
        projects: d.projects.filter((p) => p.id !== id),
        activities: d.activities.filter((a) => a.projectId !== id),
        sessions: d.sessions.filter((s) => s.projectId !== id),
        goalEntries: d.goalEntries.filter((e) => e.projectId !== id),
      }),
      () => db.deleteProject(id)
    );

  const setStatus = (id: string, status: ProjectStatus) =>
    mutate(
      (d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, status } : p)) }),
      () => db.setProjectStatus(id, status)
    );

  const toggleWaypoint = (pid: string, wid: string) => {
    const current = dataRef.current.projects
      .find((p) => p.id === pid)
      ?.waypoints.find((w) => w.id === wid);
    if (!current) return;
    const done = !current.done;
    const doneAt = done ? new Date().toISOString() : null;
    mutate(
      (d) => ({
        ...d,
        projects: d.projects.map((p) =>
          p.id !== pid
            ? p
            : {
                ...p,
                waypoints: p.waypoints.map((w) => (w.id === wid ? { ...w, done, doneAt } : w)),
              }
        ),
      }),
      () => db.setWaypointDone(wid, done, doneAt)
    );
  };

  const addWaypoint = (pid: string, title: string, due: string) => {
    const w: WaypointItem = { id: uid(), title, due, done: false, doneAt: null };
    const position = dataRef.current.projects.find((p) => p.id === pid)?.waypoints.length ?? 0;
    mutate(
      (d) => ({
        ...d,
        projects: d.projects.map((p) =>
          p.id !== pid ? p : { ...p, waypoints: [...p.waypoints, w] }
        ),
      }),
      () => db.addWaypoint(w, pid, position)
    );
  };

  const removeWaypoint = (pid: string, wid: string) =>
    mutate(
      (d) => ({
        ...d,
        projects: d.projects.map((p) =>
          p.id !== pid ? p : { ...p, waypoints: p.waypoints.filter((w) => w.id !== wid) }
        ),
      }),
      () => db.deleteWaypoint(wid)
    );

  const addActivity = (a: NewActivity) => {
    const row: Activity = { id: uid(), done: false, doneAt: null, ...a };
    mutate(
      (d) => ({ ...d, activities: [...d.activities, row] }),
      () => db.addActivity(row, userId)
    );
  };

  const addManyActivities = (list: NewActivity[]) => {
    const rows: Activity[] = list.map((a) => ({ id: uid(), done: false, doneAt: null, ...a }));
    mutate(
      (d) => ({ ...d, activities: [...d.activities, ...rows] }),
      () => db.addActivities(rows, userId)
    );
  };

  const toggleActivity = (id: string) => {
    const current = dataRef.current.activities.find((a) => a.id === id);
    if (!current) return;
    const done = !current.done;
    const doneAt = done ? new Date().toISOString() : null;
    mutate(
      (d) => ({
        ...d,
        activities: d.activities.map((a) => (a.id === id ? { ...a, done, doneAt } : a)),
      }),
      () => db.setActivityDone(id, done, doneAt)
    );
  };

  const removeActivity = (id: string) =>
    mutate(
      (d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }),
      () => db.deleteActivity(id)
    );

  const addRecurring = (r: NewRecurringActivity) => {
    const row = { id: uid(), active: true, createdAt: todayKey(), ...r };
    mutate(
      (d) => ({ ...d, recurringActivities: [...d.recurringActivities, row] }),
      () => db.addRecurring(row, userId)
    );
  };

  const setRecurringActive = (id: string, active: boolean) =>
    mutate(
      (d) => ({
        ...d,
        recurringActivities: d.recurringActivities.map((r) => (r.id === id ? { ...r, active } : r)),
      }),
      () => db.setRecurringActive(id, active)
    );

  const removeRecurring = (id: string) =>
    mutate(
      (d) => ({ ...d, recurringActivities: d.recurringActivities.filter((r) => r.id !== id) }),
      () => db.deleteRecurring(id)
    );

  const addSession = useCallback(
    (s: Session) =>
      mutate(
        (d) => ({ ...d, sessions: [...d.sessions, s] }),
        () => db.addSession(s, userId)
      ),
    [mutate, userId]
  );

  const addGoalEntry = (projectId: string, value: number) => {
    const entry: GoalEntry = { id: uid(), projectId, date: today, value };
    mutate(
      (d) => ({ ...d, goalEntries: [...d.goalEntries, entry] }),
      () => db.addGoalEntry(entry, userId)
    );
  };

  const removeGoalEntry = (id: string) =>
    mutate(
      (d) => ({ ...d, goalEntries: d.goalEntries.filter((e) => e.id !== id) }),
      () => db.deleteGoalEntry(id)
    );

  const setTimerSettings = (timer: TimerSettings) =>
    mutate(
      (d) => ({ ...d, timer }),
      () => db.savePrefs(userId, { timer })
    );

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
      goalEntries: data.goalEntries,
      anchor: today,
      today,
    });
    return { cleared: r.cleared, planned: r.planned, waypoints: r.waypointsReached };
  }, [pending, pastNine, today, data.activities, data.sessions, data.goalEntries, projects]);

  const markReviewSeen = () =>
    mutate(
      (d) => ({ ...d, reviewSeen: thisMonday }),
      () => db.savePrefs(userId, { reviewSeen: thisMonday })
    );

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

  /* A failure before the first load means there is nothing to show at all, so
     it gets the whole screen rather than a banner over an empty app. */
  if (!ready && failure) {
    return (
      <div className="wp-root wp-boot" data-mode="light">
        <div className="wp-card wp-signin-card">
          <h3>Could not load your courses</h3>
          <p className="wp-empty">{failure}</p>
          <div className="wp-project-actions">
            <button className="wp-btn wp-btn-solid" onClick={() => window.location.reload()}>
              Try again
            </button>
            <button className="wp-btn" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <h1>Waypoint</h1>
        </div>

        <nav className="wp-nav" aria-label="Sections">
          {TABS.map(([k, label]) => (
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

        <div className="wp-headright">
          <TimerBadge
            timer={timer}
            onClick={() => {
              setView("today");
              setOpenProject(null);
            }}
          />
          <button
            className="wp-modebtn"
            onClick={() => {
              const next = mode === "dark" ? "light" : "dark";
              mutate(
                (d) => ({ ...d, mode: next }),
                () => db.savePrefs(userId, { mode: next })
              );
            }}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            data-role="mode"
            title={mode === "dark" ? "Light mode" : "Dark mode"}
          >
            {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="wp-modebtn" onClick={onSignOut} aria-label="Sign out" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* A write that rolled back has to be said out loud, or the screen and
          the database quietly disagree. */}
      {failure && (
        <div className="wp-failure" role="alert">
          <span className="wp-failure-text">{failure}</span>
          <button className="wp-icon" onClick={() => setFailure(null)} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

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
            goalEntries={data.goalEntries}
            onOpen={setOpenProject}
            onNew={() =>
              setEditing({
                id: uid(),
                name: "",
                purpose: "",
                situation: "",
                approach: "",
                target: shiftKey(today, 30),
                ci: data.projects.length % 12,
                status: "active",
                created: today,
                waypoints: [],
                goal: null,
                icon: null,
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
            recurring={data.recurringActivities.filter((r) => r.projectId === openProject)}
            goalEntries={data.goalEntries}
            today={today}
            onBack={() => setOpenProject(null)}
            onEdit={() => setEditing(projectsById[openProject])}
            onToggleWaypoint={toggleWaypoint}
            onAddWaypoint={addWaypoint}
            onRemoveWaypoint={removeWaypoint}
            onAddActivity={addActivity}
            onAddRecurring={addRecurring}
            onSetRecurringActive={setRecurringActive}
            onRemoveRecurring={removeRecurring}
            onToggleActivity={toggleActivity}
            onRemoveActivity={removeActivity}
            onAddGoalEntry={addGoalEntry}
            onRemoveGoalEntry={removeGoalEntry}
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
            goalEntries={data.goalEntries}
            today={today}
          />
        )}

        {view === "stats" && (
          <StatsView
            activities={data.activities}
            projects={projects}
            sessions={data.sessions}
            today={today}
            userId={userId}
          />
        )}
      </main>

      <nav className="wp-tabbar" aria-label="Sections">
        {TABS.map(([k, label, Icon]) => (
          <button
            key={k}
            className={`wp-tabbar-btn${view === k ? " is-on" : ""}`}
            onClick={() => {
              setView(k);
              setOpenProject(null);
            }}
            aria-current={view === k ? "page" : undefined}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

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
          goalEntries={data.goalEntries}
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
