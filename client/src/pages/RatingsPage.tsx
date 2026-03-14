import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Star, Award, MessageSquare, Search, X, TrendingUp, TrendingDown, Users, Crown, Medal, Download, BarChart3, Sparkles, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr } from "@/lib/utils";
import { exportJsonToExcel } from "@/lib/excel-utils";

interface RatingUser {
  id: string;
  name: string;
  username: string;
  role: string;
  level?: number;
}

interface Rating {
  id: string;
  fromUserId: string;
  toUserId: string;
  stars: number;
  honorBadge: boolean;
  comment: string | null;
  type: string;
  createdAt: string;
  fromUserName?: string;
}

const RATING_CATEGORIES = ["حفظ", "تجويد", "سلوك", "حضور", "مشاركة"];

export default function RatingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<RatingUser[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RatingUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formStars, setFormStars] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [formHonorBadge, setFormHonorBadge] = useState(false);

  const [ratingSearchTerm, setRatingSearchTerm] = useState("");
  const [filterStars, setFilterStars] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [activeTab, setActiveTab] = useState("ratings");
  const [weeklyDialogOpen, setWeeklyDialogOpen] = useState(false);
  const [weeklyUser, setWeeklyUser] = useState<RatingUser | null>(null);
  const [weeklyStars, setWeeklyStars] = useState(0);
  const [weeklyCategoryRatings, setWeeklyCategoryRatings] = useState<Record<string, number>>({});
  const [weeklyComment, setWeeklyComment] = useState("");
  const [weeklySubmitting, setWeeklySubmitting] = useState(false);

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState<RatingUser | null>(null);

  const [honorSuggestion, setHonorSuggestion] = useState<{ userId: string; userName: string } | null>(null);

  const isSupervisor = user?.role === "supervisor";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  const fetchData = async () => {
    try {
      const promises: Promise<Response>[] = [];

      if (isSupervisor) {
        promises.push(fetch("/api/users?role=teacher", { credentials: "include" }));
      } else if (isTeacher) {
        promises.push(fetch("/api/users?role=student", { credentials: "include" }));
      }

      if (isStudent && user?.id) {
        promises.push(fetch(`/api/ratings?userId=${user.id}`, { credentials: "include" }));
      } else {
        promises.push(fetch("/api/ratings", { credentials: "include" }));
      }

      const results = await Promise.all(promises);

      if (!isStudent && results[0]?.ok) {
        setUsers(await results[0].json());
      }

      const ratingsIdx = isStudent ? 0 : 1;
      if (results[ratingsIdx]?.ok) {
        setRatings(await results[ratingsIdx].json());
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getUserRatings = (userId: string) => ratings.filter(r => r.toUserId === userId);

  const getAverageStars = (userId: string) => {
    const userRatings = getUserRatings(userId);
    if (userRatings.length === 0) return 0;
    return userRatings.reduce((sum, r) => sum + r.stars, 0) / userRatings.length;
  };

  const getHonorBadgeCount = (userId: string) => getUserRatings(userId).filter(r => r.honorBadge).length;

  const getRatingTrend = (userId: string) => {
    const userRatings = getUserRatings(userId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (userRatings.length < 2) return "stable";
    const recent = userRatings.slice(-3);
    const older = userRatings.slice(0, Math.max(1, userRatings.length - 3));
    const recentAvg = recent.reduce((s, r) => s + r.stars, 0) / recent.length;
    const olderAvg = older.reduce((s, r) => s + r.stars, 0) / older.length;
    if (recentAvg > olderAvg + 0.3) return "up";
    if (recentAvg < olderAvg - 0.3) return "down";
    return "stable";
  };

  const checkAutoHonorBadge = (userId: string) => {
    const userRatings = getUserRatings(userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (userRatings.length >= 3) {
      const lastThree = userRatings.slice(0, 3);
      if (lastThree.every(r => r.stars === 5)) {
        const u = users.find(u => u.id === userId);
        if (u) {
          setHonorSuggestion({ userId: u.id, userName: u.name });
        }
      }
    }
  };

  useEffect(() => {
    if (!isStudent && users.length > 0 && ratings.length > 0) {
      users.forEach(u => checkAutoHonorBadge(u.id));
    }
  }, [ratings, users]);

  const totalStats = useMemo(() => {
    const totalRatings = ratings.length;
    const avgRating = totalRatings > 0 ? ratings.reduce((s, r) => s + r.stars, 0) / totalRatings : 0;
    const totalBadges = ratings.filter(r => r.honorBadge).length;
    const uniqueUsers = new Set(ratings.map(r => r.toUserId)).size;
    return { totalRatings, avgRating, totalBadges, uniqueUsers };
  }, [ratings]);

  const openRatingDialog = (u: RatingUser) => {
    setSelectedUser(u);
    setFormStars(0);
    setFormComment("");
    setFormHonorBadge(false);
    setDialogOpen(true);
  };

  const openWeeklyDialog = (u: RatingUser) => {
    setWeeklyUser(u);
    setWeeklyStars(0);
    setWeeklyCategoryRatings({});
    setWeeklyComment("");
    setWeeklyDialogOpen(true);
  };

  const openHistoryDialog = (u: RatingUser) => {
    setHistoryUser(u);
    setHistoryDialogOpen(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedUser || formStars === 0) {
      toast({ title: "خطأ", description: "يرجى اختيار عدد النجوم", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          toUserId: selectedUser.id,
          stars: formStars,
          honorBadge: formHonorBadge,
          comment: formComment || null,
          type: isSupervisor ? "supervisor_to_teacher" : "teacher_to_student",
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إضافة التقييم بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة التقييم", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitWeeklyRating = async () => {
    if (!weeklyUser || weeklyStars === 0) {
      toast({ title: "خطأ", description: "يرجى اختيار عدد النجوم", variant: "destructive" });
      return;
    }
    setWeeklySubmitting(true);
    try {
      const categoryDetails = RATING_CATEGORIES.map(cat => {
        const val = weeklyCategoryRatings[cat] || 0;
        return val > 0 ? `${cat}: ${val}/5` : null;
      }).filter(Boolean).join(" | ");
      const fullComment = [categoryDetails, weeklyComment].filter(Boolean).join("\n");

      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          toUserId: weeklyUser.id,
          stars: weeklyStars,
          honorBadge: false,
          comment: fullComment || null,
          type: isSupervisor ? "supervisor_to_teacher" : "teacher_to_student",
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إضافة التقييم الأسبوعي بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setWeeklyDialogOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة التقييم", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setWeeklySubmitting(false);
    }
  };

  const handleConfirmHonorBadge = async () => {
    if (!honorSuggestion) return;
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          toUserId: honorSuggestion.userId,
          stars: 5,
          honorBadge: true,
          comment: "وسام شرف تلقائي - حصل على 5 نجوم 3 مرات متتالية",
          type: isSupervisor ? "supervisor_to_teacher" : "teacher_to_student",
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: `تم منح وسام الشرف لـ ${honorSuggestion.userName}`, className: "bg-green-50 border-green-200 text-green-800" });
        setHonorSuggestion(null);
        fetchData();
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في منح الوسام", variant: "destructive" });
    }
  };

  const handleExportRatings = async () => {
    const exportData = ratings.map(r => {
      const toUser = users.find(u => u.id === r.toUserId);
      return {
        "الاسم": toUser?.name || r.toUserId,
        "التاريخ": formatDateAr(r.createdAt),
        "النجوم": r.stars,
        "وسام شرف": r.honorBadge ? "نعم" : "لا",
        "التعليق": r.comment || "",
      };
    });
    await exportJsonToExcel(exportData, "التقييمات", "ratings-export.xlsx");
    toast({ title: "تم التصدير", description: "تم تصدير التقييمات بنجاح" });
  };

  const ratingsHasActiveFilters = ratingSearchTerm || filterStars !== "all" || filterLevel !== "all" || filterDateFrom || filterDateTo;

  const clearRatingFilters = () => {
    setRatingSearchTerm("");
    setFilterStars("all");
    setFilterLevel("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const filteredUsers = users.filter(u => {
    if (ratingSearchTerm && !u.name.includes(ratingSearchTerm) && !u.username.includes(ratingSearchTerm)) return false;
    if (filterStars !== "all") {
      const avg = getAverageStars(u.id);
      if (Math.round(avg) !== parseInt(filterStars)) return false;
    }
    if (filterLevel !== "all" && String(u.level || 1) !== filterLevel) return false;
    return true;
  });

  const filteredRatings = ratings.filter(r => {
    if (filterStars !== "all" && r.stars !== parseInt(filterStars)) return false;
    if (filterDateFrom && r.createdAt) {
      if (new Date(r.createdAt) < new Date(filterDateFrom)) return false;
    }
    if (filterDateTo && r.createdAt) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(r.createdAt) > toDate) return false;
    }
    return true;
  });

  const topRatedUsers = useMemo(() => {
    return users
      .map(u => ({ ...u, avg: getAverageStars(u.id), total: getUserRatings(u.id).length }))
      .filter(u => u.total > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [users, ratings]);

  const badgeUsers = useMemo(() => {
    return users
      .map(u => ({ ...u, badgeCount: getHonorBadgeCount(u.id) }))
      .filter(u => u.badgeCount > 0)
      .sort((a, b) => b.badgeCount - a.badgeCount);
  }, [users, ratings]);

  const formatDate = (dateStr: string) => formatDateAr(dateStr);

  const renderStars = (count: number, interactive: boolean = false, onSelect?: (n: number) => void, size: string = "w-5 h-5") => (
    <div className="flex gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`${size} ${
            n <= count
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          } ${interactive ? "cursor-pointer hover:text-yellow-400 transition-colors" : ""}`}
          onClick={interactive && onSelect ? () => onSelect(n) : undefined}
          data-testid={interactive ? `star-${n}` : undefined}
        />
      ))}
    </div>
  );

  const renderTrendIcon = (userId: string) => {
    const trend = getRatingTrend(userId);
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
    return null;
  };

  const renderHistoryChart = (userId: string) => {
    const userRatings = getUserRatings(userId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const lastRatings = userRatings.slice(-8);
    if (lastRatings.length === 0) return null;
    return (
      <div className="flex items-end gap-1 h-20" data-testid={`chart-ratings-${userId}`}>
        {lastRatings.map((r, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full rounded-t-sm bg-primary/80 min-w-[12px] transition-all"
              style={{ height: `${(r.stars / 5) * 100}%` }}
              title={`${r.stars} نجوم - ${formatDate(r.createdAt)}`}
            />
            <span className="text-[9px] text-muted-foreground">{r.stars}</span>
          </div>
        ))}
      </div>
    );
  };

  const getRecentTrendStars = (userId: string) => {
    const userRatings = getUserRatings(userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return userRatings.slice(0, 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="status-loading-ratings">
        <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
        <span>جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 page-transition">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-ratings">التقييمات والأوسمة</h1>
          <p className="text-muted-foreground">
            {isSupervisor && "تقييم أداء الأساتذة ومنح الأوسمة"}
            {isTeacher && "تقييم أداء الطلاب ومنح الأوسمة"}
            {isStudent && "التقييمات التي حصلت عليها"}
          </p>
        </div>
        {(isSupervisor || isTeacher) && (
          <Button variant="outline" className="gap-2" onClick={handleExportRatings} data-testid="button-export-ratings">
            <Download className="w-4 h-4" />
            تصدير Excel
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {(isSupervisor || isTeacher) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="stats-cards">
          <Card className="shadow-sm border-blue-200 bg-blue-50/50">
            <CardContent className="p-3 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600">إجمالي التقييمات</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700" data-testid="stat-total-ratings">{totalStats.totalRatings}</p>
              </div>
              <Star className="w-8 h-8 text-blue-500" />
            </CardContent>
          </Card>
          <Card className="shadow-sm border-amber-200 bg-amber-50/50">
            <CardContent className="p-3 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600">متوسط التقييم</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-700" data-testid="stat-avg-rating">{totalStats.avgRating.toFixed(1)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-500" />
            </CardContent>
          </Card>
          <Card className="shadow-sm border-purple-200 bg-purple-50/50">
            <CardContent className="p-3 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600">أوسمة الشرف</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-700" data-testid="stat-total-badges">{totalStats.totalBadges}</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </CardContent>
          </Card>
          <Card className="shadow-sm border-green-200 bg-green-50/50">
            <CardContent className="p-3 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600">المقيَّمون</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700" data-testid="stat-users-rated">{totalStats.uniqueUsers}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Auto Honor Badge Suggestion */}
      {honorSuggestion && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-md" data-testid="honor-suggestion">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-amber-500" />
              <div>
                <p className="font-bold text-amber-800">{honorSuggestion.userName} يستحق وسام الشرف!</p>
                <p className="text-sm text-amber-600">حصل على 5 نجوم 3 مرات متتالية</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 gap-1" onClick={handleConfirmHonorBadge} data-testid="button-confirm-honor">
                <Award className="w-4 h-4" />
                منح الوسام
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setHonorSuggestion(null)} data-testid="button-dismiss-honor">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card dir="rtl">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative w-full sm:w-52">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isStudent ? "بحث في التقييمات..." : "بحث بالاسم..."}
                className="pr-8"
                value={ratingSearchTerm}
                onChange={(e) => setRatingSearchTerm(e.target.value)}
                data-testid="input-search-ratings"
              />
            </div>
            <div className="w-full sm:w-36">
              <Select value={filterStars} onValueChange={setFilterStars}>
                <SelectTrigger data-testid="select-filter-stars">
                  <SelectValue placeholder="النجوم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">النجوم - الكل</SelectItem>
                  <SelectItem value="5">5 نجوم</SelectItem>
                  <SelectItem value="4">4 نجوم</SelectItem>
                  <SelectItem value="3">3 نجوم</SelectItem>
                  <SelectItem value="2">نجمتان</SelectItem>
                  <SelectItem value="1">نجمة واحدة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
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
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs text-muted-foreground mb-1 block">من تاريخ</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                data-testid="input-filter-date-from"
              />
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                data-testid="input-filter-date-to"
              />
            </div>
            {ratingsHasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearRatingFilters} className="gap-1 text-destructive hover:text-destructive" data-testid="button-clear-filters">
                <X className="w-4 h-4" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs for supervisor/teacher */}
      {(isSupervisor || isTeacher) && (
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList>
            <TabsTrigger value="ratings" className="gap-1" data-testid="tab-ratings">
              <Star className="w-4 h-4" />
              التقييمات
            </TabsTrigger>
            <TabsTrigger value="top" className="gap-1" data-testid="tab-top">
              <Crown className="w-4 h-4" />
              المتميزون
            </TabsTrigger>
            <TabsTrigger value="badges" className="gap-1" data-testid="tab-badges">
              <Medal className="w-4 h-4" />
              الأوسمة
            </TabsTrigger>
          </TabsList>

          {/* Ratings Tab */}
          <TabsContent value="ratings" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredUsers.map(u => {
                const avg = getAverageStars(u.id);
                const total = getUserRatings(u.id).length;
                const badges = getHonorBadgeCount(u.id);
                const recentTrend = getRecentTrendStars(u.id);
                const trend = getRatingTrend(u.id);
                return (
                  <Card key={u.id} className="shadow-sm hover:shadow-md transition-shadow" data-testid={`card-user-${u.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => openHistoryDialog(u)}>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {u.name?.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-1" data-testid={`text-name-${u.id}`}>
                              {u.name}
                              {renderTrendIcon(u.id)}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">{u.username}</p>
                          </div>
                        </div>
                        {badges > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 border-none gap-1" data-testid={`badge-honor-${u.id}`}>
                            <Award className="w-3 h-3" />
                            {badges}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      {/* Average rating prominently */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {renderStars(Math.round(avg))}
                          <span className="text-sm text-muted-foreground" data-testid={`text-avg-${u.id}`}>
                            ({avg.toFixed(1)})
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground" data-testid={`text-total-${u.id}`}>
                          {total} تقييم
                        </span>
                      </div>

                      {/* Recent trend mini stars */}
                      {recentTrend.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <History className="w-3 h-3" />
                          <span>آخر التقييمات:</span>
                          <div className="flex gap-1">
                            {recentTrend.map((r, i) => (
                              <span key={i} className="flex items-center">
                                {renderStars(r.stars, false, undefined, "w-3 h-3")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Honor badge status */}
                      {badges > 0 && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded p-1.5">
                          <Medal className="w-3 h-3" />
                          <span>حاصل على {badges} وسام شرف</span>
                        </div>
                      )}

                      {getUserRatings(u.id).length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {getUserRatings(u.id).slice(0, 3).map(r => (
                            <div key={r.id} className="bg-muted/30 rounded-lg p-2 text-sm" data-testid={`rating-item-${r.id}`}>
                              <div className="flex items-center justify-between mb-1">
                                {renderStars(r.stars)}
                                <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                              </div>
                              {r.honorBadge && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs mb-1 gap-1">
                                  <Award className="w-3 h-3" />
                                  وسام شرف
                                </Badge>
                              )}
                              {r.comment && (
                                <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                                  <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                  {r.comment}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => openRatingDialog(u)}
                          data-testid={`button-rate-${u.id}`}
                        >
                          <Star className="w-4 h-4" />
                          تقييم
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => openWeeklyDialog(u)}
                          data-testid={`button-weekly-rate-${u.id}`}
                        >
                          <BarChart3 className="w-4 h-4" />
                          تقييم أسبوعي
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredUsers.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground" data-testid="status-empty">
                  لا يوجد {isSupervisor ? "أساتذة" : "طلاب"} لتقييمهم
                </div>
              )}
            </div>
          </TabsContent>

          {/* Top Rated Tab */}
          <TabsContent value="top" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  المتميزون - أعلى التقييمات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topRatedUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد تقييمات بعد</p>
                ) : (
                  <div className="space-y-3">
                    {topRatedUsers.map((u, index) => (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          index === 0 ? "border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-md" :
                          index === 1 ? "border-gray-300 bg-gray-50" :
                          index === 2 ? "border-amber-600/30 bg-amber-50/30" :
                          "border-muted"
                        }`}
                        data-testid={`top-user-${u.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? "bg-amber-400 text-white" :
                            index === 1 ? "bg-gray-400 text-white" :
                            index === 2 ? "bg-amber-600 text-white" :
                            "bg-primary/10 text-primary"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-2">
                            {index < 3 && <Crown className={`w-4 h-4 ${index === 0 ? "text-amber-500" : index === 1 ? "text-gray-400" : "text-amber-600"}`} />}
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {renderStars(Math.round(u.avg))}
                          <span className="text-sm font-bold text-primary">{u.avg.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({u.total} تقييم)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <Medal className="w-5 h-5 text-amber-500" />
                  الأوسمة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {badgeUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد أوسمة بعد</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {badgeUsers.map(u => (
                      <Card key={u.id} className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-sm" data-testid={`badge-showcase-${u.id}`}>
                        <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
                            <Award className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-amber-900">{u.name}</p>
                            <p className="text-sm text-amber-600">{u.username}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(u.badgeCount, 5) }).map((_, i) => (
                              <Award key={i} className="w-5 h-5 text-amber-500 fill-amber-200" />
                            ))}
                            {u.badgeCount > 5 && (
                              <span className="text-sm font-bold text-amber-600">+{u.badgeCount - 5}</span>
                            )}
                          </div>
                          <Badge className="bg-amber-500 text-white border-none text-sm px-3">
                            {u.badgeCount} وسام شرف
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Student View */}
      {isStudent && (
        <div className="space-y-4">
          {filteredRatings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="status-empty">
              لا توجد تقييمات بعد
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">متوسط التقييم</p>
                      <p className="text-xl sm:text-2xl font-bold" data-testid="text-my-avg">
                        {(filteredRatings.reduce((s, r) => s + r.stars, 0) / filteredRatings.length).toFixed(1)}
                      </p>
                    </div>
                    <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">عدد التقييمات</p>
                      <p className="text-xl sm:text-2xl font-bold" data-testid="text-my-total">{filteredRatings.length}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-primary" />
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">أوسمة الشرف</p>
                      <p className="text-xl sm:text-2xl font-bold" data-testid="text-my-badges">
                        {filteredRatings.filter(r => r.honorBadge).length}
                      </p>
                    </div>
                    <Award className="w-8 h-8 text-amber-500" />
                  </CardContent>
                </Card>
              </div>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-serif">سجل التقييمات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredRatings.map(r => (
                    <div key={r.id} className="border rounded-lg p-3" data-testid={`rating-item-${r.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {renderStars(r.stars)}
                          {r.honorBadge && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs gap-1">
                              <Award className="w-3 h-3" />
                              وسام شرف
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground flex items-start gap-1">
                          <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Rating Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تقييم {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>التقييم بالنجوم *</Label>
              <div className="flex justify-center py-2">
                {renderStars(formStars, true, setFormStars)}
              </div>
            </div>

            <div className="space-y-2">
              <Label>تعليق</Label>
              <Textarea
                value={formComment}
                onChange={e => setFormComment(e.target.value)}
                placeholder="أضف تعليقاً..."
                data-testid="input-comment"
              />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <input
                type="checkbox"
                id="honorBadge"
                checked={formHonorBadge}
                onChange={e => setFormHonorBadge(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
                data-testid="checkbox-honor-badge"
              />
              <Label htmlFor="honorBadge" className="flex items-center gap-2 cursor-pointer text-amber-800 m-0">
                <Award className="w-4 h-4 text-amber-500" />
                منح وسام شرف
              </Label>
            </div>

            <Button
              onClick={handleSubmitRating}
              disabled={submitting || formStars === 0}
              className="w-full"
              data-testid="button-submit-rating"
            >
              {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              إرسال التقييم
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weekly Rating Dialog */}
      <Dialog open={weeklyDialogOpen} onOpenChange={setWeeklyDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              تقييم أسبوعي - {weeklyUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>التقييم العام *</Label>
              <div className="flex justify-center py-2">
                {renderStars(weeklyStars, true, setWeeklyStars)}
              </div>
            </div>

            <div className="space-y-3">
              <Label>تقييم حسب الفئة</Label>
              {RATING_CATEGORIES.map(cat => (
                <div key={cat} className="flex items-center justify-between bg-muted/30 p-2 rounded-lg">
                  <span className="text-sm font-medium">{cat}</span>
                  <div className="flex gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star
                        key={n}
                        className={`w-4 h-4 cursor-pointer transition-colors ${
                          n <= (weeklyCategoryRatings[cat] || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-300"
                        }`}
                        onClick={() => setWeeklyCategoryRatings(prev => ({ ...prev, [cat]: n }))}
                        data-testid={`weekly-cat-${cat}-star-${n}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>ملاحظات إضافية</Label>
              <Textarea
                value={weeklyComment}
                onChange={e => setWeeklyComment(e.target.value)}
                placeholder="أضف ملاحظات..."
                data-testid="input-weekly-comment"
              />
            </div>

            <Button
              onClick={handleSubmitWeeklyRating}
              disabled={weeklySubmitting || weeklyStars === 0}
              className="w-full gap-2"
              data-testid="button-submit-weekly-rating"
            >
              {weeklySubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              <BarChart3 className="w-4 h-4" />
              إرسال التقييم الأسبوعي
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              سجل تقييمات {historyUser?.name}
            </DialogTitle>
          </DialogHeader>
          {historyUser && (
            <div className="space-y-4 mt-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{getAverageStars(historyUser.id).toFixed(1)}</p>
                  <p className="text-xs text-blue-600">المتوسط</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-700">{getUserRatings(historyUser.id).length}</p>
                  <p className="text-xs text-purple-600">إجمالي التقييمات</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-700">{getHonorBadgeCount(historyUser.id)}</p>
                  <p className="text-xs text-amber-600">أوسمة الشرف</p>
                </div>
              </div>

              {/* Trend */}
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">الاتجاه:</span>
                {getRatingTrend(historyUser.id) === "up" && (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <TrendingUp className="w-4 h-4" /> في تحسن
                  </span>
                )}
                {getRatingTrend(historyUser.id) === "down" && (
                  <span className="flex items-center gap-1 text-red-600 text-sm">
                    <TrendingDown className="w-4 h-4" /> في تراجع
                  </span>
                )}
                {getRatingTrend(historyUser.id) === "stable" && (
                  <span className="text-muted-foreground text-sm">مستقر</span>
                )}
              </div>

              {/* Chart */}
              <div>
                <p className="text-sm font-medium mb-2">مخطط التقييمات</p>
                {renderHistoryChart(historyUser.id)}
              </div>

              {/* All ratings */}
              <div className="space-y-2">
                <p className="text-sm font-medium">جميع التقييمات</p>
                {getUserRatings(historyUser.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(r => (
                    <div key={r.id} className="border rounded-lg p-3" data-testid={`history-rating-${r.id}`}>
                      <div className="flex items-center justify-between mb-1">
                        {renderStars(r.stars)}
                        <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                      </div>
                      {r.honorBadge && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs mb-1 gap-1">
                          <Award className="w-3 h-3" />
                          وسام شرف
                        </Badge>
                      )}
                      {r.comment && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                          <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                {getUserRatings(historyUser.id).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">لا توجد تقييمات</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}