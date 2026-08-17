import { getSupabaseAdmin } from "@/components/supabase-admin";
import { clearStreak } from "@/components/helpers";

/* Feeds an iOS Shortcuts home-screen widget. There's no Supabase session to
   check here — Shortcuts can't run the browser's login flow — so this is
   gated by a fixed bearer token instead (WIDGET_API_TOKEN) and scoped to one
   hardcoded user (WIDGET_USER_ID), which is fine for an app with exactly one
   account and no public sign-up. Not a pattern to reach for if that changes. */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const token = process.env.WIDGET_API_TOKEN;
  const userId = process.env.WIDGET_USER_ID;
  if (!token || !userId) {
    return Response.json(
      { error: "Widget endpoint not configured: set WIDGET_API_TOKEN and WIDGET_USER_ID." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  /* The header is the "real" way in, but Shortcuts' Headers UI is an easy
     place to get subtly wrong (autocapitalization, a stray space) with no
     way to see what was actually sent. A query param is a fallback that can
     be tested by pasting one URL straight into Safari — that isolates a
     wrong token/user-id (still fails there) from a broken Shortcut (works
     there, fails from Shortcuts). */
  const auth = request.headers.get("authorization");
  const queryToken = url.searchParams.get("token");
  if (auth !== `Bearer ${token}` && queryToken !== token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* `today` has to come from the phone, not the server: Vercel's clock is
     UTC, and this app's one hard rule (see WAYPOINT.md) is that a local day
     is never derived from a UTC instant — an evening request from Denmark
     could otherwise land on tomorrow. Shortcuts can format "Current Date" as
     Y-M-D locally, so the caller supplies it instead. */
  const today = url.searchParams.get("today");
  if (!today || !DATE_RE.test(today)) {
    return Response.json(
      { error: "Missing or malformed ?today=YYYY-MM-DD — pass the phone's local date." },
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

  const streak = clearStreak(data, today);
  return Response.json({ streak });
}
