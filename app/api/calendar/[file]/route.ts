import { createClient } from "@supabase/supabase-js";
import { buildCalendar, type FeedRow } from "@/components/ics";

/* The Apple Calendar subscription: /api/calendar/<token>.ics

   A calendar app fetches this on its own schedule with no session and no
   headers, so the long random token in the path is the whole of the
   credential. It is checked inside Postgres by calendar_feed() (see
   migration-phase-8.sql), a security-definer function that answers for the
   one user whose prefs hold that token and returns titles and dates only —
   so this route needs nothing but the public anon key, and no service-role
   key ever has to exist for it. A malformed token is a 404; a well-formed
   but wrong or revoked one gets an empty calendar, and learns nothing. */

const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const token = file.replace(/\.ics$/, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!TOKEN_RE.test(token)) return new Response("Not found", { status: 404 });
  if (!url || !anonKey) return new Response("Calendar feed is not configured", { status: 500 });

  const db = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("calendar_feed", { p_token: token });
  if (error) return new Response(`Could not read the calendar: ${error.message}`, { status: 500 });

  const rows = (data ?? []) as FeedRow[];
  /* The server's clock is UTC and the phone's day is not, so the cut-off
     for alerts is set a day early: an alert too many beats one too few. */
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  return new Response(buildCalendar(rows, now, yesterday), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="waypoint.ics"',
      "Cache-Control": "no-store",
    },
  });
}
