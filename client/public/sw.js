self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "مُتْقِن", body: "لديك إشعار جديد", icon: "/favicon.png", tag: "mutqin" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {}

  const options = {
    body: data.body,
    icon: data.icon || "/favicon.png",
    badge: "/favicon.png",
    tag: data.tag || "mutqin-notification",
    dir: "rtl",
    lang: "ar",
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: data,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
        clients[0].navigate("/notifications");
      } else {
        self.clients.openWindow("/notifications");
      }
    })
  );
});
