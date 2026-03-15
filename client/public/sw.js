const CACHE_NAME = "mutqin-cache-v4";
const STATIC_ASSETS = [
  "/logo.png",
  "/icon-192.png",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.match(/\.(js|css)$/) && url.pathname.includes("/assets/")) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || new Response("", { status: 503 })))
    );
    return;
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === "navigate") {
          return caches.match("/offline.html");
        }
        return new Response("", { status: 503 });
      })
    )
  );
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
