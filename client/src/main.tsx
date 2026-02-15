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

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);
