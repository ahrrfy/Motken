import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, BookOpen, ClipboardList, Bell, Users, CalendarCheck,
  MessageSquare, Star, BarChart3, GraduationCap, Trophy, Settings, LogOut,
  Award, Library, Brain, Sparkles, BookOpenCheck, Gift, Clock, Shield,
  AlertTriangle, HeartHandshake, Pen, Share2, QrCode, Eye, UserCircle,
  MapPin, Lightbulb, X, Building2, UserCog, ArrowUpDown
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
  { href: "/courses", label: "الدورات والشهادات", icon: Award, roles: ["admin","teacher","supervisor","student"], group: "edu", featureKey: "courses" },
  { href: "/library", label: "المكتبة الإسلامية", icon: Library, roles: ["admin","teacher","student","supervisor"], group: "edu", featureKey: "library" },
  { href: "/knowledge-base", label: "موسوعة التجويد", icon: Brain, roles: ["admin","teacher","student","supervisor"], group: "edu", featureKey: "knowledge_base" },
  { href: "/educational-content", label: "المحتوى التعليمي", icon: Sparkles, roles: ["admin","teacher","student","supervisor"], group: "edu", featureKey: "educational_content" },
  { href: "/graduation", label: "التخرج والمتابعة", icon: BookOpenCheck, roles: ["admin","supervisor","teacher"], group: "edu", featureKey: "graduation" },
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
  { href: "/mosques", label: "الجوامع والمراكز", icon: Building2, roles: ["admin","supervisor"], group: "admin" },
  { href: "/floor-plan", label: "المخطط البصري", icon: MapPin, roles: ["admin","supervisor","teacher"], group: "admin", featureKey: "floor_plan" },
  { href: "/reports", label: "التقارير والإحصائيات", icon: BarChart3, roles: ["admin","supervisor"], group: "admin" },
  { href: "/id-cards", label: "الهويات ومسح QR", icon: QrCode, roles: ["admin"], group: "admin", permission: "canPrintIds" as const, featureKey: "id_cards" },
  { href: "/monitoring", label: "المراقبة والأمان", icon: Eye, roles: ["admin"], group: "admin" },
  { href: "/teacher-activities", label: "أنشطة الأساتذة", icon: ClipboardList, roles: ["supervisor"], group: "admin" },
  { href: "/feature-control", label: "التحكم بالمميزات", icon: Shield, roles: ["admin"], group: "admin" },
  { href: "/crisis-management", label: "إدارة الأزمات", icon: AlertTriangle, roles: ["admin","supervisor"], group: "admin", featureKey: "crisis_management" },
  { href: "/institutional", label: "التكامل المؤسسي", icon: ArrowUpDown, roles: ["admin","supervisor"], group: "admin", featureKey: "institutional" },
  { href: "/maintenance", label: "الملاحظات والتحسين", icon: Lightbulb, roles: ["admin","supervisor","teacher","student"], group: "admin" },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["admin","teacher","student","supervisor"], group: "admin" },
];

const groupLabels: Record<string,string> = {
  people:"الأفراد", edu:"التعليم والحفظ", track:"المتابعة", comm:"التواصل", admin:"الإدارة"
};

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const { user, effectiveRole, logout } = useAuth();
  const [location] = useLocation();
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const role = effectiveRole || user?.role || "student";

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

  const roleStyles = {
    admin: { pill: "text-emerald-400 bg-emerald-500/20", active: "text-emerald-400 bg-emerald-500/15 font-semibold", headerGradient: "from-emerald-600/90 via-emerald-700/80 to-emerald-900/90", avatarRing: "ring-emerald-500/40" },
    supervisor: { pill: "text-purple-400 bg-purple-500/20", active: "text-purple-400 bg-purple-500/15 font-semibold", headerGradient: "from-purple-600/90 via-purple-700/80 to-purple-900/90", avatarRing: "ring-purple-500/40" },
    teacher: { pill: "text-teal-400 bg-teal-500/20", active: "text-teal-400 bg-teal-500/15 font-semibold", headerGradient: "from-teal-600/90 via-teal-700/80 to-teal-900/90", avatarRing: "ring-teal-500/40" },
    student: { pill: "text-sky-400 bg-sky-500/20", active: "text-sky-400 bg-sky-500/15 font-semibold", headerGradient: "from-sky-600/90 via-sky-700/80 to-sky-900/90", avatarRing: "ring-sky-500/40" },
  }[role] || { pill: "text-emerald-400 bg-emerald-500/20", active: "text-emerald-400 bg-emerald-500/15 font-semibold", headerGradient: "from-emerald-600/90 via-emerald-700/80 to-emerald-900/90", avatarRing: "ring-emerald-500/40" };

  const roleLabel = { admin:"مدير النظام", supervisor:"مشرف", teacher:"أستاذ", student:"طالب" }[role] || "";
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
      <div className="relative w-72 max-w-[85vw] bg-card border-l border-border/50 shadow-2xl overflow-y-auto flex flex-col">
        <div className={cn("sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-l shadow-lg", roleStyles.headerGradient)}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="متقن" className="w-9 h-9 rounded-xl shadow-sm" />
            <div>
              <p className="font-bold text-sm text-white">نظام متقن</p>
              <p className="text-xs text-white/60">إدارة حلقات التحفيظ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/80"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full bg-accent flex items-center justify-center text-lg font-bold ring-2", roleStyles.avatarRing)}>
              {user?.name?.charAt(0) || "؟"}
            </div>
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
              <Link key={item.href} href={item.href} onClick={onClose}>
                <button className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-right",
                  isActive ? roleStyles.active : "text-foreground/80 hover:bg-accent")}>
                  <Icon className="w-4 h-4 flex-shrink-0" />{item.label}
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
                <Link key={item.href} href={item.href} onClick={onClose}>
                  <button className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-right",
                    isActive ? roleStyles.active : "text-foreground/80 hover:bg-accent")}>
                    <Icon className="w-4 h-4 flex-shrink-0" />{item.label}
                  </button>
                </Link>
              );
            })}
          </div>
        ))}
        <div className="sticky bottom-0 p-4 border-t border-border/50 bg-card/95 backdrop-blur mt-auto">
          <button onClick={() => { logout(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" />تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
