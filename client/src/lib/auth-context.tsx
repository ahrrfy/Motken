import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";

export type UserRole = "admin" | "teacher" | "student" | "supervisor" | "parent";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  actualRole?: UserRole;
  mosqueId?: string | null;
  mosqueName?: string | null;
  phone?: string;
  address?: string;
  avatar?: string;
  gender?: string | null;
  isActive?: boolean;
  canPrintIds?: boolean;
  acceptedPrivacyPolicy?: boolean;
  privacyPolicyAcceptedAt?: string | null;
  teacherId?: string | null;
}

export type PreviewRole = UserRole | null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  switchRole: () => void;
  refreshUser: () => Promise<void>;
  previewRole: PreviewRole;
  startPreview: (role: PreviewRole) => Promise<void>;
  stopPreview: () => Promise<void>;
  effectiveRole: UserRole | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewRole, setPreviewRole] = useState<PreviewRole>(null);
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
    setPreviewRole(null);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setLocation("/");
  };

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.message) {
          setUser(data);
        }
      }
    } catch {}
  };

  const switchRole = () => {
    if (!user) return;
    const actualRole = user.actualRole || user.role;
    if (actualRole !== "supervisor") return;

    if (user.role === "supervisor") {
      setUser({ ...user, role: "teacher", actualRole: "supervisor" });
    } else {
      setUser({ ...user, role: "supervisor", actualRole: "supervisor" });
    }
  };

  const startPreview = async (role: PreviewRole) => {
    if (!role) return;
    try {
      const res = await fetch("/api/auth/preview-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setPreviewRole(role);
        // Reload all data with new role
        window.location.reload();
      }
    } catch {}
  };

  const stopPreview = async () => {
    try {
      await fetch("/api/auth/stop-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      setPreviewRole(null);
      window.location.reload();
    } catch {}
  };

  const effectiveRole = previewRole || user?.role;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchRole, refreshUser, previewRole, startPreview, stopPreview, effectiveRole }}>
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
