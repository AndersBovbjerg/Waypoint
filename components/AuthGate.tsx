"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";

type Phase = "checking" | "out" | "sent" | "in";
type Method = "password" | "link";

/* Holds the app back until there is a session.
   Password is the way in, because the magic link depends on Supabase's built-in
   mail sender, which allows only a handful of messages an hour and is meant for
   testing rather than daily use. The link stays as a second route, for a device
   where typing a password is awkward — but it is no longer the only door. */
export function AuthGate({ children }: { children: (session: Session) => React.ReactNode }) {
  /* Whether the keys are present is known at build time, so it is a starting
     state rather than something an effect has to correct afterwards. */
  const [phase, setPhase] = useState<Phase>(supabaseConfigured ? "checking" : "out");
  const [session, setSession] = useState<Session | null>(null);
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    supabaseConfigured
      ? null
      : "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload."
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const db = getSupabase();
    let alive = true;

    db.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!alive) return;
      setSession(data.session);
      setPhase(data.session ? "in" : "out");
    });

    /* Covers a magic link landing back on the page, and the session being
       refreshed or expiring while the window sits open all day. */
    const { data: sub } = db.auth.onAuthStateChange((_event: string, next: Session | null) => {
      if (!alive) return;
      setSession(next);
      setPhase(next ? "in" : "out");
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    const address = email.trim();
    if (!address || !password) return;
    setBusy(true);
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithPassword({
      email: address,
      password,
    });
    setBusy(false);
    /* On success the auth listener flips the phase, so there is nothing to do
       here but clear the field. */
    if (err) setError(err.message);
    else setPassword("");
  };

  const sendLink = async () => {
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) setError(err.message);
    else setPhase("sent");
  };

  if (phase === "checking") {
    return (
      <div className="wp-root wp-boot" data-mode="light">
        <span className="wp-mono wp-muted">Checking your session…</span>
      </div>
    );
  }

  if (phase === "in" && session) return <>{children(session)}</>;

  return (
    <div className="wp-root wp-signin" data-mode="light">
      <div className="wp-card wp-signin-card">
        <div className="wp-brand wp-signin-brand">
          <span className="wp-logo" aria-hidden="true" />
          <h1>Waypoint</h1>
        </div>

        {phase === "sent" ? (
          <>
            <p className="wp-note">Check your email. The link signs you straight in.</p>
            <p className="wp-empty">
              Sent to {email.trim()}. It is good for one use and lasts an hour — open it on the
              device you want to be signed in on.
            </p>
            <button className="wp-btn" onClick={() => setPhase("out")}>
              Back
            </button>
          </>
        ) : (
          <>
            <p className="wp-note">
              Your courses are waiting. Sign in and they follow you to any device.
            </p>

            <label className="wp-field">
              <span className="wp-eyebrow wp-mono">Email</span>
              <input
                className="wp-input"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            {method === "password" && (
              <label className="wp-field">
                <span className="wp-eyebrow wp-mono">Password</span>
                <input
                  className="wp-input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !busy && void signIn()}
                />
              </label>
            )}

            {error && <p className="wp-signin-error">{error}</p>}

            {method === "password" ? (
              <div className="wp-signin-actions">
                <button
                  className="wp-btn wp-btn-solid"
                  onClick={() => void signIn()}
                  disabled={busy || !email.trim() || !password}
                >
                  {busy ? "Signing in…" : "Sign in"}
                </button>
                <button
                  className="wp-back"
                  onClick={() => {
                    setMethod("link");
                    setError(null);
                  }}
                >
                  Email me a link instead
                </button>
              </div>
            ) : (
              <div className="wp-signin-actions">
                <button
                  className="wp-btn wp-btn-solid"
                  onClick={() => void sendLink()}
                  disabled={busy || !email.trim()}
                >
                  {busy ? "Sending…" : "Send me a link"}
                </button>
                <button
                  className="wp-back"
                  onClick={() => {
                    setMethod("password");
                    setError(null);
                  }}
                >
                  Use a password
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
