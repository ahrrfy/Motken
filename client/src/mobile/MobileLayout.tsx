import { ReactNode, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { hapticLight, hapticSuccess } from "@/lib/haptic";
import MobileGlobalSearch from "./MobileGlobalSearch";
import {
  LayoutDashboard, BookOpen, ClipboardList, Bell, Menu, Search, Loader2,
  CalendarCheck, Users, MessageSquare, Star, BarChart3, GraduationCap, Building2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  onMenuOpen: () => void;
}

export default function MobileLayout({ children, onMenuOpen }: MobileLayoutProps) {
  const { user, effectiveRole } = useAuth();
  const [location] = useLocation();
  const role = effectiveRole || user?.role;
  const [searchOpen, setSearchOpen] = useState(false);
  const queryClient = useQueryClient();

  const onRefresh = useCallback(async () => {
    hapticSuccess();
    await queryClient.invalidateQueries();
    await new Promise(r => setTimeout(r, 400));
  }, [queryClient]);

  // السحب للتحديث فقط في الصفحة الرئيسية ولوحة التحكم
  const isHomePage = location === "/" || location === "/dashboard" || location === "/daily";
  const { containerRef, pullDistance, refreshing, isTriggered } = usePullRefresh({
    onRefresh,
    threshold: 70,
    enabled: isHomePage,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000,
    enabled: !!user,
  });
  const unread = unreadData?.count || 0;

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
    enabled: !!user,
  });
  const unreadNotif = notifications.filter((n: any) => !n.isRead).length;

  const navItems = (() => {
    if (role === "admin") return [
      { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
      { href: "/mosques", label: "الجوامع", icon: Building2 },
      { href: "/students", label: "الطلاب", icon: Users },
      { href: "/reports", label: "التقارير", icon: BarChart3 },
      { href: "/messages", label: "الرسائل", icon: MessageSquare, badge: unread },
      { href: "/notifications", label: "الإشعارات", icon: Bell, badge: unreadNotif },
    ];
    if (role === "supervisor") return [
      { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
      { href: "/teachers", label: "الأساتذة", icon: GraduationCap },
      { href: "/students", label: "الطلاب", icon: Users },
      { href: "/attendance", label: "الحضور", icon: CalendarCheck },
      { href: "/messages", label: "الرسائل", icon: MessageSquare, badge: unread },
      { href: "/notifications", label: "الإشعارات", icon: Bell, badge: unreadNotif },
    ];
    if (role === "teacher") return [
      { href: "/daily", label: "اليوم", icon: CalendarCheck },
      { href: "/students", label: "الطلاب", icon: Users },
      { href: "/assignments", label: "الواجبات", icon: ClipboardList },
      { href: "/quran", label: "الحفظ", icon: BookOpen },
      { href: "/messages", label: "الرسائل", icon: MessageSquare, badge: unread },
      { href: "/notifications", label: "الإشعارات", icon: Bell, badge: unreadNotif },
    ];
    if (role === "parent") return [
      { href: "/parent-dashboard", label: "أبنائي", icon: Users },
      { href: "/notifications", label: "الإشعارات", icon: Bell, badge: unreadNotif },
    ];
    return [
      { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
      { href: "/assignments", label: "الواجبات", icon: ClipboardList },
      { href: "/quran", label: "الحفظ", icon: BookOpen },
      { href: "/points-rewards", label: "النقاط", icon: Star },
      { href: "/messages", label: "الرسائل", icon: MessageSquare, badge: unread },
      { href: "/notifications", label: "الإشعارات", icon: Bell, badge: unreadNotif },
    ];
  })();

  const roleTheme = {
    admin: {
      color: "text-emerald-400",
      activeBg: "bg-emerald-500/15",
      headerGradient: "from-emerald-600/90 via-emerald-700/80 to-emerald-900/90",
      navGlow: "shadow-emerald-500/10",
      activeBar: "bg-emerald-400",
    },
    supervisor: {
      color: "text-purple-400",
      activeBg: "bg-purple-500/15",
      headerGradient: "from-purple-600/90 via-purple-700/80 to-purple-900/90",
      navGlow: "shadow-purple-500/10",
      activeBar: "bg-purple-400",
    },
    teacher: {
      color: "text-teal-400",
      activeBg: "bg-teal-500/15",
      headerGradient: "from-teal-600/90 via-teal-700/80 to-teal-900/90",
      navGlow: "shadow-teal-500/10",
      activeBar: "bg-teal-400",
    },
    student: {
      color: "text-sky-400",
      activeBg: "bg-sky-500/15",
      headerGradient: "from-sky-600/90 via-sky-700/80 to-sky-900/90",
      navGlow: "shadow-sky-500/10",
      activeBar: "bg-sky-400",
    },
    parent: {
      color: "text-amber-400",
      activeBg: "bg-amber-500/15",
      headerGradient: "from-amber-600/90 via-amber-700/80 to-amber-900/90",
      navGlow: "shadow-amber-500/10",
      activeBar: "bg-amber-400",
    },
  }[role || "student"] || {
    color: "text-emerald-400",
    activeBg: "bg-emerald-500/15",
    headerGradient: "from-emerald-600/90 via-emerald-700/80 to-emerald-900/90",
    navGlow: "shadow-emerald-500/10",
    activeBar: "bg-emerald-400",
  };

  return (
    <div className="flex flex-col min-h-screen bg-background" dir="rtl">
      <header className={cn(
        "sticky top-0 z-40 flex items-center justify-between px-3 h-12 border-b border-white/10 shadow-lg bg-gradient-to-l",
        roleTheme.headerGradient
      )} style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <button
          onClick={() => { hapticLight(); onMenuOpen(); }}
          className="p-2.5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors text-white/90 min-w-[44px] min-h-[44px] flex items-center justify-center"
          data-testid="button-mobile-menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="سِرَاجُ الْقُرْآنِ" className="w-7 h-7 rounded-lg shadow-sm" />
          <span className="font-bold text-base tracking-wide text-white">سِرَاجُ الْقُرْآنِ</span>
        </div>
        <button
          onClick={() => { hapticLight(); setSearchOpen(true); }}
          className="p-2.5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors text-white/90 min-w-[44px] min-h-[44px] flex items-center justify-center"
          data-testid="button-mobile-search"
        >
          <Search className="w-5 h-5" />
        </button>
      </header>

      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-150 bg-muted/30"
          style={{ height: `${pullDistance}px` }}
        >
          {refreshing ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <div className={cn(
              "flex flex-col items-center gap-1 transition-all duration-200",
              isTriggered ? "text-primary scale-110" : "text-muted-foreground"
            )}>
              <svg
                className={cn("w-5 h-5 transition-transform duration-200", isTriggered ? "rotate-180" : "")}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
              <span className="text-[10px] font-medium">
                {isTriggered ? "أفلت للتحديث" : "اسحب للتحديث"}
              </span>
            </div>
          )}
        </div>
      )}

      <main ref={containerRef} className="flex-1 overflow-y-auto pb-20" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "none" }}>{children}</main>

      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-card/98 border-t border-border/40",
        `shadow-[0_-4px_20px_-4px] ${roleTheme.navGlow}`
      )} style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-center justify-around h-14 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <button
                  onClick={() => hapticLight()}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl min-w-[52px] min-h-[48px] transition-colors duration-150",
                    isActive ? `${roleTheme.activeBg} ${roleTheme.color} scale-105` : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span className={cn("absolute -top-[9px] left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full transition-all duration-300", roleTheme.activeBar)} />
                  )}
                  <div className="relative">
                    <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
                    {(item as any).badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                        {(item as any).badge > 9 ? "9+" : (item as any).badge}
                      </span>
                    )}
                  </div>
                  <span className={cn("text-[10px] font-medium leading-none transition-all duration-300", isActive && "font-bold")}>{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>

      <MobileGlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
