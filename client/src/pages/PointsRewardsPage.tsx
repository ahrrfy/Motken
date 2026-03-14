import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Trophy, Star, Heart, Clock, BookOpen, Plus, Award, Medal, TrendingUp, Crown, Download, Users, Filter, MinusCircle, PlusCircle, Target, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr } from "@/lib/utils";
import { exportJsonToExcel } from "@/lib/excel-utils";

interface LeaderboardEntry {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  totalPoints: number;
}

interface PointRecord {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  category: string;
  createdAt: string;
  awardedBy?: string;
  awardedByName?: string;
  userName?: string;
}

interface BadgeRecord {
  id: string;
  userId: string;
  badgeType: string;
  badgeName: string;
  description?: string;
  createdAt: string;
  awardedBy?: string;
  awardedByName?: string;
}

interface StudentUser {
  id: string;
  name: string;
  username: string;
  level?: number;
}

const POINT_CATEGORIES = [
  { value: "assignment", label: "واجب" },
  { value: "exam", label: "امتحان" },
  { value: "behavior", label: "سلوك" },
  { value: "attendance", label: "حضور" },
  { value: "extra", label: "إضافي" },
  { value: "competition", label: "مسابقة" },
  { value: "graduation", label: "تخرج" },
  { value: "memorization", label: "حفظ" },
  { value: "participation", label: "مشاركة" },
];

const BADGE_TYPES = [
  { value: "memorization", label: "حفظ" },
  { value: "tajweed", label: "تجويد" },
  { value: "behavior", label: "سلوك" },
  { value: "attendance", label: "حضور" },
  { value: "excellence", label: "تميز" },
];

const BADGE_ICONS: Record<string, React.ElementType> = {
  memorization: BookOpen,
  tajweed: Star,
  behavior: Heart,
  attendance: Clock,
  excellence: Trophy,
};

const CATEGORY_COLORS: Record<string, string> = {
  assignment: "bg-blue-100 text-blue-700 border-blue-200",
  exam: "bg-purple-100 text-purple-700 border-purple-200",
  behavior: "bg-pink-100 text-pink-700 border-pink-200",
  attendance: "bg-green-100 text-green-700 border-green-200",
  extra: "bg-amber-100 text-amber-700 border-amber-200",
  competition: "bg-indigo-100 text-indigo-700 border-indigo-200",
  graduation: "bg-teal-100 text-teal-700 border-teal-200",
  memorization: "bg-emerald-100 text-emerald-700 border-emerald-200",
  participation: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

const BADGE_TYPE_COLORS: Record<string, string> = {
  memorization: "bg-emerald-100 text-emerald-700 border-emerald-200",
  tajweed: "bg-yellow-100 text-yellow-700 border-yellow-200",
  behavior: "bg-pink-100 text-pink-700 border-pink-200",
  attendance: "bg-blue-100 text-blue-700 border-blue-200",
  excellence: "bg-amber-100 text-amber-700 border-amber-200",
};

const POINT_RULES = [
  { action: "حضور", points: 5, icon: Clock, color: "text-green-600" },
  { action: "واجب", points: 10, icon: BookOpen, color: "text-blue-600" },
  { action: "امتحان", points: 20, icon: Target, color: "text-purple-600" },
  { action: "سلوك", points: 5, icon: Heart, color: "text-pink-600" },
  { action: "مسابقة", points: 15, icon: Trophy, color: "text-amber-600" },
  { action: "حفظ", points: 25, icon: Star, color: "text-emerald-600" },
];

const ACHIEVEMENTS = [
  { id: "hafiz", name: "الحافظ المتميز", description: "حفظ 5 أجزاء أو أكثر", icon: BookOpen, check: "memorization" },
  { id: "consistent", name: "المواظب", description: "حضور 30 يوم متتالي", icon: Clock, check: "attendance" },
  { id: "hardworker", name: "المجتهد", description: "إكمال 50 واجب أو أكثر", icon: Zap, check: "assignments" },
  { id: "star", name: "نجم الأسبوع", description: "أعلى نقاط هذا الأسبوع", icon: Crown, check: "weekly_top" },
];

function getCategoryLabel(category: string): string {
  return POINT_CATEGORIES.find(c => c.value === category)?.label || category;
}

function getBadgeTypeLabel(type: string): string {
  return BADGE_TYPES.find(b => b.value === type)?.label || type;
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getLastWeekStart(): Date {
  const ws = getWeekStart();
  ws.setDate(ws.getDate() - 7);
  return ws;
}

export default function PointsRewardsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("leaderboard");
  const [loading, setLoading] = useState(true);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [points, setPoints] = useState<PointRecord[]>([]);
  const [badges, setBadges] = useState<BadgeRecord[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);

  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isDeducting, setIsDeducting] = useState(false);
  const [pointForm, setPointForm] = useState({ userId: "", amount: "", reason: "", category: "" });
  const [badgeForm, setBadgeForm] = useState({ userId: "", badgeType: "", badgeName: "", description: "" });

  const [batchSelectedStudents, setBatchSelectedStudents] = useState<string[]>([]);
  const [batchForm, setBatchForm] = useState({ amount: "", reason: "", category: "", isDeducting: false });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterDateTo, setFilterDateTo] = useState("");

  const isStudent = user?.role === "student";
  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin" || user?.role === "supervisor";

  const fetchLeaderboard = async () => {
    try {
      const params = user?.mosqueId ? `?mosqueId=${user.mosqueId}` : "";
      const res = await fetch(`/api/points/leaderboard${params}`, { credentials: "include" });
      if (res.ok) {
        setLeaderboard(await res.json());
      }
    } catch {}
  };

  const fetchPoints = async () => {
    try {
      const res = await fetch("/api/points", { credentials: "include" });
      if (res.ok) {
        setPoints(await res.json());
      }
    } catch {}
  };

  const fetchBadges = async () => {
    try {
      const res = await fetch("/api/badges", { credentials: "include" });
      if (res.ok) {
        setBadges(await res.json());
      }
    } catch {}
  };

  const fetchStudents = async () => {
    if (!isTeacherOrAdmin) return;
    try {
      const res = await fetch("/api/users?role=student", { credentials: "include" });
      if (res.ok) {
        setStudents(await res.json());
      }
    } catch {}
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchLeaderboard(), fetchPoints(), fetchBadges(), fetchStudents()]);
      setLoading(false);
    };
    load();
  }, []);

  const handleAwardPoints = async () => {
    if (!pointForm.userId || !pointForm.amount || !pointForm.category) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const amount = parseInt(pointForm.amount);
      const finalAmount = isDeducting ? -Math.abs(amount) : Math.abs(amount);
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: pointForm.userId,
          amount: finalAmount,
          reason: pointForm.reason,
          category: pointForm.category,
        }),
      });
      if (res.ok) {
        toast({
          title: "تم بنجاح",
          description: isDeducting ? "تم خصم النقاط بنجاح" : "تم منح النقاط بنجاح",
          className: isDeducting ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800",
        });
        setPointDialogOpen(false);
        setPointForm({ userId: "", amount: "", reason: "", category: "" });
        setIsDeducting(false);
        fetchPoints();
        fetchLeaderboard();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في العملية", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchAward = async () => {
    if (batchSelectedStudents.length === 0 || !batchForm.amount || !batchForm.category) {
      toast({ title: "خطأ", description: "يرجى اختيار طلاب وملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const amount = parseInt(batchForm.amount);
      const finalAmount = batchForm.isDeducting ? -Math.abs(amount) : Math.abs(amount);
      let successCount = 0;
      let failCount = 0;
      for (const studentId of batchSelectedStudents) {
        try {
          const res = await fetch("/api/points", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              userId: studentId,
              amount: finalAmount,
              reason: batchForm.reason,
              category: batchForm.category,
            }),
          });
          if (res.ok) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }
      toast({
        title: "تم بنجاح",
        description: `تمت العملية لـ ${successCount} طالب${failCount > 0 ? ` (فشل: ${failCount})` : ""}`,
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setBatchDialogOpen(false);
      setBatchSelectedStudents([]);
      setBatchForm({ amount: "", reason: "", category: "", isDeducting: false });
      fetchPoints();
      fetchLeaderboard();
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAwardBadge = async () => {
    if (!badgeForm.userId || !badgeForm.badgeType || !badgeForm.badgeName) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: badgeForm.userId,
          badgeType: badgeForm.badgeType,
          badgeName: badgeForm.badgeName,
          description: badgeForm.description || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم منح الشارة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setBadgeDialogOpen(false);
        setBadgeForm({ userId: "", badgeType: "", badgeName: "", description: "" });
        fetchBadges();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في منح الشارة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const weekStart = getWeekStart();
  const lastWeekStart = getLastWeekStart();

  const totalPointsAwarded = useMemo(() => points.reduce((sum, p) => sum + (p.amount > 0 ? p.amount : 0), 0), [points]);
  const pointsThisWeek = useMemo(() => points.filter(p => new Date(p.createdAt) >= weekStart).reduce((sum, p) => sum + p.amount, 0), [points]);
  const totalBadgesAwarded = badges.length;
  const topStudentName = useMemo(() => leaderboard.length > 0 ? leaderboard[0].name : "—", [leaderboard]);

  const filteredPoints = useMemo(() => {
    return points.filter(p => {
      if (searchQuery) {
        const studentName = p.userName || students.find(s => s.id === p.userId)?.name || "";
        if (!studentName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      if (filterCategory !== "all" && p.category !== filterCategory) return false;
      if (filterType === "positive" && p.amount < 0) return false;
      if (filterType === "negative" && p.amount >= 0) return false;
      if (filterLevel !== "all") {
        const student = students.find(s => s.id === p.userId);
        if (student && String(student.level || 1) !== filterLevel) return false;
      }
      if (filterDateFrom) {
        const from = new Date(filterDateFrom);
        if (new Date(p.createdAt) < from) return false;
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(p.createdAt) > to) return false;
      }
      return true;
    });
  }, [points, searchQuery, filterCategory, filterType, filterDateFrom, filterDateTo, filterLevel, students]);

  const studentPointsSummary = useMemo(() => {
    const map: Record<string, { name: string; total: number; categories: Record<string, number>; thisWeek: number; lastWeek: number }> = {};
    for (const p of points) {
      const name = p.userName || students.find(s => s.id === p.userId)?.name || p.userId;
      if (!map[p.userId]) {
        map[p.userId] = { name, total: 0, categories: {}, thisWeek: 0, lastWeek: 0 };
      }
      map[p.userId].total += p.amount;
      map[p.userId].categories[p.category] = (map[p.userId].categories[p.category] || 0) + p.amount;
      const created = new Date(p.createdAt);
      if (created >= weekStart) map[p.userId].thisWeek += p.amount;
      if (created >= lastWeekStart && created < weekStart) map[p.userId].lastWeek += p.amount;
    }
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [points, students]);

  const checkAchievement = (achievementId: string): boolean => {
    switch (achievementId) {
      case "hafiz": {
        const memPoints = points.filter(p => p.category === "memorization");
        return memPoints.length >= 5;
      }
      case "consistent": {
        const attendancePoints = points.filter(p => p.category === "attendance");
        return attendancePoints.length >= 30;
      }
      case "hardworker": {
        const assignPoints = points.filter(p => p.category === "assignment");
        return assignPoints.length >= 50;
      }
      case "star": {
        if (leaderboard.length === 0) return false;
        return isStudent && leaderboard[0]?.id === user?.id;
      }
      default:
        return false;
    }
  };

  const handleExport = async () => {
    const leaderboardData = leaderboard.map((e, idx) => ({
      "المركز": idx + 1,
      "الاسم": e.name,
      "النقاط": e.totalPoints,
    }));
    const pointsData = points.map(p => ({
      "التاريخ": formatDateAr(p.createdAt),
      "النقاط": p.amount,
      "السبب": p.reason || "—",
      "التصنيف": getCategoryLabel(p.category),
      "الطالب": p.userName || students.find(s => s.id === p.userId)?.name || p.userId,
    }));
    try {
      await exportJsonToExcel(
        [...leaderboardData.map(l => ({ ...l } as Record<string, unknown>)), ...pointsData.map(p => ({ ...p } as Record<string, unknown>))],
        "النقاط والمكافآت",
        "points-report.xlsx"
      );
      toast({ title: "تم التصدير", description: "تم تصدير التقرير بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
    } catch {
      toast({ title: "خطأ", description: "فشل في تصدير التقرير", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="status-loading-points-rewards">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 ml-2" />
        <span>جاري التحميل...</span>
      </div>
    );
  }

  const totalMyPoints = points.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 page-transition" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-emerald-700" data-testid="text-page-title-points-rewards">
            النقاط والمكافآت
          </h1>
          <p className="text-muted-foreground">
            {isStudent ? "تتبع نقاطك وشاراتك ومركزك في لوحة الشرف" : "إدارة نقاط ومكافآت الطلاب"}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <Button onClick={handleExport} variant="outline" className="gap-2" data-testid="button-export-report">
            <Download className="w-4 h-4" />
            تصدير التقرير
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="stats-cards">
        <Card className="shadow-sm border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">إجمالي النقاط</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-700" data-testid="text-stat-total-points">{totalPointsAwarded}</p>
            </div>
            <Trophy className="w-8 h-8 text-amber-500" />
          </CardContent>
        </Card>
        <Card className="shadow-sm border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">نقاط هذا الأسبوع</p>
              <p className="text-lg sm:text-2xl font-bold text-green-700" data-testid="text-stat-weekly-points">{pointsThisWeek}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </CardContent>
        </Card>
        <Card className="shadow-sm border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">الشارات الممنوحة</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-700" data-testid="text-stat-total-badges">{totalBadgesAwarded}</p>
            </div>
            <Medal className="w-8 h-8 text-purple-500" />
          </CardContent>
        </Card>
        <Card className="shadow-sm border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">الطالب الأول</p>
              <p className="text-sm sm:text-lg font-bold text-blue-700 truncate max-w-[120px]" data-testid="text-stat-top-student">{topStudentName}</p>
            </div>
            <Crown className="w-8 h-8 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
            <Trophy className="w-4 h-4 ml-1" />
            <span className="hidden sm:inline">لوحة الشرف</span>
            <span className="sm:hidden">الشرف</span>
          </TabsTrigger>
          <TabsTrigger value="points" data-testid="tab-points">
            <Medal className="w-4 h-4 ml-1" />
            <span className="hidden sm:inline">{isStudent ? "نقاطي" : "إدارة النقاط"}</span>
            <span className="sm:hidden">النقاط</span>
          </TabsTrigger>
          <TabsTrigger value="badges" data-testid="tab-badges">
            <Award className="w-4 h-4 ml-1" />
            <span className="hidden sm:inline">الشارات</span>
            <span className="sm:hidden">شارات</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" data-testid="tab-achievements">
            <Target className="w-4 h-4 ml-1" />
            <span className="hidden sm:inline">الإنجازات</span>
            <span className="sm:hidden">إنجازات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="status-empty-leaderboard">
              لا توجد بيانات في لوحة الشرف بعد
            </div>
          ) : (
            <>
              {leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-3 sm:gap-6 pt-6 pb-4" data-testid="podium-display">
                  {[1, 0, 2].map((idx) => {
                    const entry = leaderboard[idx];
                    if (!entry) return null;
                    const rank = idx + 1;
                    const podiumHeight = rank === 1 ? "h-32" : rank === 2 ? "h-24" : "h-20";
                    const avatarSize = rank === 1 ? "w-16 h-16 text-2xl" : "w-12 h-12 text-lg";
                    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
                    const gradient = rank === 1
                      ? "from-yellow-400 via-amber-300 to-yellow-500"
                      : rank === 2
                        ? "from-gray-300 via-slate-200 to-gray-400"
                        : "from-amber-600 via-orange-400 to-amber-700";
                    const bgGradient = rank === 1
                      ? "from-yellow-50 to-amber-100 border-yellow-300"
                      : rank === 2
                        ? "from-gray-50 to-slate-100 border-gray-300"
                        : "from-orange-50 to-amber-100 border-orange-300";

                    return (
                      <div key={entry.id} className="flex flex-col items-center" data-testid={`podium-entry-${rank}`}>
                        <div className="relative mb-2">
                          <div className={`${avatarSize} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-lg border-2 border-white`}>
                            {entry.avatar ? (
                              <img src={entry.avatar} alt={entry.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              entry.name?.charAt(0)
                            )}
                          </div>
                          <span className="absolute -top-2 -right-2 text-xl">{medal}</span>
                        </div>
                        <p className="font-bold text-sm sm:text-base text-center truncate max-w-[100px]" data-testid={`text-podium-name-${rank}`}>
                          {entry.name}
                        </p>
                        <p className="text-emerald-600 font-bold text-sm" data-testid={`text-podium-points-${rank}`}>
                          {entry.totalPoints} نقطة
                        </p>
                        <div className={`${podiumHeight} w-20 sm:w-24 bg-gradient-to-t ${bgGradient} rounded-t-lg border mt-2 flex items-center justify-center`}>
                          <span className="text-2xl font-bold text-muted-foreground/50">{rank}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    الترتيب العام
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right w-16">المركز</TableHead>
                        <TableHead className="text-right">الطالب</TableHead>
                        <TableHead className="text-right">النقاط</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry, idx) => {
                        const rank = idx + 1;
                        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                        const rowBg = rank === 1
                          ? "bg-yellow-50/50"
                          : rank === 2
                            ? "bg-gray-50/50"
                            : rank === 3
                              ? "bg-orange-50/50"
                              : "";

                        return (
                          <TableRow key={entry.id} className={rowBg} data-testid={`row-leaderboard-${entry.id}`}>
                            <TableCell className="font-bold text-center">
                              {medal ? <span className="text-lg">{medal}</span> : rank}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                                  {entry.avatar ? (
                                    <img src={entry.avatar} alt={entry.name} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    entry.name?.charAt(0)
                                  )}
                                </div>
                                <span className="font-medium" data-testid={`text-leaderboard-name-${entry.id}`}>{entry.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-emerald-600" data-testid={`text-leaderboard-points-${entry.id}`}>
                                {entry.totalPoints}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="points" className="space-y-4">
          {isStudent && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="shadow-sm border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
                <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">إجمالي النقاط</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-700" data-testid="text-total-points">
                      {totalMyPoints}
                    </p>
                  </div>
                  <Trophy className="w-8 h-8 text-emerald-500" />
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">عدد المعاملات</p>
                    <p className="text-xl sm:text-2xl font-bold" data-testid="text-transactions-count">
                      {points.length}
                    </p>
                  </div>
                  <Medal className="w-8 h-8 text-primary" />
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">الشارات المكتسبة</p>
                    <p className="text-xl sm:text-2xl font-bold" data-testid="text-badges-count">
                      {badges.length}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-amber-500" />
                </CardContent>
              </Card>
            </div>
          )}

          {isTeacherOrAdmin && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                onClick={() => { setBatchSelectedStudents([]); setBatchForm({ amount: "", reason: "", category: "", isDeducting: false }); setBatchDialogOpen(true); }}
                variant="outline"
                className="gap-2"
                data-testid="button-batch-points"
              >
                <Users className="w-4 h-4" />
                منح جماعي
              </Button>
              <Button
                onClick={() => { setPointForm({ userId: "", amount: "", reason: "", category: "" }); setIsDeducting(false); setPointDialogOpen(true); }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-award-points"
              >
                <Plus className="w-4 h-4" />
                منح نقاط
              </Button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                فلترة السجل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <Input
                  placeholder="بحث باسم الطالب..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  data-testid="input-search-points"
                />
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger data-testid="select-filter-category">
                    <SelectValue placeholder="التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التصنيفات</SelectItem>
                    {POINT_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger data-testid="select-filter-type">
                    <SelectValue placeholder="النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="positive">منح (موجب)</SelectItem>
                    <SelectItem value="negative">خصم (سالب)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger data-testid="select-filter-level">
                    <SelectValue placeholder="المستوى" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">المستوى - الكل</SelectItem>
                    <SelectItem value="1">المستوى الأول (الجزء 30-26)</SelectItem>
                    <SelectItem value="2">المستوى الثاني (الجزء 25-21)</SelectItem>
                    <SelectItem value="3">المستوى الثالث (الجزء 20-16)</SelectItem>
                    <SelectItem value="4">المستوى الرابع (الجزء 15-11)</SelectItem>
                    <SelectItem value="5">المستوى الخامس (الجزء 10-6)</SelectItem>
                    <SelectItem value="6">المستوى السادس (الجزء 5-1)</SelectItem>
                    <SelectItem value="7">حافظ (30 جزء)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  placeholder="من تاريخ"
                  data-testid="input-filter-date-from"
                />
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  placeholder="إلى تاريخ"
                  data-testid="input-filter-date-to"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">سجل النقاط</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPoints.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="status-empty-points">
                  لا توجد نقاط بعد
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">النقاط</TableHead>
                      <TableHead className="text-right">السبب</TableHead>
                      <TableHead className="text-right">التصنيف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPoints.map((p) => (
                      <TableRow key={p.id} data-testid={`row-point-${p.id}`}>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-point-date-${p.id}`}>
                          {formatDateAr(p.createdAt)}
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${p.amount >= 0 ? "text-emerald-600" : "text-red-600"}`} data-testid={`text-point-amount-${p.id}`}>
                            {p.amount >= 0 ? `+${p.amount}` : p.amount}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-point-reason-${p.id}`}>
                          {p.reason || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[p.category] || ""}`} data-testid={`badge-category-${p.id}`}>
                            {getCategoryLabel(p.category)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {isTeacherOrAdmin && studentPointsSummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  ملخص نقاط الطلاب
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentPointsSummary.map(s => {
                    const maxCat = Math.max(...Object.values(s.categories).map(v => Math.abs(v)), 1);
                    const trend = s.thisWeek - s.lastWeek;
                    return (
                      <div key={s.id} className="border rounded-lg p-3 space-y-2" data-testid={`card-student-summary-${s.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                              {s.name.charAt(0)}
                            </div>
                            <span className="font-bold" data-testid={`text-summary-name-${s.id}`}>{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-emerald-600" data-testid={`text-summary-total-${s.id}`}>{s.total} نقطة</span>
                            {trend !== 0 && (
                              <span className={`text-xs flex items-center gap-1 ${trend > 0 ? "text-green-600" : "text-red-600"}`} data-testid={`text-summary-trend-${s.id}`}>
                                {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <MinusCircle className="w-3 h-3" />}
                                {trend > 0 ? `+${trend}` : trend}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(s.categories).map(([cat, val]) => (
                            <div key={cat} className="flex items-center gap-2 text-xs">
                              <span className="w-16 text-muted-foreground">{getCategoryLabel(cat)}</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${val >= 0 ? "bg-emerald-500" : "bg-red-400"}`}
                                  style={{ width: `${(Math.abs(val) / maxCat) * 100}%` }}
                                />
                              </div>
                              <span className={`w-10 text-left font-medium ${val >= 0 ? "text-emerald-600" : "text-red-600"}`}>{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                قواعد النقاط
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {POINT_RULES.map(rule => {
                  const IconComp = rule.icon;
                  return (
                    <div key={rule.action} className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg border shadow-sm" data-testid={`card-rule-${rule.action}`}>
                      <IconComp className={`w-6 h-6 ${rule.color}`} />
                      <span className="text-sm font-medium">{rule.action}</span>
                      <span className="text-lg font-bold text-emerald-600">+{rule.points}</span>
                      <span className="text-xs text-muted-foreground">نقطة</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-4">
          {isTeacherOrAdmin && (
            <div className="flex justify-end">
              <Button
                onClick={() => { setBadgeForm({ userId: "", badgeType: "", badgeName: "", description: "" }); setBadgeDialogOpen(true); }}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
                data-testid="button-award-badge"
              >
                <Plus className="w-4 h-4" />
                منح شارة
              </Button>
            </div>
          )}

          {badges.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="status-empty-badges">
              لا توجد شارات بعد
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {badges.map((b) => {
                const IconComp = BADGE_ICONS[b.badgeType] || Award;
                const colorClass = BADGE_TYPE_COLORS[b.badgeType] || "bg-gray-100 text-gray-700 border-gray-200";

                return (
                  <Card key={b.id} className="shadow-sm hover:shadow-md transition-shadow" data-testid={`card-badge-${b.id}`}>
                    <CardContent className="p-4 flex gap-4">
                      <div className={`w-14 h-14 rounded-xl ${colorClass} flex items-center justify-center shrink-0 border`}>
                        <IconComp className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm" data-testid={`text-badge-name-${b.id}`}>{b.badgeName}</h3>
                        <Badge variant="outline" className={`text-xs mt-1 ${colorClass}`} data-testid={`badge-type-${b.id}`}>
                          {getBadgeTypeLabel(b.badgeType)}
                        </Badge>
                        {b.description && (
                          <p className="text-xs text-muted-foreground mt-1" data-testid={`text-badge-desc-${b.id}`}>{b.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1" data-testid={`text-badge-date-${b.id}`}>
                          {formatDateAr(b.createdAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                الإنجازات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ACHIEVEMENTS.map(achievement => {
                  const earned = checkAchievement(achievement.id);
                  const IconComp = achievement.icon;
                  return (
                    <div
                      key={achievement.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        earned
                          ? "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-md"
                          : "border-gray-200 bg-gray-50 opacity-60"
                      }`}
                      data-testid={`card-achievement-${achievement.id}`}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                        earned
                          ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg"
                          : "bg-gray-200 text-gray-400"
                      }`}>
                        <IconComp className="w-7 h-7" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-bold ${earned ? "text-amber-800" : "text-gray-500"}`} data-testid={`text-achievement-name-${achievement.id}`}>
                          {achievement.name}
                        </h3>
                        <p className={`text-sm ${earned ? "text-amber-600" : "text-gray-400"}`} data-testid={`text-achievement-desc-${achievement.id}`}>
                          {achievement.description}
                        </p>
                        {earned && (
                          <Badge className="mt-1 bg-amber-100 text-amber-700 border-amber-300" variant="outline">
                            تم الإنجاز ✓
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={pointDialogOpen} onOpenChange={setPointDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{isDeducting ? "خصم نقاط" : "منح نقاط"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg" data-testid="toggle-point-mode">
              <Button
                type="button"
                size="sm"
                variant={!isDeducting ? "default" : "outline"}
                className={!isDeducting ? "bg-emerald-600 hover:bg-emerald-700 flex-1" : "flex-1"}
                onClick={() => setIsDeducting(false)}
                data-testid="button-mode-award"
              >
                <PlusCircle className="w-4 h-4 ml-1" />
                منح نقاط
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isDeducting ? "default" : "outline"}
                className={isDeducting ? "bg-red-600 hover:bg-red-700 flex-1" : "flex-1"}
                onClick={() => setIsDeducting(true)}
                data-testid="button-mode-deduct"
              >
                <MinusCircle className="w-4 h-4 ml-1" />
                خصم نقاط
              </Button>
            </div>

            <div className="space-y-2">
              <Label>الطالب *</Label>
              <Select value={pointForm.userId} onValueChange={(v) => setPointForm({ ...pointForm, userId: v })}>
                <SelectTrigger data-testid="select-point-student">
                  <SelectValue placeholder="اختر الطالب" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>عدد النقاط *</Label>
              <Input
                type="number"
                value={pointForm.amount}
                onChange={(e) => setPointForm({ ...pointForm, amount: e.target.value })}
                placeholder="مثال: 10"
                min="1"
                data-testid="input-point-amount"
              />
            </div>

            <div className="space-y-2">
              <Label>التصنيف *</Label>
              <Select value={pointForm.category} onValueChange={(v) => setPointForm({ ...pointForm, category: v })}>
                <SelectTrigger data-testid="select-point-category">
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {POINT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>السبب</Label>
              <Textarea
                value={pointForm.reason}
                onChange={(e) => setPointForm({ ...pointForm, reason: e.target.value })}
                placeholder={isDeducting ? "سبب خصم النقاط..." : "سبب منح النقاط..."}
                data-testid="input-point-reason"
              />
            </div>

            <Button
              onClick={handleAwardPoints}
              disabled={submitting}
              className={`w-full ${isDeducting ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              data-testid="button-submit-points"
            >
              {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {isDeducting ? "خصم النقاط" : "منح النقاط"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              منح/خصم نقاط جماعي
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg" data-testid="toggle-batch-mode">
              <Button
                type="button"
                size="sm"
                variant={!batchForm.isDeducting ? "default" : "outline"}
                className={!batchForm.isDeducting ? "bg-emerald-600 hover:bg-emerald-700 flex-1" : "flex-1"}
                onClick={() => setBatchForm({ ...batchForm, isDeducting: false })}
                data-testid="button-batch-mode-award"
              >
                <PlusCircle className="w-4 h-4 ml-1" />
                منح
              </Button>
              <Button
                type="button"
                size="sm"
                variant={batchForm.isDeducting ? "default" : "outline"}
                className={batchForm.isDeducting ? "bg-red-600 hover:bg-red-700 flex-1" : "flex-1"}
                onClick={() => setBatchForm({ ...batchForm, isDeducting: true })}
                data-testid="button-batch-mode-deduct"
              >
                <MinusCircle className="w-4 h-4 ml-1" />
                خصم
              </Button>
            </div>

            <div className="space-y-2">
              <Label>اختر الطلاب * ({batchSelectedStudents.length} محدد)</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2" data-testid="batch-student-list">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={batchSelectedStudents.length === students.length && students.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setBatchSelectedStudents(students.map(s => s.id));
                      } else {
                        setBatchSelectedStudents([]);
                      }
                    }}
                    data-testid="checkbox-select-all"
                  />
                  <Label className="text-sm font-medium cursor-pointer">تحديد الكل</Label>
                </div>
                {students.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={batchSelectedStudents.includes(s.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBatchSelectedStudents([...batchSelectedStudents, s.id]);
                        } else {
                          setBatchSelectedStudents(batchSelectedStudents.filter(id => id !== s.id));
                        }
                      }}
                      data-testid={`checkbox-student-${s.id}`}
                    />
                    <Label className="text-sm cursor-pointer">{s.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>عدد النقاط *</Label>
              <Input
                type="number"
                value={batchForm.amount}
                onChange={e => setBatchForm({ ...batchForm, amount: e.target.value })}
                placeholder="مثال: 10"
                min="1"
                data-testid="input-batch-amount"
              />
            </div>

            <div className="space-y-2">
              <Label>التصنيف *</Label>
              <Select value={batchForm.category} onValueChange={v => setBatchForm({ ...batchForm, category: v })}>
                <SelectTrigger data-testid="select-batch-category">
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {POINT_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>السبب</Label>
              <Textarea
                value={batchForm.reason}
                onChange={e => setBatchForm({ ...batchForm, reason: e.target.value })}
                placeholder="سبب منح/خصم النقاط..."
                data-testid="input-batch-reason"
              />
            </div>

            <Button
              onClick={handleBatchAward}
              disabled={submitting || batchSelectedStudents.length === 0}
              className={`w-full ${batchForm.isDeducting ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              data-testid="button-submit-batch"
            >
              {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {batchForm.isDeducting ? "خصم النقاط" : "منح النقاط"} لـ {batchSelectedStudents.length} طالب
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>منح شارة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>الطالب *</Label>
              <Select value={badgeForm.userId} onValueChange={(v) => setBadgeForm({ ...badgeForm, userId: v })}>
                <SelectTrigger data-testid="select-badge-student">
                  <SelectValue placeholder="اختر الطالب" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>نوع الشارة *</Label>
              <Select value={badgeForm.badgeType} onValueChange={(v) => setBadgeForm({ ...badgeForm, badgeType: v })}>
                <SelectTrigger data-testid="select-badge-type">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  {BADGE_TYPES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>اسم الشارة *</Label>
              <Input
                value={badgeForm.badgeName}
                onChange={(e) => setBadgeForm({ ...badgeForm, badgeName: e.target.value })}
                placeholder="مثال: حافظ متميز"
                data-testid="input-badge-name"
              />
            </div>

            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={badgeForm.description}
                onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                placeholder="وصف الشارة..."
                data-testid="input-badge-description"
              />
            </div>

            <Button
              onClick={handleAwardBadge}
              disabled={submitting}
              className="w-full bg-amber-600 hover:bg-amber-700"
              data-testid="button-submit-badge"
            >
              {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              منح الشارة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}