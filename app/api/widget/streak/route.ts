import { adminConfigured, getSupabaseAdmin } from "@/components/supabase-admin";
import { engagementStreak } from "@/components/helpers";

/* Feeds an iOS Shortcuts home-screen widget. There's no Supabase session to
   check here — Shortcuts can't run the browser's login flow — so this is
   gated by a fixed bearer token instead (WIDGET_API_TOKEN) and scoped to one
   hardcoded user (WIDGET_USER_ID), which is fine for an app with exactly one
   account and no public sign-up. Not a pattern to reach for if that changes.

   Deliberately not the same "clear streak" Statistics shows — that one skips
   days with nothing planned rather than breaking on them, which is right for
   reviewing history but wrong here: it would leave a widget meant to nudge
   daily use sitting frozen on an old number through days of not opening the
   app at all. engagementStreak (helpers.ts) breaks to 0 on a truly empty day
   instead. */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  /* Every path below returns JSON, on purpose — an uncaught throw here (the
     first version of this route had one, from getSupabaseAdmin() when
     SUPABASE_SERVICE_ROLE_KEY wasn't set) surfaces as a bare "HTTP ERROR
     500" with nothing to debug from, on a route that's only ever opened by
     pasting a URL into Safari. */
  try {
    const token = process.env.WIDGET_API_TOKEN;
    const userId = process.env.WIDGET_USER_ID;
    const missing = [
      !token && "WIDGET_API_TOKEN",
      !userId && "WIDGET_USER_ID",
      !adminConfigured && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    if (!token || !userId || missing.length) {
      return Response.json(
        { error: `Widget endpoint not configured: set ${missing.join(", ")} in Vercel.` },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    /* The header is the "real" way in, but Shortcuts' Headers UI is an easy
       place to get subtly wrong (autocapitalization, a stray space) with no
       way to see what was actually sent. A query param is a fallback that
       can be tested by pasting one URL straight into Safari — that isolates
       a wrong token/user-id (still fails there) from a broken Shortcut
       (works there, fails from Shortcuts). */
    const auth = request.headers.get("authorization");
    const queryToken = url.searchParams.get("token");
    if (auth !== `Bearer ${token}` && queryToken !== token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* `today` has to come from the phone, not the server: Vercel's clock is
       UTC, and this app's one hard rule (see WAYPOINT.md) is that a local
       day is never derived from a UTC instant — an evening request from
       Denmark could otherwise land on tomorrow. Shortcuts can format
       "Current Date" as Y-M-D locally, so the caller supplies it instead.

       Sliced to the first 10 characters rather than matched exactly — the
       same leniency the Strava webhook uses on start_date_local — so an
       iOS date format that comes through as a full timestamp
       ("2026-08-18T21:04:00+02:00", say, from an ISO 8601 preset instead of
       a custom yyyy-MM-dd one) still works instead of being rejected on a
       technicality the caller can't easily see. */
    const raw = url.searchParams.get("today");
    const today = raw?.slice(0, 10);
    if (!today || !DATE_RE.test(today)) {
      return Response.json(
        {
          error: "Missing or malformed ?today=YYYY-MM-DD — pass the phone's local date.",
          received: raw,
        },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from("activities")
      .select("date, done")
      .eq("user_id", userId);
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const streak = engagementStreak(data, today);
    return Response.json({ streak });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
