import { getSupabaseAdmin } from "@/components/supabase-admin";
import { API, freshAccessToken, type TokenRow } from "../tokens";

/* Where a finished run becomes an activity.

   Strava calls this, not the browser, so there is no session to read — the
   athlete id on the event is what identifies the user, and the service-role
   client is what can act for them. */

interface StravaActivity {
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
}

/* Strava's one-time subscription check: echo the challenge back. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  if (
    q.get("hub.mode") === "subscribe" &&
    q.get("hub.verify_token") === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  ) {
    return Response.json({ "hub.challenge": q.get("hub.challenge") });
  }
  return new Response("Bad verify token", { status: 403 });
}

export async function POST(request: Request) {
  /* Strava retries hard and disables a subscription that stops answering, so
     every path below ends in a 200 — a failure here is ours to find in the
     logs, not Strava's to keep knocking about. */
  try {
    const event = await request.json();
    if (event?.object_type !== "activity" || event?.aspect_type !== "create") {
      return Response.json({ ok: true });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("strava_tokens")
      .select("*")
      .eq("athlete_id", event.owner_id)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const row = data as TokenRow | null;
    if (!row) {
      console.warn(`Strava webhook for unknown athlete ${event.owner_id}`);
      return Response.json({ ok: true });
    }
    if (!row.sync_project_id) {
      console.warn("Strava activity skipped: no sync course chosen yet");
      return Response.json({ ok: true });
    }

    const token = await freshAccessToken(row);
    const res = await fetch(`${API}/activities/${event.object_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Strava activity fetch failed: ${res.status}`);
    const activity = (await res.json()) as StravaActivity;

    const insert = await db.from("activities").upsert(
      {
        id: crypto.randomUUID(),
        user_id: row.user_id,
        project_id: row.sync_project_id,
        title: activity.name,
        /* `date` is a plain local day, and start_date_local already *is* local
           wall-clock time with a misleading ISO shape. Sliced as a string it
           stays the day the run happened; passed through Date it would be read
           as UTC and an evening run would land on tomorrow. */
        date: activity.start_date_local.slice(0, 10),
        done: true,
        /* `done_at` is the opposite case — a real instant, so it is built from
           start_date (genuinely UTC) and toISOString is correct. Do not
           "fix" one of these two to match the other. */
        done_at: new Date(
          new Date(activity.start_date).getTime() + activity.elapsed_time * 1000
        ).toISOString(),
        source: "strava",
        external_id: String(event.object_id),
        distance_m: activity.distance,
        moving_time_s: activity.moving_time,
        elapsed_time_s: activity.elapsed_time,
        avg_hr: activity.average_heartrate ?? null,
        max_hr: activity.max_heartrate ?? null,
        elevation_gain_m: activity.total_elevation_gain,
        activity_type: activity.sport_type,
      },
      { onConflict: "user_id,source,external_id" }
    );
    if (insert.error) throw new Error(insert.error.message);

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Strava webhook failed:", e);
    return Response.json({ ok: true });
  }
}
