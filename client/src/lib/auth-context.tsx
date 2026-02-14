import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type UserRole = "admin" | "teacher" | "student" | "supervisor";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const mockUsers: Record<UserRole, User> = {
  admin: { id: "1", name: "د. عبد الله (المدير)", role: "admin", avatar: "https://i.pravatar.cc/150?u=admin" },
  teacher: { id: "2", name: "الشيخ أحمد (أستاذ)", role: "teacher", avatar: "https://i.pravatar.cc/150?u=teacher" },
  student: { id: "3", name: "عمر خالد (طالب)", role: "student", avatar: "https://i.pravatar.cc/150?u=student" },
  supervisor: { id: "4", name: "المشرف محمد", role: "supervisor", avatar: "https://i.pravatar.cc/150?u=supervisor" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("huffaz_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (role: UserRole) => {
    const newUser = mockUsers[role];
    setUser(newUser);
    localStorage.setItem("huffaz_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("huffaz_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
