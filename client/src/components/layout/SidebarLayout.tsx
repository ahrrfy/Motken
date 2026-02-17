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
  Wifi,
  ArrowLeftRight,
  MessageSquare,
  Trophy,
  Clock,
  Calendar,
  AlertTriangle,
  Shield,
  UserCog,
  Gift,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/lib/theme-context";
import { t } from "@/lib/translations";
import DateTimePrayerBar from "@/components/DateTimePrayerBar";
import HadithTicker from "@/components/HadithTicker";
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
  { href: "/dashboard", label: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/daily", label: "واجبات اليوم", labelEn: "Daily Tasks", icon: CalendarCheck, roles: ["admin", "teacher", "supervisor"] },
  { href: "/mosques", label: "الجوامع ومراكز التحفيظ", labelEn: "Mosques & Centers", icon: Building2, roles: ["admin"] },
  { href: "/users", label: "جميع المستخدمين", labelEn: "All Users", icon: Users, roles: ["admin"] },
  { href: "/reports", label: "التقارير والإحصائيات", labelEn: "Reports & Statistics", icon: BarChart3, roles: ["admin", "supervisor"] },
  { href: "/students", label: "الطلاب", labelEn: "Students", icon: Users, roles: ["admin", "teacher", "supervisor"] },
  { href: "/supervisors", label: "المشرفون", labelEn: "Supervisors", icon: UserCircle, roles: ["admin"] },
  { href: "/teachers", label: "الأساتذة", labelEn: "Teachers", icon: GraduationCap, roles: ["admin", "supervisor"] },
  { href: "/assignments", label: "الواجبات والامتحانات", labelEn: "Assignments & Exams", icon: ClipboardList, roles: ["admin", "teacher", "supervisor", "student"] },
  { href: "/ratings", label: "التقييمات والأوسمة", labelEn: "Ratings & Badges", icon: Star, roles: ["admin", "teacher", "supervisor", "student"] },
  { href: "/courses", label: "الدورات والشهادات", labelEn: "Courses & Certificates", icon: Award, roles: ["admin", "teacher", "supervisor", "student"] },
  { href: "/quran", label: "المصحف والحفظ", labelEn: "Quran Tracker", icon: BookOpen, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/library", label: "المكتبة الإسلامية", labelEn: "Islamic Library", icon: Library, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/attendance", label: "الحضور والغياب", labelEn: "Attendance", icon: CalendarCheck, roles: ["admin", "teacher", "supervisor"] },
  { href: "/messages", label: "المحادثات", labelEn: "Messages", icon: MessageSquare, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/points-rewards", label: "النقاط والمكافآت", labelEn: "Points & Rewards", icon: Gift, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/schedules", label: "جدول الحلقات", labelEn: "Schedules", icon: Clock, roles: ["admin", "teacher", "supervisor"] },
  { href: "/competitions", label: "المسابقات القرآنية", labelEn: "Competitions", icon: Trophy, roles: ["admin", "teacher", "supervisor", "student"] },
  { href: "/parent-portal", label: "بوابة ولي الأمر", labelEn: "Parent Portal", icon: UserCog, roles: ["admin", "teacher", "supervisor"] },
  { href: "/smart-alerts", label: "التنبيهات الذكية", labelEn: "Smart Alerts", icon: AlertTriangle, roles: ["admin", "supervisor", "teacher"] },
  { href: "/id-cards", label: "الهويات (QR)", labelEn: "ID Cards (QR)", icon: QrCode, roles: ["admin"], permission: "canPrintIds" as const },
  { href: "/scan-qr", label: "مسح QR", labelEn: "Scan QR", icon: Scan, roles: ["admin", "supervisor", "teacher"] },
  { href: "/teacher-activities", label: "أنشطة الأساتذة", labelEn: "Teacher Activities", icon: ClipboardList, roles: ["admin", "supervisor"] },
  { href: "/online-users", label: "المتصلون الآن", labelEn: "Online Users", icon: Wifi, roles: ["admin"] },
  { href: "/activity-logs", label: "سجّل الحركات", labelEn: "Activity Logs", icon: Activity, roles: ["admin"] },
  { href: "/feature-control", label: "التحكم بالمميزات", labelEn: "Feature Control", icon: Shield, roles: ["admin"] },
  { href: "/notifications", label: "الإشعارات", labelEn: "Notifications", icon: Bell, roles: ["admin", "teacher", "student", "supervisor"] },
  { href: "/settings", label: "الإعدادات", labelEn: "Settings", icon: Settings, roles: ["admin", "teacher", "student", "supervisor"] },
];

function NavContent({ user, location, onNavigate }: { user: any; location: string; onNavigate?: () => void }) {
  const { language } = useTheme();
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
            <span className="truncate">{language === "en" ? item.labelEn : item.label}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, switchRole } = useAuth();
  const { isDark, toggleDark, language } = useTheme();
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

  const isEn = language === "en";
  const dir = isEn ? "ltr" : "rtl";

  const SidebarHeader = () => (
    <div className="p-4 sm:p-6 border-b border-sidebar-border/50 shrink-0">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="مُتْقِن" className="w-11 h-11 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-2xl leading-none">مُتْقِن</h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">{isEn ? "Quran Memorization System" : "نظام إدارة حلقات التحفيظ"}</p>
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
              user.role === "admin" ? (isEn ? "System Admin" : "مدير النظام") :
              user.role === "supervisor" ? (isEn ? "Supervisor" : "مشرف") :
              user.role === "teacher" ? (isEn ? "Teacher" : (user.actualRole === "supervisor" ? "أستاذ (مشرف)" : "أستاذ")) : (isEn ? "Student" : "طالب")
            }</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="shrink-0 text-red-400 hover:text-red-300 hover:bg-red-900/30"
          title={isEn ? "Logout" : "تسجيل الخروج"}
          data-testid="button-logout-top"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const SidebarFooter = () => (
    <div className="p-3 sm:p-4 border-t border-sidebar-border/50 shrink-0 space-y-2">
      {(user?.actualRole === "supervisor" || user?.role === "supervisor") && (
        <Button
          variant="outline"
          size="sm"
          onClick={switchRole}
          className="w-full bg-amber-900/30 border-amber-700/50 text-amber-400 hover:bg-amber-800/40 hover:text-amber-300"
          data-testid="button-switch-role"
        >
          <ArrowLeftRight className="w-4 h-4 ml-2" />
          {user?.role === "supervisor"
            ? (isEn ? "Switch to Teacher Mode" : "التبديل إلى وضع الأستاذ")
            : (isEn ? "Switch to Supervisor Mode" : "التبديل إلى وضع المشرف")}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={togglePushNotifications}
        className={`w-full border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${pushEnabled ? 'bg-green-900/30 border-green-700/50 text-green-400' : 'bg-sidebar-accent/20'}`}
        data-testid="button-toggle-push"
      >
        {pushEnabled ? <Bell className="w-4 h-4 ml-2" /> : <Bell className="w-4 h-4 ml-2 opacity-50" />}
        {pushEnabled
          ? (isEn ? "Push Notifications: On" : "الإشعارات الخارجية: مفعّلة")
          : (isEn ? "Enable Push Notifications" : "تفعيل الإشعارات الخارجية")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleDark}
        className="w-full bg-sidebar-accent/20 border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        {isDark ? <Sun className="w-4 h-4 ml-2" /> : <Moon className="w-4 h-4 ml-2" />}
        {isDark ? (isEn ? "Light Mode" : "الوضع الفاتح") : (isEn ? "Dark Mode" : "الوضع الداكن")}
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans" dir={dir}>
      <div className="md:hidden fixed top-0 right-0 left-0 z-50 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="مُتْقِن" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-lg">مُتْقِن</span>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent" data-testid="button-mobile-menu">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side={isEn ? "left" : "right"} className="w-72 p-0 bg-sidebar text-sidebar-foreground border-l-sidebar-border" dir={dir}>
            <SidebarHeader />
            <NavContent user={user} location={location} onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter />
          </SheetContent>
        </Sheet>
      </div>

      <aside className={`w-64 bg-sidebar text-sidebar-foreground hidden md:flex flex-col ${isEn ? "border-r" : "border-l"} border-sidebar-border shadow-xl z-10 overflow-y-auto sticky top-0 h-screen`}>
        <SidebarHeader />
        <NavContent user={user} location={location} />
        <SidebarFooter />
      </aside>

      <main className="flex-1 overflow-auto bg-background bg-islamic-pattern pt-14 md:pt-0 min-w-0 flex flex-col min-h-screen">
        <DateTimePrayerBar />
        <div className="flex-1">
          {children}
        </div>
        <HadithTicker />
        <footer className="text-center py-4 border-t bg-muted/30 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">{isEn ? "This system is a Waqf for Allah" : "النظام وقف لله تعالى"}</p>
          <p>{isEn ? "Developed by Ahmed Khaled Al-Zubaidi" : "برمجة وتطوير أحمد خالد الزبيدي"}</p>
        </footer>
      </main>
    </div>
  );
}
