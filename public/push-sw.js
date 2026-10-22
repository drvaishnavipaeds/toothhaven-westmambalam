// Imported by the generated service worker: shows closed-app staff alerts.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || "Tooth Haven Admin";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/admin-icon-192.png",
    badge: "/admin-icon-192.png",
    tag: data.tag || "th-alert",
    renotify: true,
    data: { url: data.url || "/admin/dashboard" + (data.tab ? "?tab=" + data.tab : "") },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data && event.notification.data.url || "/admin/dashboard", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (c.url.startsWith(self.location.origin) && "focus" in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
