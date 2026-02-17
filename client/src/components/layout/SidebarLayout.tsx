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
  QrCode,
  CalendarCheck,
  Bell,
  Activity,
  UserCircle,
  Menu,
  Building2,
  Star,
  ClipboardList,
  Award,
  Wifi,
  ArrowLeftRight,
  MessageSquare,
  Trophy,
  Clock,
  AlertTriangle,
  Shield,
  UserCog,
  Gift,
  ChevronDown,
  ChevronLeft,
  Home,
  UsersRound,
  BookMarked,
  Eye,
  Megaphone,
  Wrench,
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

interface NavItem {
  href: string;
  label: string;
  labelEn: string;
  icon: any;
  roles: string[];
  featureKey?: string;
  permission?: "canPrintIds";
}

interface NavCategory {
  id: string;
  label: string;
  labelEn: string;
  icon: any;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navCategories: NavCategory[] = [
  {
    id: "main",
    label: "الرئيسية",
    labelEn: "Main",
    icon: Home,
    defaultOpen: true,
    items: [
      { href: "/dashboard", label: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student", "supervisor"] },
      { href: "/daily", label: "واجبات اليوم", labelEn: "Daily Tasks", icon: CalendarCheck, roles: ["admin", "teacher", "supervisor"] },
    ],
  },
  {
    id: "people",
    label: "إدارة المستخدمين",
    labelEn: "People Management",
    icon: UsersRound,
    items: [
      { href: "/students", label: "الطلاب", labelEn: "Students", icon: Users, roles: ["admin", "teacher", "supervisor"] },
      { href: "/teachers", label: "الأساتذة", labelEn: "Teachers", icon: GraduationCap, roles: ["admin", "supervisor"] },
      { href: "/supervisors", label: "المشرفون", labelEn: "Supervisors", icon: UserCircle, roles: ["admin"] },
      { href: "/users", label: "جميع المستخدمين", labelEn: "All Users", icon: Users, roles: ["admin"] },
    ],
  },
  {
    id: "education",
    label: "التعليم والحفظ",
    labelEn: "Education & Memorization",
    icon: BookMarked,
    items: [
      { href: "/assignments", label: "الواجبات والامتحانات", labelEn: "Assignments & Exams", icon: ClipboardList, roles: ["admin", "teacher", "supervisor", "student"] },
      { href: "/quran", label: "المصحف والحفظ", labelEn: "Quran Tracker", icon: BookOpen, roles: ["admin", "teacher", "student", "supervisor"] },
      { href: "/courses", label: "الدورات والشهادات", labelEn: "Courses & Certificates", icon: Award, roles: ["admin", "teacher", "supervisor", "student"] },
      { href: "/library", label: "المكتبة الإسلامية", labelEn: "Islamic Library", icon: Library, roles: ["admin", "teacher", "student", "supervisor"] },
    ],
  },
  {
    id: "tracking",
    label: "المتابعة والتقييم",
    labelEn: "Tracking & Evaluation",
    icon: BarChart3,
    items: [
      { href: "/attendance", label: "الحضور والغياب", labelEn: "Attendance", icon: CalendarCheck, roles: ["admin", "teacher", "supervisor"], featureKey: "attendance" },
      { href: "/points-rewards", label: "النقاط والمكافآت", labelEn: "Points & Rewards", icon: Gift, roles: ["admin", "teacher", "student", "supervisor"], featureKey: "points_rewards" },
      { href: "/ratings", label: "التقييمات والأوسمة", labelEn: "Ratings & Badges", icon: Star, roles: ["admin", "teacher", "supervisor", "student"] },
      { href: "/schedules", label: "جدول الحلقات", labelEn: "Schedules", icon: Clock, roles: ["admin", "teacher", "supervisor"], featureKey: "schedules" },
      { href: "/competitions", label: "المسابقات القرآنية", labelEn: "Competitions", icon: Trophy, roles: ["admin", "teacher", "supervisor", "student"], featureKey: "competitions" },
    ],
  },
  {
    id: "communication",
    label: "التواصل والإشعارات",
    labelEn: "Communication",
    icon: Megaphone,
    items: [
      { href: "/messages", label: "المحادثات", labelEn: "Messages", icon: MessageSquare, roles: ["admin", "teacher", "student", "supervisor"], featureKey: "messaging" },
      { href: "/notifications", label: "الإشعارات", labelEn: "Notifications", icon: Bell, roles: ["admin", "teacher", "student", "supervisor"] },
      { href: "/smart-alerts", label: "التنبيهات الذكية", labelEn: "Smart Alerts", icon: AlertTriangle, roles: ["admin", "supervisor", "teacher"], featureKey: "smart_alerts" },
      { href: "/parent-portal", label: "بوابة ولي الأمر", labelEn: "Parent Portal", icon: UserCog, roles: ["admin", "teacher", "supervisor"], featureKey: "parent_portal" },
    ],
  },
  {
    id: "admin",
    label: "الإدارة والمراقبة",
    labelEn: "Administration",
    icon: Wrench,
    items: [
      { href: "/mosques", label: "الجوامع والمراكز", labelEn: "Mosques & Centers", icon: Building2, roles: ["admin"] },
      { href: "/reports", label: "التقارير والإحصائيات", labelEn: "Reports & Stats", icon: BarChart3, roles: ["admin", "supervisor"] },
      { href: "/id-cards", label: "الهويات ومسح QR", labelEn: "ID Cards & QR", icon: QrCode, roles: ["admin"], permission: "canPrintIds" as const },
      { href: "/monitoring", label: "المراقبة والأمان", labelEn: "Monitoring & Security", icon: Eye, roles: ["admin"] },
      { href: "/teacher-activities", label: "أنشطة الأساتذة", labelEn: "Teacher Activities", icon: ClipboardList, roles: ["supervisor"] },
      { href: "/feature-control", label: "التحكم بالمميزات", labelEn: "Feature Control", icon: Shield, roles: ["admin"] },
      { href: "/settings", label: "الإعدادات", labelEn: "Settings", icon: Settings, roles: ["admin", "teacher", "student", "supervisor"] },
    ],
  },
];

function NavContent({ user, location, onNavigate, enabledFeatures }: { user: any; location: string; onNavigate?: () => void; enabledFeatures: string[] }) {
  const { language } = useTheme();
  const isEn = language === "en";

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navCategories.forEach((cat) => {
      if (cat.defaultOpen) {
        initial[cat.id] = true;
      } else {
        const hasActiveItem = cat.items.some(item => location === item.href || (location.startsWith(item.href) && item.href !== '/'));
        initial[cat.id] = hasActiveItem;
      }
    });
    return initial;
  });

  useEffect(() => {
    navCategories.forEach((cat) => {
      const hasActiveItem = cat.items.some(item => location === item.href || (location.startsWith(item.href) && item.href !== '/'));
      if (hasActiveItem) {
        setOpenCategories(prev => ({ ...prev, [cat.id]: true }));
      }
    });
  }, [location]);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filterItem = (item: NavItem) => {
    if (!item.roles.includes(user.role)) {
      if (item.permission === "canPrintIds" && user.canPrintIds) {
        return true;
      }
      return false;
    }
    if (item.featureKey && !enabledFeatures.includes(item.featureKey)) {
      return false;
    }
    return true;
  };

  return (
    <div className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto scrollbar-thin">
      {navCategories.map((category) => {
        const visibleItems = category.items.filter(filterItem);
        if (visibleItems.length === 0) return null;

        const isOpen = openCategories[category.id] ?? false;
        const hasActiveItem = visibleItems.some(item => location === item.href || (location.startsWith(item.href) && item.href !== '/'));

        return (
          <div key={category.id} className="mb-1">
            <button
              onClick={() => toggleCategory(category.id)}
              className={cn(
                "flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wide transition-colors duration-150",
                hasActiveItem
                  ? "text-accent"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground/70"
              )}
              data-testid={`category-${category.id}`}
            >
              <category.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-start truncate">{isEn ? category.labelEn : category.label}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform duration-200", isOpen ? "rotate-0" : (isEn ? "-rotate-90" : "rotate-90"))} />
            </button>

            {isOpen && (
              <div className="mt-0.5 space-y-0.5 mr-1 ml-1">
                {visibleItems.map((item) => {
                  const isActive = location === item.href || (location.startsWith(item.href) && item.href !== '/');
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150 group cursor-pointer text-[13px]",
                          isActive
                            ? "bg-accent/15 text-accent font-medium border-r-2 border-accent"
                            : "hover:bg-sidebar-accent/40 text-sidebar-foreground/75 hover:text-sidebar-foreground"
                        )}
                        data-testid={`nav-${item.href.replace('/', '')}`}
                      >
                        <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-accent" : "text-sidebar-foreground/50 group-hover:text-accent/70")} />
                        <span className="truncate">{isEn ? item.labelEn : item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, switchRole } = useAuth();
  const { isDark, toggleDark, language } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(() => isNotificationsEnabled());
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);

  useEffect(() => {
    async function loadFeatures() {
      try {
        const res = await fetch("/api/features/enabled", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setEnabledFeatures(data.enabled || []);
        }
      } catch {}
    }
    loadFeatures();
    const interval = setInterval(loadFeatures, 30000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="p-4 border-b border-sidebar-border/30 shrink-0">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="مُتْقِن" className="w-10 h-10 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-xl leading-none tracking-tight">مُتْقِن</h1>
          <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">{isEn ? "Quran Memorization System" : "نظام إدارة حلقات التحفيظ"}</p>
        </div>
      </div>
      {user?.mosqueName && (
        <div className="mt-2.5 px-2 py-1.5 bg-accent/8 rounded-md border border-accent/15 flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-[11px] text-sidebar-foreground/70 truncate" data-testid="text-mosque-name">{user.mosqueName}</span>
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {user.avatar ? (
            <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full border border-sidebar-border/50 shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full shrink-0 bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">
              {user.name?.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{
              user.role === "admin" ? (isEn ? "System Admin" : "مدير النظام") :
              user.role === "supervisor" ? (isEn ? "Supervisor" : "مشرف") :
              user.role === "teacher" ? (isEn ? "Teacher" : (user.actualRole === "supervisor" ? "أستاذ (مشرف)" : "أستاذ")) : (isEn ? "Student" : "طالب")
            }</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDark}
            className="w-7 h-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            title={isDark ? (isEn ? "Light Mode" : "الوضع الفاتح") : (isEn ? "Dark Mode" : "الوضع الداكن")}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="w-7 h-7 text-red-400/70 hover:text-red-400 hover:bg-red-900/20"
            title={isEn ? "Logout" : "تسجيل الخروج"}
            data-testid="button-logout-top"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  const SidebarFooter = () => (
    <div className="p-2.5 border-t border-sidebar-border/30 shrink-0 space-y-1.5">
      {(user?.actualRole === "supervisor" || user?.role === "supervisor") && (
        <Button
          variant="outline"
          size="sm"
          onClick={switchRole}
          className="w-full h-8 text-xs bg-amber-900/20 border-amber-700/30 text-amber-400 hover:bg-amber-800/30 hover:text-amber-300"
          data-testid="button-switch-role"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 ml-1.5" />
          {user?.role === "supervisor"
            ? (isEn ? "Teacher Mode" : "وضع الأستاذ")
            : (isEn ? "Supervisor Mode" : "وضع المشرف")}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={togglePushNotifications}
        className={cn(
          "w-full h-8 text-xs border-sidebar-border/30",
          pushEnabled
            ? "bg-green-900/20 border-green-700/30 text-green-400 hover:bg-green-800/30"
            : "bg-sidebar-accent/10 hover:bg-sidebar-accent/20 text-sidebar-foreground/60"
        )}
        data-testid="button-toggle-push"
      >
        <Bell className={cn("w-3.5 h-3.5 ml-1.5", !pushEnabled && "opacity-50")} />
        {pushEnabled
          ? (isEn ? "Push: On" : "الإشعارات: مفعّلة")
          : (isEn ? "Enable Push" : "تفعيل الإشعارات")}
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
            <NavContent user={user} location={location} onNavigate={() => setMobileOpen(false)} enabledFeatures={enabledFeatures} />
            <SidebarFooter />
          </SheetContent>
        </Sheet>
      </div>

      <aside className={cn(
        "w-64 bg-sidebar text-sidebar-foreground hidden md:flex flex-col border-sidebar-border/50 shadow-xl z-10 overflow-y-auto sticky top-0 h-screen",
        isEn ? "border-r" : "border-l"
      )}>
        <SidebarHeader />
        <NavContent user={user} location={location} enabledFeatures={enabledFeatures} />
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
