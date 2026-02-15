let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    return true;
  } catch {
    return false;
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function isNotificationsEnabled(): boolean {
  return localStorage.getItem("mutqin_push_enabled") === "true";
}

export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem("mutqin_push_enabled", enabled ? "true" : "false");
}

export async function showLocalNotification(title: string, body: string, tag?: string): Promise<void> {
  if (!isNotificationsEnabled()) return;
  if (getNotificationPermission() !== "granted") return;

  if (swRegistration) {
    await swRegistration.showNotification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: tag || "mutqin-" + Date.now(),
      dir: "rtl",
      lang: "ar",
      vibrate: [200, 100, 200],
    });
  } else if ("Notification" in window) {
    new Notification(title, {
      body,
      icon: "/favicon.png",
      dir: "rtl",
      lang: "ar",
      tag: tag || "mutqin-" + Date.now(),
    });
  }
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let lastNotificationCount = -1;

export function startNotificationPolling(onNewNotification?: (notifs: any[]) => void): void {
  if (pollingInterval) return;

  const checkNotifications = async () => {
    if (!isNotificationsEnabled()) return;
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const notifs = await res.json();
      const unreadCount = notifs.filter((n: any) => !n.isRead).length;

      if (lastNotificationCount >= 0 && unreadCount > lastNotificationCount) {
        const newNotifs = notifs
          .filter((n: any) => !n.isRead)
          .slice(0, unreadCount - lastNotificationCount);

        for (const n of newNotifs) {
          await showLocalNotification(n.title, n.message, `mutqin-${n.id}`);
        }

        if (onNewNotification) onNewNotification(newNotifs);
      }

      lastNotificationCount = unreadCount;
    } catch {}
  };

  checkNotifications();
  pollingInterval = setInterval(checkNotifications, 30000);
}

export function stopNotificationPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  lastNotificationCount = -1;
}
