import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, BookOpen, ClipboardList, Bell, Menu,
  CalendarCheck, Users, MessageSquare, Star, BarChart3, GraduationCap
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

  const { data: unread = 0 } = useQuery<number>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000,
    enabled: !!user,
  });

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
    enabled: !!user,
  });
  const unreadNotif = notifications.filter((n: any) => !n.read).length;

  const navItems = (() => {
    if (role === "admin") return [
      { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
      { href: "/mosques", label: "الجوامع", icon: LayoutDashboard },
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
    return [
      { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
      { href: "/assignments", label: "الواجبات", icon: ClipboardList },
      { href: "/quran", label: "الحفظ", icon: BookOpen },
      { href: "/points-rewards", label: "النقاط", icon: Star },
      { href: "/messages", label: "الرسائل", icon: MessageSquare, badge: unread },
      { href: "/notifications", label: "الإشعارات", icon: Bell, badge: unreadNotif },
    ];
  })();

  const roleColor = {
    admin: "text-emerald-400", supervisor: "text-purple-400",
    teacher: "text-teal-400", student: "text-blue-400",
  }[role || "student"] || "text-emerald-400";

  const roleActiveBg = {
    admin: "bg-emerald-500/20", supervisor: "bg-purple-500/20",
    teacher: "bg-teal-500/20", student: "bg-blue-500/20",
  }[role || "student"] || "bg-emerald-500/20";

  return (
    <div className="flex flex-col min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-card/95 backdrop-blur border-b border-border/50 shadow-sm">
        <button onClick={onMenuOpen} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="متقن" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-base tracking-wide">متقن</span>
        </div>
        <div className="w-9" />
      </header>
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border/50 shadow-lg">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <button className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl min-w-[48px] transition-all duration-200",
                  isActive ? `${roleActiveBg} ${roleColor}` : "text-muted-foreground hover:text-foreground"
                )}>
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {(item as any).badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {(item as any).badge > 9 ? "9+" : (item as any).badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
