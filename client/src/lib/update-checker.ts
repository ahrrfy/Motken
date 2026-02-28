let knownVersion: string | null = null;
let updateAvailable = false;
let checkInterval: ReturnType<typeof setInterval> | null = null;
let listeners: Array<() => void> = [];

export function onUpdateAvailable(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function isUpdateAvailable(): boolean {
  return updateAvailable;
}

async function checkForUpdate() {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (!knownVersion) {
      knownVersion = data.version;
      return;
    }
    if (data.version !== knownVersion) {
      updateAvailable = true;
      listeners.forEach((cb) => cb());
    }
  } catch {}
}

export function startUpdateChecker() {
  if (checkInterval) return;
  checkForUpdate();
  checkInterval = setInterval(checkForUpdate, 5 * 60 * 1000);
}

export function stopUpdateChecker() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

export function applyUpdate() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    });
  }
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
  window.location.reload();
}
