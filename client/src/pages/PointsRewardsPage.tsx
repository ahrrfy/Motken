import { useState, useEffect } from "react";
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
import { Loader2, Trophy, Star, Heart, Clock, BookOpen, Plus, Award, Medal } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr } from "@/lib/utils";

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
}

const POINT_CATEGORIES = [
  { value: "assignment", label: "واجب" },
  { value: "exam", label: "امتحان" },
  { value: "behavior", label: "سلوك" },
  { value: "attendance", label: "حضور" },
  { value: "extra", label: "إضافي" },
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
};

const BADGE_TYPE_COLORS: Record<string, string> = {
  memorization: "bg-emerald-100 text-emerald-700 border-emerald-200",
  tajweed: "bg-yellow-100 text-yellow-700 border-yellow-200",
  behavior: "bg-pink-100 text-pink-700 border-pink-200",
  attendance: "bg-blue-100 text-blue-700 border-blue-200",
  excellence: "bg-amber-100 text-amber-700 border-amber-200",
};

function getCategoryLabel(category: string): string {
  return POINT_CATEGORIES.find(c => c.value === category)?.label || category;
}

function getBadgeTypeLabel(type: string): string {
  return BADGE_TYPES.find(b => b.value === type)?.label || type;
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
  const [submitting, setSubmitting] = useState(false);

  const [pointForm, setPointForm] = useState({ userId: "", amount: "", reason: "", category: "" });
  const [badgeForm, setBadgeForm] = useState({ userId: "", badgeType: "", badgeName: "", description: "" });

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
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: pointForm.userId,
          amount: parseInt(pointForm.amount),
          reason: pointForm.reason,
          category: pointForm.category,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم منح النقاط بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setPointDialogOpen(false);
        setPointForm({ userId: "", amount: "", reason: "", category: "" });
        fetchPoints();
        fetchLeaderboard();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في منح النقاط", variant: "destructive" });
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="status-loading">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 ml-2" />
        <span>جاري التحميل...</span>
      </div>
    );
  }

  const totalMyPoints = points.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-emerald-700" data-testid="text-page-title">
          النقاط والمكافآت
        </h1>
        <p className="text-muted-foreground">
          {isStudent ? "تتبع نقاطك وشاراتك ومركزك في لوحة الشرف" : "إدارة نقاط ومكافآت الطلاب"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full grid grid-cols-3" data-testid="tabs-list">
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
            <Trophy className="w-4 h-4 ml-1" />
            لوحة الشرف
          </TabsTrigger>
          <TabsTrigger value="points" data-testid="tab-points">
            <Medal className="w-4 h-4 ml-1" />
            {isStudent ? "نقاطي" : "إدارة النقاط"}
          </TabsTrigger>
          <TabsTrigger value="badges" data-testid="tab-badges">
            <Award className="w-4 h-4 ml-1" />
            الشارات
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
            <div className="flex justify-end">
              <Button
                onClick={() => { setPointForm({ userId: "", amount: "", reason: "", category: "" }); setPointDialogOpen(true); }}
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
              <CardTitle className="text-lg font-serif">سجل النقاط</CardTitle>
            </CardHeader>
            <CardContent>
              {points.length === 0 ? (
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
                    {points.map((p) => (
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
      </Tabs>

      <Dialog open={pointDialogOpen} onOpenChange={setPointDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>منح نقاط</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
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
                placeholder="سبب منح النقاط..."
                data-testid="input-point-reason"
              />
            </div>

            <Button
              onClick={handleAwardPoints}
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-submit-points"
            >
              {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              منح النقاط
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