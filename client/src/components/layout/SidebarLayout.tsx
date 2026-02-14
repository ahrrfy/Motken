import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  Moon,
  Sun,
  Library,
  CreditCard,
  QrCode,
  Scan
} from "lucide-react";
import { useEffect, useState } from "react";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  if (!user) return <div className="p-4">Please log in</div>;

  const navItems = [
    { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["admin", "teacher", "student", "supervisor"] },
    { href: "/students", label: "الطلاب", icon: Users, roles: ["admin", "teacher", "supervisor"] },
    { href: "/teachers", label: "الأساتذة", icon: GraduationCap, roles: ["admin", "supervisor"] },
    { href: "/quran", label: "المصحف والحفظ", icon: BookOpen, roles: ["admin", "teacher", "student", "supervisor"] },
    { href: "/library", label: "المكتبة الإسلامية", icon: Library, roles: ["admin", "teacher", "student", "supervisor"] },
    { href: "/reports", label: "التقارير والإحصائيات", icon: BarChart3, roles: ["admin", "supervisor"] },
    { href: "/donations", label: "التبرعات", icon: CreditCard, roles: ["admin"] },
    { href: "/id-cards", label: "الهويات (QR)", icon: QrCode, roles: ["admin", "teacher", "supervisor"] },
    { href: "/scan-qr", label: "مسح QR (أمني)", icon: Scan, roles: ["admin", "supervisor", "teacher"] },
    { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["admin", "teacher", "student", "supervisor"] },
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground hidden md:flex flex-col border-l border-sidebar-border shadow-xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-sidebar-border/50">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl border-2 border-accent">
            ح
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">الحفاظ</h1>
            <p className="text-xs text-sidebar-foreground/60 mt-1">نظام تعليمي متكامل</p>
          </div>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1">
          {filteredNav.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group cursor-pointer",
                  location === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm translate-x-[-2px]"
                    : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                )}
              >
                <item.icon className={cn("w-5 h-5", location === item.href ? "text-accent" : "text-sidebar-foreground/60 group-hover:text-accent")} />
                {item.label}
              </div>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={user.avatar} alt="User" className="w-9 h-9 rounded-full border border-sidebar-border" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate capitalize">{user.role}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsDark(!isDark)}
              className="flex-1 bg-sidebar-accent/20 border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button 
              variant="destructive" 
              size="icon" 
              onClick={logout}
              className="flex-1 bg-red-900/20 hover:bg-red-900/40 text-red-200 border-red-900/30"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background bg-islamic-pattern">
        {children}
      </main>
    </div>
  );
}
