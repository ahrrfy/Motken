import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const savedFontSize = localStorage.getItem("mutqin_font_size");
if (savedFontSize) {
  document.documentElement.style.fontSize = `${savedFontSize}px`;
}
import { AuthProvider } from "./lib/auth-context";
import { ThemeProvider } from "./lib/theme-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import ErrorBoundary from "./components/ErrorBoundary";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      if (reg) {
        setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);
      }
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }).catch(() => {});
  });
}

let deferredPrompt: any = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.dispatchEvent(new CustomEvent("pwaInstallReady"));
});

(window as any).__pwaInstallPrompt = () => deferredPrompt;
(window as any).__clearPwaPrompt = () => { deferredPrompt = null; };

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
