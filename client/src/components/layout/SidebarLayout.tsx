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
  Building2,
  Star,
  FileText,
  ClipboardList,
  Award,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/lib/theme-context";
import DateTimePrayerBar from "@/components/DateTimePrayerBar";
import {
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
  startNotificationPolling,
  stopNotificationPolling,
  showLocalNotification,
} from "@/lib/notifications";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/daily", label: "واجبات اليوم", icon: CalendarCheck, roles: ["admin", "teacher", "supervisor"] },
  { href: "/mosques", label: "إدارة الجوامع", icon: Building2, roles: ["admin"] },
  { href: "/users", label: "جميع المستخدمين", icon: Users, roles: ["admin"] },
  { href: "/reports", label: "التقارير والإحصائيات", icon: BarChart3, roles: ["admin", "supervisor"] },
  { href: "/students", label: "الطلاب", icon: Users, roles: ["admin", "teacher", "supervisor"] },
  { href: "/teachers", label: "الأساتذة", icon: GraduationCap, roles: ["admin", "supervisor"] },
  { href: "/assignments", label: "الواجبات والامتحانات", icon: ClipboardList, roles: ["admin", "teacher", "supervisor", "student"] },
  { href: "/ratings", label: "التقييمات والأوسمة", icon: Star, roles: ["admin", "teacher", "supervisor", "student"] },
  { href: "/courses", label: "الدورات والشهادات", icon: Award, roles: ["admin", "teacher", "supervisor", "student"] },
  { href: "/quran", label: "المصحف والحفظ", icon: BookOpen, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/library", label: "المكتبة الإسلامية", icon: Library, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/id-cards", label: "الهويات (QR)", icon: QrCode, roles: ["admin"], permission: "canPrintIds" as const },
  { href: "/scan-qr", label: "مسح QR", icon: Scan, roles: ["admin", "supervisor", "teacher"] },
  { href: "/teacher-activities", label: "أنشطة الأساتذة", icon: ClipboardList, roles: ["admin", "supervisor"] },
  { href: "/activity-logs", label: "سجّل الحركات", icon: Activity, roles: ["admin"] },
  { href: "/notifications", label: "الإشعارات", icon: Bell, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["admin", "teacher", "student", "supervisor"] },
];

function NavContent({ user, location, onNavigate }: { user: any; location: string; onNavigate?: () => void }) {
  const filteredNav = navItems.filter((item) => {
    if (!item.roles.includes(user.role)) {
      if (item.permission === "canPrintIds" && user.canPrintIds) {
        return true;
      }
      return false;
    }
    return true;
  });

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
  const { isDark, toggleDark } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(() => isNotificationsEnabled());

  const togglePushNotifications = useCallback(async () => {
    if (pushEnabled) {
      setNotificationsEnabled(false);
      stopNotificationPolling();
      setPushEnabled(false);
    } else {
      const permission = getNotificationPermission();
      if (permission === "unsupported") return;
      
      if (permission !== "granted") {
        const granted = await requestNotificationPermission();
        if (!granted) return;
      }
      
      setNotificationsEnabled(true);
      startNotificationPolling();
      setPushEnabled(true);
      showLocalNotification("مُتْقِن", "تم تفعيل الإشعارات الخارجية بنجاح", "mutqin-enabled");
    }
  }, [pushEnabled]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (!user) return <div className="p-4">Please log in</div>;

  const SidebarHeader = () => (
    <div className="p-4 sm:p-6 border-b border-sidebar-border/50 shrink-0">
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="مُتْقِن" className="w-11 h-11 rounded-full shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-2xl leading-none">مُتْقِن</h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">نظام إدارة حلقات التحفيظ</p>
        </div>
      </div>
      {user?.mosqueName && (
        <div className="mt-3 px-2 py-1.5 bg-accent/10 rounded-md border border-accent/20 flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-xs text-sidebar-foreground/80 truncate" data-testid="text-mosque-name">{user.mosqueName}</span>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {user.avatar ? (
            <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full border border-sidebar-border shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full border border-sidebar-border shrink-0 bg-primary/20 flex items-center justify-center text-primary-foreground font-bold text-xs">
              {user.name?.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{
              user.role === "admin" ? "مدير النظام" :
              user.role === "supervisor" ? "مشرف" :
              user.role === "teacher" ? "أستاذ" : "طالب"
            }</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="shrink-0 text-red-400 hover:text-red-300 hover:bg-red-900/30"
          title="تسجيل الخروج"
          data-testid="button-logout-top"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const SidebarFooter = () => (
    <div className="p-3 sm:p-4 border-t border-sidebar-border/50 shrink-0 space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={togglePushNotifications}
        className={`w-full border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${pushEnabled ? 'bg-green-900/30 border-green-700/50 text-green-400' : 'bg-sidebar-accent/20'}`}
        data-testid="button-toggle-push"
      >
        {pushEnabled ? <Bell className="w-4 h-4 ml-2" /> : <Bell className="w-4 h-4 ml-2 opacity-50" />}
        {pushEnabled ? "الإشعارات الخارجية: مفعّلة" : "تفعيل الإشعارات الخارجية"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleDark}
        className="w-full bg-sidebar-accent/20 border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        {isDark ? <Sun className="w-4 h-4 ml-2" /> : <Moon className="w-4 h-4 ml-2" />}
        {isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans" dir="rtl">
      <div className="md:hidden fixed top-0 right-0 left-0 z-50 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="مُتْقِن" className="w-8 h-8 rounded-full" />
          <span className="font-bold text-lg">مُتْقِن</span>
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

      <aside className="w-64 bg-sidebar text-sidebar-foreground hidden md:flex flex-col border-l border-sidebar-border shadow-xl z-10 overflow-y-auto sticky top-0 h-screen">
        <SidebarHeader />
        <NavContent user={user} location={location} />
        <SidebarFooter />
      </aside>

      <main className="flex-1 overflow-auto bg-background bg-islamic-pattern pt-14 md:pt-0 min-w-0 flex flex-col min-h-screen">
        <DateTimePrayerBar />
        <div className="flex-1">
          {children}
        </div>
        <footer className="text-center py-4 border-t bg-muted/30 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">النظام وقف لله تعالى</p>
          <p>برمجة وتطوير أحمد خالد الزبيدي</p>
        </footer>
      </main>
    </div>
  );
}
