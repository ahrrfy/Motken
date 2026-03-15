import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { isNotificationsEnabled, setNotificationsEnabled, startNotificationPolling, stopNotificationPolling } from "@/lib/notifications";
import { hapticLight } from "@/lib/haptic";
import {
  LayoutDashboard, BookOpen, ClipboardList, Bell, Users, CalendarCheck,
  MessageSquare, Star, BarChart3, GraduationCap, Trophy, Settings, LogOut,
  Award, Library, Brain, Sparkles, Gift, Clock, Shield,
  AlertTriangle, HeartHandshake, Pen, Share2, QrCode, Eye, UserCircle,
  MapPin, Lightbulb, X, Building2, UserCog, ArrowUpDown,
  Moon, Sun, Languages, ArrowLeftRight, EyeOff, Download, BellRing, MessageSquareQuote
} from "lucide-react";

interface MobileSidebarProps { open: boolean; onClose: () => void; }

const allNavItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["admin","teacher","student","supervisor"] },
  { href: "/daily", label: "واجبات اليوم", icon: CalendarCheck, roles: ["admin","teacher","supervisor"] },
  { href: "/students", label: "الطلاب", icon: Users, roles: ["admin","teacher","supervisor"], group: "people" },
  { href: "/teachers", label: "الأساتذة", icon: GraduationCap, roles: ["admin","supervisor"], group: "people" },
  { href: "/supervisors", label: "المشرفون", icon: UserCircle, roles: ["admin"], group: "people" },
  { href: "/users", label: "جميع المستخدمين", icon: Users, roles: ["admin"], group: "people" },
  { href: "/assignments", label: "الواجبات والامتحانات", icon: ClipboardList, roles: ["admin","teacher","supervisor","student"], group: "edu" },
  { href: "/quran", label: "المصحف والحفظ", icon: BookOpen, roles: ["admin","teacher","student","supervisor"], group: "edu" },
  { href: "/courses", label: "الدورات والتخرج", icon: Award, roles: ["admin","teacher","supervisor","student"], group: "edu", featureKey: "courses" },
  { href: "/library", label: "المكتبة الإسلامية", icon: Library, roles: ["admin","teacher","student","supervisor"], group: "edu", featureKey: "library" },
  { href: "/knowledge-base", label: "موسوعة التجويد", icon: Brain, roles: ["admin","teacher","student","supervisor"], group: "edu", featureKey: "knowledge_base" },
  { href: "/educational-content", label: "المحتوى التعليمي", icon: Sparkles, roles: ["admin","teacher","student","supervisor"], group: "edu", featureKey: "educational_content" },
  { href: "/attendance", label: "الحضور والغياب", icon: CalendarCheck, roles: ["admin","teacher","supervisor"], group: "track", featureKey: "attendance" },
  { href: "/points-rewards", label: "النقاط والمكافآت", icon: Gift, roles: ["admin","teacher","student","supervisor"], group: "track", featureKey: "points_rewards" },
  { href: "/ratings", label: "التقييمات والأوسمة", icon: Star, roles: ["admin","teacher","supervisor","student"], group: "track", featureKey: "ratings" },
  { href: "/schedules", label: "جدول الحلقات", icon: Clock, roles: ["admin","teacher","supervisor"], group: "track", featureKey: "schedules" },
  { href: "/competitions", label: "المسابقات القرآنية", icon: Trophy, roles: ["admin","teacher","supervisor","student"], group: "track", featureKey: "competitions" },
  { href: "/messages", label: "المحادثات", icon: MessageSquare, roles: ["admin","teacher","student","supervisor"], group: "comm", featureKey: "messaging" },
  { href: "/notifications", label: "الإشعارات", icon: Bell, roles: ["admin","teacher","student","supervisor"], group: "comm" },
  { href: "/smart-alerts", label: "التنبيهات الذكية", icon: AlertTriangle, roles: ["admin","supervisor","teacher"], group: "comm", featureKey: "smart_alerts" },
  { href: "/parent-portal", label: "بوابة ولي الأمر", icon: UserCog, roles: ["admin","teacher","supervisor"], group: "comm", featureKey: "parent_portal" },
  { href: "/family-system", label: "نظام الأسرة", icon: HeartHandshake, roles: ["admin","supervisor","teacher"], group: "comm", featureKey: "family_system" },
  { href: "/whiteboard", label: "السبورة التفاعلية", icon: Pen, roles: ["admin","supervisor","teacher"], group: "comm", featureKey: "whiteboard" },
  { href: "/spread", label: "انشر النظام", icon: Share2, roles: ["admin","supervisor","teacher"], group: "comm" },
  { href: "/mosques", label: "الجوامع والمراكز", icon: Building2, roles: ["admin"], group: "admin" },
  { href: "/floor-plan", label: "المخطط البصري", icon: MapPin, roles: ["admin","supervisor","teacher"], group: "admin", featureKey: "floor_plan" },
  { href: "/reports", label: "التقارير والإحصائيات", icon: BarChart3, roles: ["admin","supervisor"], group: "admin" },
  { href: "/id-cards", label: "الهويات ومسح QR", icon: QrCode, roles: ["admin"], group: "admin", permission: "canPrintIds" as const, featureKey: "id_cards" },
  { href: "/monitoring", label: "المراقبة والأمان", icon: Eye, roles: ["admin"], group: "admin" },
  { href: "/teacher-activities", label: "أنشطة الأساتذة", icon: ClipboardList, roles: ["admin","supervisor"], group: "admin" },
  { href: "/feature-control", label: "التحكم بالمميزات", icon: Shield, roles: ["admin"], group: "admin" },
  { href: "/testimonials-manage", label: "آراء المستخدمين", icon: MessageSquareQuote, roles: ["admin"], group: "admin" },
  { href: "/crisis-management", label: "إدارة الأزمات", icon: AlertTriangle, roles: ["admin","supervisor"], group: "admin", featureKey: "crisis_management" },
  { href: "/institutional", label: "التكامل المؤسسي", icon: ArrowUpDown, roles: ["admin","supervisor"], group: "admin", featureKey: "institutional" },
  { href: "/maintenance", label: "الملاحظات والتحسين", icon: Lightbulb, roles: ["admin","supervisor","teacher","student"], group: "admin" },
  { href: "/changelog", label: "سجل التغييرات", icon: Sparkles, roles: ["admin","supervisor","teacher","student"], group: "admin" },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["admin","teacher","student","supervisor"], group: "admin" },
];

const groupLabels: Record<string,string> = {
  people:"الأفراد", edu:"التعليم والحفظ", track:"المتابعة", comm:"التواصل", admin:"الإدارة"
};

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const { user, effectiveRole, logout, switchRole, previewRole, stopPreview } = useAuth();
  const { isDark, toggleDark, language, setLanguage } = useTheme();
  const [location] = useLocation();
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [pushEnabled, setPushEnabled] = useState(() => isNotificationsEnabled());
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const role = effectiveRole || user?.role || "student";

  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff > 10) {
      setSwipeOffset(Math.min(diff, 300));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isSwiping.current = false;
    if (swipeOffset > 100) {
      onClose();
    }
    setSwipeOffset(0);
  }, [swipeOffset, onClose]);

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

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }
    const onReady = () => setCanInstall(true);
    window.addEventListener("pwaInstallReady", onReady);
    if ((window as any).__pwaInstallPrompt?.()) setCanInstall(true);
    return () => window.removeEventListener("pwaInstallReady", onReady);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = (window as any).__pwaInstallPrompt?.();
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      setCanInstall(false);
      setIsInstalled(true);
    }
  }, []);

  const togglePush = useCallback(async () => {
    if (pushEnabled) {
      setNotificationsEnabled(false);
      stopNotificationPolling();
      setPushEnabled(false);
    } else {
      setNotificationsEnabled(true);
      startNotificationPolling();
      setPushEnabled(true);
    }
  }, [pushEnabled]);

  const roleStyles = {
    admin: { pill: "text-emerald-400 bg-emerald-500/20", active: "text-emerald-400 bg-emerald-500/15 font-semibold", headerGradient: "from-emerald-600/90 via-emerald-700/80 to-emerald-900/90", avatarRing: "ring-emerald-500/40" },
    supervisor: { pill: "text-purple-400 bg-purple-500/20", active: "text-purple-400 bg-purple-500/15 font-semibold", headerGradient: "from-purple-600/90 via-purple-700/80 to-purple-900/90", avatarRing: "ring-purple-500/40" },
    teacher: { pill: "text-teal-400 bg-teal-500/20", active: "text-teal-400 bg-teal-500/15 font-semibold", headerGradient: "from-teal-600/90 via-teal-700/80 to-teal-900/90", avatarRing: "ring-teal-500/40" },
    student: { pill: "text-sky-400 bg-sky-500/20", active: "text-sky-400 bg-sky-500/15 font-semibold", headerGradient: "from-sky-600/90 via-sky-700/80 to-sky-900/90", avatarRing: "ring-sky-500/40" },
  }[role] || { pill: "text-emerald-400 bg-emerald-500/20", active: "text-emerald-400 bg-emerald-500/15 font-semibold", headerGradient: "from-emerald-600/90 via-emerald-700/80 to-emerald-900/90", avatarRing: "ring-emerald-500/40" };

  const roleLabel = previewRole
    ? { admin:"معاينة: مدير", supervisor:"معاينة: مشرف", teacher:"معاينة: أستاذ", student:"معاينة: طالب" }[previewRole] || ""
    : { admin:"مدير النظام", supervisor:"مشرف", teacher:"أستاذ", student:"طالب" }[role] || "";

  const visibleItems = allNavItems.filter(i => {
    if (!i.roles.includes(role)) {
      if ("permission" in i && i.permission === "canPrintIds" && user?.canPrintIds) {
        return true;
      }
      return false;
    }
    if ("featureKey" in i && i.featureKey && !enabledFeatures.includes(i.featureKey)) {
      return false;
    }
    return true;
  });
  const topItems = visibleItems.filter(i => !i.group);
  const grouped = ["people","edu","track","comm","admin"].map(g => ({
    group: g, label: groupLabels[g], items: visibleItems.filter(i => i.group === g),
  })).filter(g => g.items.length > 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={sidebarRef}
        className="relative w-72 max-w-[85vw] bg-card border-l border-border/50 shadow-2xl overflow-y-auto flex flex-col transition-transform duration-200"
        style={{ transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={cn("sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-l shadow-lg", roleStyles.headerGradient)}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="متقن" className="w-9 h-9 rounded-xl shadow-sm" />
            <div>
              <p className="font-bold text-sm text-white">نظام متقن</p>
              <p className="text-xs text-white/60">إدارة حلقات التحفيظ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/10 active:bg-white/20 text-white/80 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 text-center text-[10px] text-muted-foreground/60 border-b border-border/30">
          اسحب لليمين لإغلاق القائمة
        </div>

        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className={cn("w-10 h-10 rounded-full object-cover ring-2", roleStyles.avatarRing)} />
            ) : (
              <div className={cn("w-10 h-10 rounded-full bg-accent flex items-center justify-center text-lg font-bold ring-2", roleStyles.avatarRing)}>
                {user?.name?.charAt(0) || "؟"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{user?.name}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", roleStyles.pill)}>{roleLabel}</span>
            </div>
          </div>
          {user?.mosqueName && <p className="text-xs text-muted-foreground mt-2 pr-1">🕌 {user.mosqueName}</p>}
        </div>

        <div className="p-2">
          {topItems.map(item => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => { hapticLight(); onClose(); }}>
                <button className={cn("w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 text-right min-h-[44px]",
                  isActive ? roleStyles.active : "text-foreground/80 hover:bg-accent active:bg-accent/80")}>
                  <Icon className="w-5 h-5 flex-shrink-0" />{item.label}
                </button>
              </Link>
            );
          })}
        </div>
        {grouped.map(({ group, label, items }) => (
          <div key={group} className="px-2 pb-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2">{label}</p>
            {items.map(item => {
              const Icon = item.icon;
              const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
              return (
                <Link key={item.href} href={item.href} onClick={() => { hapticLight(); onClose(); }}>
                  <button className={cn("w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 text-right min-h-[44px]",
                    isActive ? roleStyles.active : "text-foreground/80 hover:bg-accent active:bg-accent/80")}>
                    <Icon className="w-5 h-5 flex-shrink-0" />{item.label}
                  </button>
                </Link>
              );
            })}
          </div>
        ))}

        <div className="sticky bottom-0 border-t border-border/50 bg-card/95 backdrop-blur mt-auto">
          <div className="p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <button onClick={() => { hapticLight(); toggleDark(); }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-colors bg-accent/50 hover:bg-accent active:bg-accent/80 min-h-[44px]">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDark ? "فاتح" : "داكن"}
              </button>
              <button onClick={() => { hapticLight(); setLanguage(language === "ar" ? "en" : "ar"); }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-colors bg-accent/50 hover:bg-accent active:bg-accent/80 min-h-[44px]">
                <Languages className="w-4 h-4" />
                {language === "ar" ? "English" : "عربي"}
              </button>
            </div>

            <button onClick={() => { hapticLight(); togglePush(); }}
              className={cn("w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-colors min-h-[44px]",
                pushEnabled ? "bg-green-500/15 text-green-400" : "bg-accent/50 hover:bg-accent text-muted-foreground")}>
              <BellRing className="w-4 h-4" />
              {pushEnabled ? "الإشعارات: مفعّلة" : "تفعيل الإشعارات"}
            </button>

            {canInstall && !isInstalled && (
              <button onClick={handleInstall}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors animate-pulse min-h-[44px]">
                <Download className="w-4 h-4" />
                تثبيت التطبيق
              </button>
            )}

            {!previewRole && (user?.actualRole === "supervisor" || user?.role === "supervisor") && (
              <button onClick={() => { hapticLight(); switchRole(); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-colors min-h-[44px]">
                <ArrowLeftRight className="w-4 h-4" />
                {effectiveRole === "teacher" ? "العودة لوضع المشرف" : "التبديل لوضع الأستاذ"}
              </button>
            )}

            {previewRole && (
              <button onClick={() => { hapticLight(); stopPreview(); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors min-h-[44px]">
                <EyeOff className="w-4 h-4" />
                إيقاف المعاينة
              </button>
            )}

            <button onClick={() => { hapticLight(); logout(); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors min-h-[44px]">
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
