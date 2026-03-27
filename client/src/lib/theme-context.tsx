import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Language = "ar" | "en";

interface ThemeContextType {
  isDark: boolean;
  language: Language;
  toggleDark: () => void;
  setLanguage: (lang: Language) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("mutqin_theme");
    return saved === "dark";
  });

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("mutqin_language");
    return (saved === "en" ? "en" : "ar") as Language;
  });

  useEffect(() => {
    localStorage.setItem("mutqin_theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem("mutqin_language", language);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const toggleDark = () => setIsDark((prev) => !prev);

  const setLanguage = (lang: Language) => setLanguageState(lang);

  return (
    <ThemeContext.Provider value={{ isDark, language, toggleDark, setLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
