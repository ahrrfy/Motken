import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";

export type UserRole = "admin" | "teacher" | "student" | "supervisor";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  mosqueId?: string | null;
  mosqueName?: string | null;
  phone?: string;
  address?: string;
  avatar?: string;
  gender?: string | null;
  isActive?: boolean;
  canPrintIds?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data && !data.message) {
          setUser(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        return { ok: true };
      }
      return { ok: false, message: data.message || "فشل تسجيل الدخول" };
    } catch {
      return { ok: false, message: "خطأ في الاتصال بالخادم" };
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
