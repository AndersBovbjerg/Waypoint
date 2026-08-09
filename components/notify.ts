/* Browser notifications, shared by the focus timer and the weekly review.
   Every call is guarded: notifications are a nicety and must never be able to
   take the app down, and nothing here ever prompts on its own. */

export async function ensurePermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export function canNotify() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

export function notify(title: string, body: string, tag: string) {
  try {
    if (!canNotify()) return;
    new Notification(title, { body, tag, icon: "/icon.svg" });
  } catch {
    /* some browsers throw when constructing notifications outside a SW */
  }
}
