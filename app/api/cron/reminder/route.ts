import webpush from "web-push";
import { adminConfigured, getSupabaseAdmin } from "@/components/supabase-admin";

/* Vercel Cron hits this once a day (see vercel.json) and expects a response,
   not a person watching — so, like the widget route, every path here returns
   JSON with a real status instead of letting an uncaught throw surface as a
   bare 500 with nothing to debug from.

   DST caveat, same shape as every other local-time note in this app: the
   schedule in vercel.json is a fixed UTC time, chosen for whichever half of
   the year it was set in. Twice a year it'll fire an hour off local time
   until the entry is nudged back — there's no clean way around that with a
   once-a-day cron and no reason to spend a second table/route on it. */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayInCopenhagen(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${cronSecret}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;
    const missing = [
      !vapidPublic && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      !vapidPrivate && "VAPID_PRIVATE_KEY",
      !vapidSubject && "VAPID_SUBJECT",
      !adminConfigured && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    if (missing.length) {
      return Response.json(
        { error: `Reminder cron not configured: set ${missing.join(", ")} in Vercel.` },
        { status: 500 }
      );
    }
    webpush.setVapidDetails(vapidSubject!, vapidPublic!, vapidPrivate!);

    const today = todayInCopenhagen();
    if (!DATE_RE.test(today)) {
      return Response.json({ error: "Could not compute today's date" }, { status: 500 });
    }

    const db = getSupabaseAdmin();
    const { data: subs, error: subsError } = await db
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth");
    if (subsError) return Response.json({ error: subsError.message }, { status: 500 });
    if (!subs || subs.length === 0) {
      return Response.json({ sent: 0, skipped: 0, removed: 0, note: "No subscriptions" });
    }

    const userIds = [...new Set(subs.map((s) => s.user_id))];
    const { data: activities, error: actError } = await db
      .from("activities")
      .select("user_id, title, done")
      .eq("date", today)
      .in("user_id", userIds);
    if (actError) return Response.json({ error: actError.message }, { status: 500 });

    const undoneCountByUser = new Map<string, number>();
    for (const a of activities ?? []) {
      if (a.done) continue;
      undoneCountByUser.set(a.user_id, (undoneCountByUser.get(a.user_id) ?? 0) + 1);
    }

    let sent = 0;
    let skipped = 0;
    let removed = 0;

    for (const sub of subs) {
      const undone = undoneCountByUser.get(sub.user_id) ?? 0;
      if (undone === 0) {
        skipped++;
        continue;
      }

      const payload = JSON.stringify({
        title: "Still open today",
        body:
          undone === 1
            ? "1 activity isn't crossed off yet."
            : `${undone} activities aren't crossed off yet.`,
        tag: "waypoint-daily-reminder",
        url: "/",
      });

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (e) {
        /* 404/410 means the browser dropped the subscription (uninstalled,
           permission revoked, etc.) — clean it up so future runs don't keep
           paying for a dead endpoint. Any other error is left alone; it
           might be transient. */
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
        }
      }
    }

    return Response.json({ sent, skipped, removed });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
