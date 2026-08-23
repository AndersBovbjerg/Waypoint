/* Turning the daily reminder on/off. Distinct from notify.ts: that fires an
   in-tab Notification while the app is open; this subscribes the device to
   Web Push, which the /api/cron/reminder route can wake up at 17:00 even
   with the app closed. Only ever runs in the browser — every export bails
   out quietly (returns false/null) rather than throwing, since this is a
   nicety layered on top of an app that works fine without it. */

import { getSupabase } from "./supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export const pushSupported =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  Boolean(VAPID_PUBLIC_KEY);

/* PushManager wants the VAPID key as a raw byte array, not the base64url
   string it's issued as. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getRegistration() {
  if (!pushSupported) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function currentPushSubscription() {
  const reg = await getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function enableReminders(userId: string): Promise<boolean> {
  if (!pushSupported) return false;
  if (Notification.permission === "denied") return false;

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await getRegistration();
  if (!reg) return false;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    }));

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const { error } = await getSupabase().from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  return !error;
}

export async function disableReminders(): Promise<void> {
  const sub = await currentPushSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await getSupabase().from("push_subscriptions").delete().eq("endpoint", endpoint);
}
