import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { LEVEL_NAMES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Loader2, Users, BookOpen, CalendarCheck, Gift, TrendingUp, GraduationCap,
  CheckCircle2, XCircle, Clock, Star, Award, BookMarked, BarChart3,
  Send
} from "lucide-react";

interface ChildData {
  id: string;
  name: string;
  level: number;
  gender: string | null;
  studyMode: string;
  isActive: boolean;
  relationship: string;
  avatar: string | null;
  stats: {
    totalAssignments: number;
    completedAssignments: number;
    completionRate: number;
    totalAttendance: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    attendanceRate: number;
    totalPoints: number;
  };
  recentAssignments: {
    id: string;
    surahName: string;
    fromVerse: number;
    toVerse: number;
    status: string;
    grade: number | null;
    scheduledDate: string;
  }[];
  recentAttendance: {
    id: string;
    date: string;
    status: string;
    notes: string | null;
  }[];
  quranProgress: {
    surahNumber: number;
    verseStatuses: string;
    reviewStreak: number;
    lastReviewDate: string | null;
    nextReviewDate: string | null;
  }[];
  badges: {
    id: string;
    badgeType: string;
    badgeName: string;
    earnedAt: string;
  }[];
}

const SURAH_NAMES: Record<number, string> = {
  1: "الفاتحة", 2: "البقرة", 3: "آل عمران", 4: "النساء", 5: "المائدة", 6: "الأنعام",
  7: "الأعراف", 8: "الأنفال", 9: "التوبة", 10: "يونس", 11: "هود", 12: "يوسف",
  13: "الرعد", 14: "إبراهيم", 15: "الحجر", 16: "النحل", 17: "الإسراء", 18: "الكهف",
  19: "مريم", 20: "طه", 21: "الأنبياء", 22: "الحج", 23: "المؤمنون", 24: "النور",
  25: "الفرقان", 26: "الشعراء", 27: "النمل", 28: "القصص", 29: "العنكبوت", 30: "الروم",
  31: "لقمان", 32: "السجدة", 33: "الأحزاب", 34: "سبأ", 35: "فاطر", 36: "يس",
  37: "الصافات", 38: "ص", 39: "الزمر", 40: "غافر", 41: "فصلت", 42: "الشورى",
  43: "الزخرف", 44: "الدخان", 45: "الجاثية", 46: "الأحقاف", 47: "محمد", 48: "الفتح",
  49: "الحجرات", 50: "ق", 51: "الذاريات", 52: "الطور", 53: "النجم", 54: "القمر",
  55: "الرحمن", 56: "الواقعة", 57: "الحديد", 58: "المجادلة", 59: "الحشر", 60: "الممتحنة",
  61: "الصف", 62: "الجمعة", 63: "المنافقون", 64: "التغابن", 65: "الطلاق", 66: "التحريم",
  67: "الملك", 68: "القلم", 69: "الحاقة", 70: "المعارج", 71: "نوح", 72: "الجن",
  73: "المزمل", 74: "المدثر", 75: "القيامة", 76: "الإنسان", 77: "المرسلات", 78: "النبأ",
  79: "النازعات", 80: "عبس", 81: "التكوير", 82: "الانفطار", 83: "المطففين", 84: "الانشقاق",
  85: "البروج", 86: "الطارق", 87: "الأعلى", 88: "الغاشية", 89: "الفجر", 90: "البلد",
  91: "الشمس", 92: "الليل", 93: "الضحى", 94: "الشرح", 95: "التين", 96: "العلق",
  97: "القدر", 98: "البينة", 99: "الزلزلة", 100: "العاديات", 101: "القارعة", 102: "التكاثر",
  103: "العصر", 104: "الهمزة", 105: "الفيل", 106: "قريش", 107: "الماعون", 108: "الكوثر",
  109: "الكافرون", 110: "النصر", 111: "المسد", 112: "الإخلاص", 113: "الفلق", 114: "الناس",
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  done: "مكتمل",
  missed: "فائت",
  incomplete: "غير مكتمل",
  cancelled: "ملغى",
};

const attendanceLabels: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "مستأذن",
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function getQuranProgressPercent(verseStatuses: string): number {
  try {
    const parsed = JSON.parse(verseStatuses || "{}");
    const keys = Object.keys(parsed);
    if (keys.length === 0) return 0;
    const memorized = keys.filter(k => parsed[k] === "memorized").length;
    return Math.round((memorized / keys.length) * 100);
  } catch {
    return 0;
  }
}

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const [testimonialText, setTestimonialText] = useState("");
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [testimonialSubmitting, setTestimonialSubmitting] = useState(false);
  const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    fetch("/api/family/children", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setChildren(data);
        if (data.length > 0) setSelectedChild(data[0].id);
      })
      .catch(() => toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" }))
      .finally(() => setLoading(false));

    fetch("/api/family/testimonial", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.submitted) setTestimonialSubmitted(true);
      })
      .catch(() => {});
  }, []);

  const handleSubmitTestimonial = async () => {
    if (!testimonialText.trim()) {
      toast({ title: "تنبيه", description: "يرجى كتابة تعليقك", variant: "destructive" });
      return;
    }
    setTestimonialSubmitting(true);
    try {
      const res = await fetch("/api/family/testimonial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: testimonialRating, text: testimonialText.trim() }),
      });
      if (res.ok) {
        setTestimonialSubmitted(true);
        toast({ title: "شكراً لك!", description: "تم إرسال تقييمك بنجاح وسيظهر بعد مراجعة الإدارة", className: "bg-green-50 border-green-200 text-green-800" });
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إرسال التقييم", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setTestimonialSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">جاري تحميل بيانات أبنائك...</p>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold">لا يوجد أبناء مرتبطين</h2>
          <p className="text-muted-foreground">يرجى التواصل مع إدارة المسجد لربط حسابك بأبنائك</p>
        </div>
      </div>
    );
  }

  const child = children.find(c => c.id === selectedChild) || children[0];
  const isBoy = child.gender === "male" || child.gender === "ذكر";
  const childColorText = isBoy ? "text-blue-700" : "text-pink-700";
  const childColorBorder = isBoy ? "border-blue-200" : "border-pink-200";
  const childColorBg = isBoy ? "bg-blue-50" : "bg-pink-50";

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5 max-w-7xl mx-auto" dir="rtl" data-testid="parent-dashboard">
      {/* Welcome Section */}
      <div className="bg-gradient-to-l from-emerald-600 to-teal-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">أهلاً {user?.name}</h1>
            <p className="text-emerald-100 text-sm mt-1">
              متابعة تقدم {children.length > 1 ? `أبنائك الـ ${children.length}` : "ابنك"} في حفظ القرآن الكريم
            </p>
          </div>
        </div>
      </div>

      {/* Child Selection Tabs */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(c => {
            const isSelected = selectedChild === c.id;
            const isMale = c.gender === "male" || c.gender === "ذكر";
            return (
              <button
                key={c.id}
                data-testid={`button-child-${c.id}`}
                onClick={() => setSelectedChild(c.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                  isSelected
                    ? isMale
                      ? "bg-blue-50 border-blue-500 text-blue-700 shadow-md ring-2 ring-blue-200"
                      : "bg-pink-50 border-pink-500 text-pink-700 shadow-md ring-2 ring-pink-200"
                    : "bg-card border-border hover:border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isSelected
                    ? isMale ? "bg-blue-500 text-white" : "bg-pink-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isMale ? "♂" : "♀"}
                </div>
                {c.name}
                {!c.isActive && <Badge variant="secondary" className="text-[9px] mr-1">متوقف</Badge>}
              </button>
            );
          })}
        </div>
      )}

      {/* Child Header */}
      <div className={`rounded-xl border-2 ${childColorBorder} p-4 flex items-center gap-4 ${childColorBg}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
          isBoy ? "bg-blue-200 text-blue-700" : "bg-pink-200 text-pink-700"
        }`}>
          {child.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className={`text-lg font-bold ${childColorText}`}>{child.name}</h2>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Badge variant="outline" className={`text-xs ${childColorText} ${childColorBorder}`}>
              {LEVEL_NAMES[child.level] || `المستوى ${child.level}`}
            </Badge>
            <Badge variant={child.isActive ? "default" : "secondary"} className="text-[10px]">
              {child.isActive ? "نشط" : "متوقف"}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {child.studyMode === "online" ? "عن بُعد" : "حضوري"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[11px] text-muted-foreground">نسبة الحضور</p>
                <p className="text-2xl font-bold text-emerald-700" data-testid="text-attendance-rate">
                  {child.stats.attendanceRate}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {child.stats.presentCount} من {child.stats.totalAttendance}
                </p>
              </div>
              <CalendarCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <ProgressBar value={child.stats.attendanceRate} color="bg-emerald-500" />
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[11px] text-muted-foreground">إنجاز الواجبات</p>
                <p className="text-2xl font-bold text-amber-700" data-testid="text-completion-rate">
                  {child.stats.completionRate}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {child.stats.completedAssignments} من {child.stats.totalAssignments}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-amber-400" />
            </div>
            <ProgressBar value={child.stats.completionRate} color="bg-amber-500" />
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground">النقاط المكتسبة</p>
                <p className="text-2xl font-bold text-purple-700" data-testid="text-total-points">
                  {child.stats.totalPoints}
                </p>
              </div>
              <Gift className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${childColorBorder} ${childColorBg}/50`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground">المستوى</p>
                <p className={`text-lg font-bold ${childColorText}`} data-testid="text-child-level">
                  {LEVEL_NAMES[child.level] || `${child.level}`}
                </p>
              </div>
              <GraduationCap className={`w-8 h-8 ${isBoy ? "text-blue-400" : "text-pink-400"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Performance Summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              ملخص الأداء
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span>الحضور</span>
                <span className="font-medium text-emerald-600">{child.stats.attendanceRate}%</span>
              </div>
              <ProgressBar value={child.stats.attendanceRate} color="bg-emerald-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span>إنجاز الواجبات</span>
                <span className="font-medium text-amber-600">{child.stats.completionRate}%</span>
              </div>
              <ProgressBar value={child.stats.completionRate} color="bg-amber-500" />
            </div>
            <div className="grid grid-cols-4 gap-2 pt-3">
              <div className="text-center p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-700">{child.stats.presentCount}</p>
                <p className="text-[9px] text-muted-foreground">حضور</p>
              </div>
              <div className="text-center p-2.5 bg-red-50 rounded-lg border border-red-100">
                <XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-700">{child.stats.absentCount}</p>
                <p className="text-[9px] text-muted-foreground">غياب</p>
              </div>
              <div className="text-center p-2.5 bg-orange-50 rounded-lg border border-orange-100">
                <Clock className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-orange-700">{child.stats.lateCount}</p>
                <p className="text-[9px] text-muted-foreground">تأخر</p>
              </div>
              <div className="text-center p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                <BookOpen className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-700">{child.stats.completedAssignments}</p>
                <p className="text-[9px] text-muted-foreground">واجب مكتمل</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Assignments */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              آخر الواجبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {child.recentAssignments.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد واجبات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {child.recentAssignments.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border/50"
                    data-testid={`card-assignment-${a.id}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{a.surahName}</p>
                      <p className="text-xs text-muted-foreground">
                        الآيات {a.fromVerse} — {a.toVerse}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(a.scheduledDate).toLocaleDateString("ar-IQ")}
                      </p>
                    </div>
                    <div className="text-left space-y-1">
                      <Badge
                        variant={a.status === "done" ? "default" : a.status === "pending" ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {statusLabels[a.status] || a.status}
                      </Badge>
                      {a.grade !== null && a.grade !== undefined && (
                        <p className={`text-xs font-bold text-center ${
                          a.grade >= 80 ? "text-emerald-600" : a.grade >= 60 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {a.grade}/100
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              سجل الحضور والغياب
            </CardTitle>
          </CardHeader>
          <CardContent>
            {child.recentAttendance.length === 0 ? (
              <div className="text-center py-8">
                <CalendarCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد سجلات حضور حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                {child.recentAttendance.map(a => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      a.status === "present" ? "bg-emerald-50/50 border-emerald-100" :
                      a.status === "absent" ? "bg-red-50/50 border-red-100" :
                      a.status === "late" ? "bg-orange-50/50 border-orange-100" :
                      "bg-muted/50 border-border/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {a.status === "present" ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> :
                       a.status === "absent" ? <XCircle className="w-4 h-4 text-red-500 shrink-0" /> :
                       <Clock className="w-4 h-4 text-orange-500 shrink-0" />}
                      <span className="text-sm">{new Date(a.date).toLocaleDateString("ar-IQ", { weekday: "short", month: "short", day: "numeric" })}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        a.status === "present" ? "text-emerald-700 border-emerald-300" :
                        a.status === "absent" ? "text-red-700 border-red-300" :
                        a.status === "late" ? "text-orange-700 border-orange-300" :
                        ""
                      }`}
                    >
                      {attendanceLabels[a.status] || a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quran Progress */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-teal-600" />
              تقدم الحفظ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {child.quranProgress.length === 0 ? (
              <div className="text-center py-8">
                <BookMarked className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد بيانات حفظ حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {child.quranProgress
                  .sort((a, b) => a.surahNumber - b.surahNumber)
                  .map(p => {
                    const percent = getQuranProgressPercent(p.verseStatuses);
                    return (
                      <div key={p.surahNumber} className="p-3 bg-muted/40 rounded-lg border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {SURAH_NAMES[p.surahNumber] || `سورة ${p.surahNumber}`}
                          </span>
                          <span className={`text-xs font-bold ${
                            percent >= 80 ? "text-emerald-600" : percent >= 50 ? "text-amber-600" : "text-muted-foreground"
                          }`}>
                            {percent}%
                          </span>
                        </div>
                        <ProgressBar
                          value={percent}
                          color={percent >= 80 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-muted-foreground/40"}
                        />
                        {p.reviewStreak > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {p.reviewStreak} يوم مراجعة متتالي
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Badges Section */}
      {child.badges.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-600" />
              الشارات والأوسمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {child.badges.map(b => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-xl"
                >
                  <Award className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">{b.badgeName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(b.earnedAt).toLocaleDateString("ar-IQ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Children Overview */}
      {children.length > 1 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              نظرة شاملة — جميع الأبناء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {children.map(c => {
                const isM = c.gender === "male" || c.gender === "ذكر";
                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                      selectedChild === c.id
                        ? isM ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-200" : "border-pink-500 bg-pink-50/50 ring-2 ring-pink-200"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setSelectedChild(c.id)}
                    data-testid={`card-child-${c.id}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isM ? "bg-blue-200 text-blue-700" : "bg-pink-200 text-pink-700"
                      }`}>
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{LEVEL_NAMES[c.level] || `المستوى ${c.level}`}</p>
                      </div>
                      <Badge variant={c.isActive ? "default" : "secondary"} className="text-[9px]">
                        {c.isActive ? "نشط" : "متوقف"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-100">
                        <p className="text-xs font-bold text-emerald-600">{c.stats.attendanceRate}%</p>
                        <p className="text-[8px] text-muted-foreground">حضور</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-100">
                        <p className="text-xs font-bold text-amber-600">{c.stats.completionRate}%</p>
                        <p className="text-[8px] text-muted-foreground">إنجاز</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-1.5 border border-purple-100">
                        <p className="text-xs font-bold text-purple-600">{c.stats.totalPoints}</p>
                        <p className="text-[8px] text-muted-foreground">نقاط</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Testimonial / Rating Section */}
      <Card className="shadow-sm border-t-4 border-t-amber-400">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            قيّم نظام مُتْقِن
          </CardTitle>
        </CardHeader>
        <CardContent>
          {testimonialSubmitted ? (
            <div className="text-center py-6 space-y-2">
              <div className="w-14 h-14 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-medium text-emerald-700">شكراً لتقييمك!</p>
              <p className="text-sm text-muted-foreground">سيظهر تقييمك في الموقع بعد مراجعة الإدارة</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">ما تقييمك للنظام؟</p>
                <div className="flex items-center gap-1" dir="ltr">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTestimonialRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                      data-testid={`star-${n}`}
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          n <= (hoverRating || testimonialRating)
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Textarea
                  value={testimonialText}
                  onChange={e => setTestimonialText(e.target.value)}
                  placeholder="شاركنا رأيك في النظام... تجربتك ستساعد الآخرين"
                  className="min-h-[80px] resize-none"
                  maxLength={300}
                  data-testid="textarea-testimonial"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-left">{testimonialText.length}/300</p>
              </div>
              <Button
                onClick={handleSubmitTestimonial}
                disabled={!testimonialText.trim() || testimonialSubmitting}
                className="w-full sm:w-auto"
                data-testid="button-submit-testimonial"
              >
                {testimonialSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Send className="w-4 h-4 ml-2" />
                )}
                أرسل تقييمك
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
