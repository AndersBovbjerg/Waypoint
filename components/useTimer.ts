import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, TimerRuntime, TimerSettings } from "./types";
import { IDLE_RUNTIME, localStore, resolvePreset } from "./store";
import { fmtClock, keyOf, uid } from "./helpers";
import { ensurePermission, notify } from "./notify";

const TIMER_TAG = "waypoint-timer";

/* A phase that ended more than this long ago gets settled quietly — no bell
   for a break that finished while the machine was asleep. */
const STALE_MS = 2 * 60_000;

/* ---------- chime ----------
   Synthesised rather than shipped as an audio file: two soft sine tones,
   rising into focus and falling into a break, so the two are told apart
   without looking. The context is created on the first start, which is a
   user gesture, so autoplay policy is satisfied. */
let audio: AudioContext | null = null;
function chime(rising: boolean) {
  try {
    if (typeof window === "undefined") return;
    audio = audio ?? new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const notes = rising ? [523.25, 783.99] : [783.99, 523.25];
    notes.forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audio!.destination);
      const at = audio!.currentTime + i * 0.2;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.16, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
      osc.start(at);
      osc.stop(at + 0.95);
    });
  } catch {
    /* audio is a nicety; never let it break the timer */
  }
}

export interface TimerApi {
  runtime: TimerRuntime;
  remaining: number;
  progress: number;
  running: boolean;
  label: string;
  start: (projectId: string, activityId: string | null) => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  stop: () => void;
}

export function useTimer({
  settings,
  onSession,
  enabled,
}: {
  settings: TimerSettings;
  onSession: (s: Session) => void;
  /* held false until saved data has loaded, so we don't write over it */
  enabled: boolean;
}): TimerApi {
  const [runtime, setRuntime] = useState<TimerRuntime>(IDLE_RUNTIME);
  const [now, setNow] = useState(() => Date.now());
  const loaded = useRef(false);
  const settledAt = useRef<number | null>(null);

  const preset = useMemo(() => resolvePreset(settings), [settings]);

  /* keep the latest values reachable from the settle effect without
     making it re-run and re-fire a transition. Written after commit, not
     during render, so a discarded render can never leave a stale value. */
  const onSessionRef = useRef(onSession);
  const settingsRef = useRef(settings);
  const presetRef = useRef(preset);
  const runtimeRef = useRef(runtime);
  useEffect(() => {
    onSessionRef.current = onSession;
    settingsRef.current = settings;
    presetRef.current = preset;
    runtimeRef.current = runtime;
  });

  /* ---------- restore a session that was running before a reload ----------
     Reading localStorage during render would make the server and client
     disagree and break hydration, so this genuinely has to happen after
     mount: it seeds React state from an external system exactly once. */
  useEffect(() => {
    if (!enabled || loaded.current) return;
    loaded.current = true;
    const saved = localStore.loadTimer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    if (saved) setRuntime({ ...IDLE_RUNTIME, ...saved });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !loaded.current) return;
    localStore.saveTimer(runtime.phase === "idle" ? null : runtime);
  }, [runtime, enabled]);

  /* ---------- the clock ----------
     Only drives re-renders. Remaining time comes from the absolute endsAt,
     so a throttled or backgrounded tab still shows the right number the
     moment it wakes up. */
  useEffect(() => {
    if (runtime.endsAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [runtime.endsAt]);

  /* Capped at the phase length so the first render after starting shows the
     full duration rather than a value computed from a `now` that is up to
     one tick old. Never floors here — the transition effect needs to see
     the crossing to zero. */
  const raw =
    runtime.paused != null ? runtime.paused : runtime.endsAt != null ? runtime.endsAt - now : 0;
  const remaining = Math.min(raw, runtime.totalMs || raw);

  /* ---------- phase transitions ---------- */
  useEffect(() => {
    if (runtime.endsAt == null || runtime.phase === "idle") return;
    if (remaining > 0) return;
    if (settledAt.current === runtime.endsAt) return;
    settledAt.current = runtime.endsAt;

    const endsAt = runtime.endsAt;
    const silent = Date.now() - endsAt > STALE_MS;
    const p = presetRef.current;
    const s = settingsRef.current;

    if (runtime.phase === "focus") {
      if (runtime.projectId && runtime.startedAt) {
        onSessionRef.current({
          id: uid(),
          projectId: runtime.projectId,
          activityId: runtime.activityId,
          date: keyOf(new Date(runtime.startedAt)),
          startedAt: new Date(runtime.startedAt).toISOString(),
          endedAt: new Date(endsAt).toISOString(),
          minutes: Math.round(runtime.totalMs / 60_000),
          completed: true,
        });
      }
      const cycle = runtime.cycle + 1;
      const isLong = p.cycles > 0 && cycle % p.cycles === 0;
      const ms = (isLong ? p.longBreak : p.break) * 60_000;
      if (!silent) {
        if (s.sound) chime(false);
        notify(isLong ? "Long break" : "Break", `${isLong ? p.longBreak : p.break} minutes. Step away.`, TIMER_TAG);
      }
      setRuntime({
        ...runtime,
        phase: "break",
        cycle,
        isLongBreak: isLong,
        totalMs: ms,
        startedAt: null,
        endsAt: s.autoStartBreak && !silent ? Date.now() + ms : null,
        paused: s.autoStartBreak && !silent ? null : ms,
      });
    } else {
      const ms = p.focus * 60_000;
      if (!silent) {
        if (s.sound) chime(true);
        notify("Back to it", `${p.focus} minutes of focus.`, TIMER_TAG);
      }
      const auto = s.autoStartFocus && !silent;
      setRuntime({
        ...runtime,
        phase: "focus",
        isLongBreak: false,
        totalMs: ms,
        startedAt: auto ? Date.now() : null,
        endsAt: auto ? Date.now() + ms : null,
        paused: auto ? null : ms,
      });
    }
  }, [remaining, runtime]);

  /* ---------- glanceable countdown in the window title ---------- */
  useEffect(() => {
    const base = "Waypoint";
    if (runtime.phase === "idle") {
      document.title = base;
      return;
    }
    const mark = runtime.phase === "focus" ? "Focus" : "Break";
    const paused = runtime.paused != null ? " · paused" : "";
    document.title = `${fmtClock(remaining)} · ${mark}${paused}`;
    return () => {
      document.title = base;
    };
  }, [remaining, runtime.phase, runtime.paused]);

  /* ---------- controls ---------- */
  const start = useCallback(
    (projectId: string, activityId: string | null) => {
      void ensurePermission();
      if (settingsRef.current.sound) chime(true);
      const ms = presetRef.current.focus * 60_000;
      settledAt.current = null;
      setRuntime({
        phase: "focus",
        endsAt: Date.now() + ms,
        paused: null,
        totalMs: ms,
        cycle: 0,
        isLongBreak: false,
        projectId,
        activityId,
        startedAt: Date.now(),
      });
    },
    []
  );

  const pause = useCallback(() => {
    setRuntime((r) => {
      if (r.endsAt == null) return r;
      return { ...r, paused: Math.max(0, r.endsAt - Date.now()), endsAt: null };
    });
  }, []);

  const resume = useCallback(() => {
    setRuntime((r) => {
      if (r.paused == null) return r;
      settledAt.current = null;
      return {
        ...r,
        endsAt: Date.now() + r.paused,
        paused: null,
        startedAt: r.phase === "focus" && r.startedAt == null ? Date.now() : r.startedAt,
      };
    });
  }, []);

  /* End the phase now and move to the next one, as if the bell had rung. */
  const skip = useCallback(() => {
    setRuntime((r) => {
      if (r.phase === "idle") return r;
      settledAt.current = null;
      return { ...r, endsAt: Date.now(), paused: null };
    });
  }, []);

  /* Abandon the run. A focus block that got some way in is still logged —
     twenty honest minutes are worth more in the record than nothing.
     The logging happens here rather than inside the state updater: an
     updater must be pure, and a setState nested in one is discarded. */
  const stop = useCallback(() => {
    const r = runtimeRef.current;
    if (r.phase === "focus" && r.projectId && r.startedAt) {
      const left = r.paused != null ? r.paused : r.endsAt != null ? r.endsAt - Date.now() : 0;
      const minutes = Math.round((r.totalMs - Math.max(0, left)) / 60_000);
      if (minutes >= 1) {
        onSessionRef.current({
          id: uid(),
          projectId: r.projectId,
          activityId: r.activityId,
          date: keyOf(new Date(r.startedAt)),
          startedAt: new Date(r.startedAt).toISOString(),
          endedAt: new Date().toISOString(),
          minutes,
          completed: false,
        });
      }
    }
    settledAt.current = null;
    setRuntime(IDLE_RUNTIME);
  }, []);

  const running = runtime.phase !== "idle" && runtime.endsAt != null;
  const progress = runtime.totalMs > 0 ? 1 - Math.max(0, remaining) / runtime.totalMs : 0;
  const label =
    runtime.phase === "idle" ? "Ready" : runtime.phase === "focus" ? "Focus" : runtime.isLongBreak ? "Long break" : "Break";

  return { runtime, remaining: Math.max(0, remaining), progress, running, label, start, pause, resume, skip, stop };
}
