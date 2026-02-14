import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  Scan,
  CalendarCheck,
  Bell,
  Activity,
  UserCircle,
  Menu,
  X,
  Building2
} from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/settings?tab=profile", label: "معلومات الحساب", icon: UserCircle, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/mosques", label: "إدارة الجوامع", icon: Building2, roles: ["admin"] },
  { href: "/users", label: "جميع المستخدمين", icon: Users, roles: ["admin"] },
  { href: "/reports", label: "التقارير والإحصائيات", icon: BarChart3, roles: ["admin", "supervisor"] },
  { href: "/students", label: "الطلاب", icon: Users, roles: ["teacher", "supervisor"] },
  { href: "/teachers", label: "الأساتذة", icon: GraduationCap, roles: ["admin", "supervisor"] },
  { href: "/assignments", label: "تحديد الواجبات", icon: CalendarCheck, roles: ["teacher", "supervisor"] },
  { href: "/quran", label: "المصحف والحفظ", icon: BookOpen, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/library", label: "المكتبة الإسلامية", icon: Library, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/id-cards", label: "الهويات (QR)", icon: QrCode, roles: ["admin", "teacher", "supervisor"] },
  { href: "/scan-qr", label: "مسح QR", icon: Scan, roles: ["admin", "supervisor", "teacher"] },
  { href: "/activity-logs", label: "سجّل الحركات", icon: Activity, roles: ["admin", "supervisor"] },
  { href: "/notifications", label: "الإشعارات", icon: Bell, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["admin"] },
];

function NavContent({ user, location, onNavigate }: { user: any; location: string; onNavigate?: () => void }) {
  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
      {filteredNav.map((item) => (
        <Link key={item.href} href={item.href}>
          <div
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group cursor-pointer text-sm",
              location === item.href || (location.startsWith(item.href) && item.href !== '/')
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm translate-x-[-2px]"
                : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
            )}
          >
            <item.icon className={cn("w-5 h-5 shrink-0", location === item.href ? "text-accent" : "text-sidebar-foreground/60 group-hover:text-accent")} />
            <span className="truncate">{item.label}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (!user) return <div className="p-4">Please log in</div>;

  const SidebarHeader = () => (
    <div className="p-4 sm:p-6 flex items-center gap-3 border-b border-sidebar-border/50 shrink-0">
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl border-2 border-accent shrink-0">
        ح
      </div>
      <div className="min-w-0">
        <h1 className="font-bold text-lg leading-none">الحفاظ</h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1">نظام تعليمي متكامل</p>
      </div>
    </div>
  );

  const SidebarFooter = () => (
    <div className="p-3 sm:p-4 border-t border-sidebar-border/50 shrink-0">
      <div className="flex items-center gap-3 mb-3 px-2">
        {user.avatar ? (
          <img src={user.avatar} alt="User" className="w-9 h-9 rounded-full border border-sidebar-border shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full border border-sidebar-border shrink-0 bg-primary/20 flex items-center justify-center text-primary-foreground font-bold text-sm">
            {user.name?.charAt(0)}
          </div>
        )}
        <div className="flex-1 overflow-hidden min-w-0">
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
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans" dir="rtl">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 right-0 left-0 z-50 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm border border-accent">
            ح
          </div>
          <span className="font-bold text-sm">الحفاظ</span>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent" data-testid="button-mobile-menu">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0 bg-sidebar text-sidebar-foreground border-l-sidebar-border" dir="rtl">
            <SidebarHeader />
            <NavContent user={user} location={location} onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground hidden md:flex flex-col border-l border-sidebar-border shadow-xl z-10 overflow-y-auto sticky top-0 h-screen">
        <SidebarHeader />
        <NavContent user={user} location={location} />
        <SidebarFooter />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background bg-islamic-pattern pt-14 md:pt-0 min-w-0">
        {children}
      </main>
    </div>
  );
}
