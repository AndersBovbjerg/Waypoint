/* Web Push needs a service worker to receive the push event even when the
   app isn't open — that's the whole reason this file exists, distinct from
   the in-tab Notification calls in components/notify.ts. Kept deliberately
   tiny: no caching, no offline support, just push-in / notification-out. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Waypoint", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Waypoint";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "waypoint-reminder",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
