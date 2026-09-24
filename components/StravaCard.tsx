import { useEffect, useState } from "react";
import type { ColoredProject } from "./types";
import { Select } from "./Select";
import * as db from "./db";
import type { StravaConnection } from "./db";

/* Off until Strava's API is actually paid for and the migration/env vars are
   in place — see WAYPOINT.md's Phase 3 section. Flip to true to bring the
   card back; the underlying feature is built and was verified before this
   flag was added. */
export const STRAVA_ENABLED = false;

/* Connect once, then pick which course a synced run gets filed under.
   Loads its own state rather than threading it through Waypoint's mutate()
   machinery — this is one row, read once, edited rarely, and the OAuth
   round trip happens on a server route this component never touches. */
export function StravaCard({ userId, projects }: { userId: string; projects: ColoredProject[] }) {
  const [connection, setConnection] = useState<StravaConnection | null | "loading">("loading");
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    let cancelled = false;
    db.getStravaConnection(userId)
      .then((c) => {
        if (!cancelled) setConnection(c);
      })
      .catch(() => {
        if (!cancelled) setConnection(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <section className="wp-card">
      <div className="wp-card-head">
        <h3>Strava</h3>
      </div>
      {connection === "loading" ? (
        <p className="wp-empty">Checking your connection…</p>
      ) : connection === null ? (
        <div className="wp-stravaconnect">
          <p className="wp-empty">
            Connect Strava to have a finished run show up here already logged.
          </p>
          <a className="wp-btn" href={`/api/strava/connect?state=${encodeURIComponent(userId)}`}>
            Connect Strava
          </a>
        </div>
      ) : (
        <div className="wp-stravaconnect">
          <p className="wp-empty">
            Connected — new runs are logged automatically as they land in Strava.
          </p>
          <label className="wp-stravaproject">
            <span className="wp-mono wp-muted">FILE SYNCED RUNS UNDER</span>
            <Select
              value={connection.syncProjectId ?? ""}
              placeholder="Choose a course"
              disabled={savingProject}
              ariaLabel="Course synced Strava activities are filed under"
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(v) => {
                if (!v) return;
                setSavingProject(true);
                setConnection((c) => (c && c !== "loading" ? { ...c, syncProjectId: v } : c));
                db.setStravaSyncProject(userId, v).finally(() => setSavingProject(false));
              }}
            />
          </label>
        </div>
      )}
    </section>
  );
}
