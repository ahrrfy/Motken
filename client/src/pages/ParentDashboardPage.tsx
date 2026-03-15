import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Users, BookOpen, CalendarCheck, Gift, TrendingUp, GraduationCap, CheckCircle2, XCircle, Clock
} from "lucide-react";

const RELATIONSHIP_LABELS: Record<string, string> = {
  parent: "ولي أمر",
  father: "أب",
  mother: "أم",
  guardian: "وصي",
  brother: "أخ",
  sister: "أخت",
  uncle: "عم / خال",
  grandfather: "جد",
  grandmother: "جدة",
  other: "أخرى",
};

interface ChildData {
  id: string;
  name: string;
  level: number;
  gender: string;
  studyMode: string;
  isActive: boolean;
  relationship?: string;
  stats: {
    totalAssignments: number;
    completedAssignments: number;
    completionRate: number;
    totalAttendance: number;
    presentCount: number;
    absentCount: number;
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
}

const LEVEL_NAMES: Record<number, string> = {
  1: "المستوى الأول",
  2: "المستوى الثاني",
  3: "المستوى الثالث",
  4: "المستوى الرابع",
  5: "المستوى الخامس",
  6: "المستوى السادس",
  7: "حافظ",
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  done: "مكتمل",
  missed: "فائت",
  incomplete: "غير مكتمل",
};

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/parents/my-children", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setChildren(data);
        if (data.length > 0) setSelectedChild(data[0].id);
      })
      .catch(() => toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">لا يوجد أبناء مرتبطين</h2>
        <p className="text-muted-foreground">يرجى التواصل مع إدارة المسجد لربط حسابك بأبنائك</p>
      </div>
    );
  }

  const child = children.find(c => c.id === selectedChild) || children[0];

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl" data-testid="parent-dashboard">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">أهلاً {user?.name}</h1>
          <p className="text-sm text-muted-foreground">متابعة تقدم أبنائك في حفظ القرآن الكريم</p>
        </div>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {children.map(c => (
            <button
              key={c.id}
              data-testid={`button-child-${c.id}`}
              onClick={() => setSelectedChild(c.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedChild === c.id
                  ? "bg-primary text-white shadow-md"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {c.name}
              {c.relationship && c.relationship !== "parent" && (
                <span className="text-[10px] opacity-75 mr-1">({RELATIONSHIP_LABELS[c.relationship] || c.relationship})</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">المستوى</p>
                <p className="text-lg font-bold text-blue-700" data-testid="text-child-level">
                  {LEVEL_NAMES[child.level] || `المستوى ${child.level}`}
                </p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">نسبة الحضور</p>
                <p className="text-lg font-bold text-green-700" data-testid="text-attendance-rate">
                  {child.stats.attendanceRate}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {child.stats.presentCount} حضور من {child.stats.totalAttendance}
                </p>
              </div>
              <CalendarCheck className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إنجاز الواجبات</p>
                <p className="text-lg font-bold text-amber-700" data-testid="text-completion-rate">
                  {child.stats.completionRate}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {child.stats.completedAssignments} من {child.stats.totalAssignments}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">النقاط</p>
                <p className="text-lg font-bold text-purple-700" data-testid="text-total-points">
                  {child.stats.totalPoints}
                </p>
              </div>
              <Gift className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              ملخص الأداء
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>الحضور</span>
                <span className="font-medium">{child.stats.attendanceRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-green-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${child.stats.attendanceRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>إنجاز الواجبات</span>
                <span className="font-medium">{child.stats.completionRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${child.stats.completionRate}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-700">{child.stats.presentCount}</p>
                <p className="text-[10px] text-muted-foreground">حضور</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-700">{child.stats.absentCount}</p>
                <p className="text-[10px] text-muted-foreground">غياب</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-700">{child.stats.completedAssignments}</p>
                <p className="text-[10px] text-muted-foreground">واجب مكتمل</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              آخر الواجبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {child.recentAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد واجبات حتى الآن</p>
            ) : (
              <div className="space-y-3">
                {child.recentAssignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid={`card-assignment-${a.id}`}>
                    <div>
                      <p className="font-medium text-sm">{a.surahName}</p>
                      <p className="text-xs text-muted-foreground">
                        الآيات {a.fromVerse} - {a.toVerse}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(a.scheduledDate).toLocaleDateString("ar-IQ")}
                      </p>
                    </div>
                    <div className="text-left">
                      <Badge
                        variant={a.status === "done" ? "default" : a.status === "pending" ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {statusLabels[a.status] || a.status}
                      </Badge>
                      {a.grade !== null && a.grade !== undefined && (
                        <p className="text-xs font-bold mt-1 text-center">
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
      </div>

      {children.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              جميع الأبناء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {children.map(c => (
                <div
                  key={c.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedChild === c.id ? "border-primary bg-primary/5" : "border-muted"
                  }`}
                  onClick={() => setSelectedChild(c.id)}
                  data-testid={`card-child-${c.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm">{c.name}</p>
                      {c.relationship && (
                        <p className="text-[10px] text-muted-foreground">{RELATIONSHIP_LABELS[c.relationship] || c.relationship}</p>
                      )}
                    </div>
                    <Badge variant={c.isActive ? "default" : "secondary"} className="text-[10px]">
                      {c.isActive ? "نشط" : "متوقف"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs font-bold text-green-600">{c.stats.attendanceRate}%</p>
                      <p className="text-[9px] text-muted-foreground">حضور</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-600">{c.stats.completionRate}%</p>
                      <p className="text-[9px] text-muted-foreground">إنجاز</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-purple-600">{c.stats.totalPoints}</p>
                      <p className="text-[9px] text-muted-foreground">نقاط</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
