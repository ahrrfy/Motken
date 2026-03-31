import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, CheckCircle, TrendingUp, MapPin, ShieldAlert, Activity, GraduationCap,
  BookOpen, ClipboardList, CalendarCheck, Star, Gift, Clock, Trophy,
  MessageSquare, AlertTriangle, Building2, Award, UserCircle, ArrowLeft,
  Wifi, ChevronLeft, BarChart3, UserCheck, UserX, Heart, Sparkles, Eye,
  Flame, ArrowUpRight, ArrowDownRight, Minus, Brain, Target, Medal,
  Crown, Zap, BookMarked,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Link } from "wouter";
import { authenticHadiths } from "@shared/hadiths";
import { formatDateAr } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Stats {
  totalStudents?: number;
  totalTeachers?: number;
  totalSupervisors?: number;
  totalMosques?: number;
  totalAssignments?: number;
  completedAssignments?: number;
  pendingAssignments?: number;
  activeStudents?: number;
  inactiveStudents?: number;
  specialNeedsStudents?: number;
  orphanStudents?: number;
}

interface GrowthData {
  userGrowth: Array<{ month: string; count: number }>;
  assignmentActivity: Array<{ month: string; total: number; completed: number }>;
}

interface AttendanceSummary {
  today: number;
  absent: number;
  total: number;
}

interface HeatmapEntry {
  date: string;
  count: number;
}

interface StarOfWeek {
  star: {
    student: { id: string; name: string; level: number; avatar?: string };
    score: number;
    details: { attendance: number; assignments: number; points: number };
  } | null;
  topStudents: {
    student: { id: string; name: string; level: number; avatar?: string };
    score: number;
  }[];
}

interface StreaksData {
  currentStreak: number;
  maxStreak: number;
  totalPresent: number;
  totalRecords: number;
}

interface PredictionData {
  prediction: {
    progressPercent: number;
    versesPerWeek: number;
    predictedCompletionDate: string;
    trend: string;
    avgGrade: number;
  } | null;
}

interface SmartReviewData {
  todayReview: { surah: string; ayahRange: string; urgency: string; lastReviewed?: string }[];
  weakSpots: { surah: string; issue: string }[];
}

interface DailySummaryItem {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  data: any;
  actionType: 'whatsapp' | 'navigate';
  actionTarget?: string;
}

interface DailySummary {
  items: DailySummaryItem[];
}

interface TeacherPerformance {
  teacherId: string;
  name: string;
  gradingSpeed: number;
  avgGrade: number;
  assignmentFrequency: number;
  activeStudentsRatio: number;
}

interface TeachingRecommendation {
  subject: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface MosqueHealth {
  score: number;
  attendance: number;
  completion: number;
  activeRatio: number;
}

export default function DashboardPage() {
  const { user, previewRole, startPreview, effectiveRole } = useAuth();
  const { language } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [hadithIndex, setHadithIndex] = useState(() => Math.floor(Math.random() * authenticHadiths.length));
  const [hadithFade, setHadithFade] = useState(true);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [mosqueHealth, setMosqueHealth] = useState<MosqueHealth | null>(null);
  const [teacherPerformances, setTeacherPerformances] = useState<TeacherPerformance[]>([]);
  const [teachingRecommendations, setTeachingRecommendations] = useState<TeachingRecommendation[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingTeacherStats, setLoadingTeacherStats] = useState(false);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);

  const isEn = language === "en";
  const currentRole = effectiveRole || user?.role;

  useEffect(() => {
    if (currentRole === "student") {
      setLoadingStats(false);
      return;
    }
    fetch("/api/stats", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [currentRole]);

  useEffect(() => {
    if (currentRole === "student") return;
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/attendance?date=${today}`, { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data)) {
          setAttendance({
            today: data.filter((r: any) => r.status === "present").length,
            absent: data.filter((r: any) => r.status === "absent").length,
            total: data.length,
          });
        }
      })
      .catch(() => {});
  }, [currentRole]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHadithFade(false);
      setTimeout(() => {
        setHadithIndex(prev => (prev + 1) % authenticHadiths.length);
        setHadithFade(true);
      }, 500);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isStudent) {
      setLoadingSummary(false);
      setLoadingHealth(false);
      return;
    }

    setLoadingSummary(true);
    fetch("/api/daily-summary", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setDailySummary(data); })
      .catch(() => {})
      .finally(() => setLoadingSummary(false));

    if (user?.mosqueId && (isAdmin || isSupervisor)) {
      setLoadingHealth(true);
      fetch(`/api/mosque-health/${user.mosqueId}`, { credentials: "include" })
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setMosqueHealth(data); })
        .catch(() => {})
        .finally(() => setLoadingHealth(false));

      setLoadingTeacherStats(true);
      fetch("/api/teacher-comparison", { credentials: "include" })
        .then(res => res.ok ? res.json() : [])
        .then(data => setTeacherPerformances(data))
        .catch(() => {})
        .finally(() => setLoadingTeacherStats(false));
    } else {
      setLoadingHealth(false);
    }

    if (currentRole === 'teacher' && user?.id) {
      fetch(`/api/teaching-recommendations/${user.id}`, { credentials: "include" })
        .then(res => res.ok ? res.json() : [])
        .then(data => setTeachingRecommendations(data))
        .catch(() => {});
    }
  }, [currentRole, user?.mosqueId]);

  const isAdmin = currentRole === 'admin';
  const isSupervisor = currentRole === 'supervisor';
  const isTeacher = currentRole === 'teacher';
  const isStudent = currentRole === 'student';

  useEffect(() => {
    if (isStudent) {
      setLoadingChallenges(true);
      fetch("/api/student-challenges", { credentials: "include" })
        .then(res => res.ok ? res.json() : [])
        .then(data => setChallenges(data))
        .catch(() => setChallenges([]))
        .finally(() => setLoadingChallenges(false));
    }
  }, [isStudent]);

  const isRealAdmin = user?.role === 'admin' && !previewRole;

  useEffect(() => {
    if (!isRealAdmin) return;
    fetch("/api/stats/growth", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setGrowthData(data); })
      .catch(() => {});
  }, [isRealAdmin]);

  const completionRate = stats?.totalAssignments
    ? Math.round(((stats.completedAssignments ?? 0) / stats.totalAssignments) * 100)
    : 0;

  const attendanceRate = attendance?.total
    ? Math.round((attendance.today / attendance.total) * 100)
    : 0;

  const quickLinks = [
    { href: "/students", label: "الطلاب", labelEn: "Students", icon: Users, color: "from-blue-500 to-blue-600", roles: ["admin", "teacher", "supervisor"] },
    { href: "/assignments", label: "الواجبات", labelEn: "Assignments", icon: ClipboardList, color: "from-amber-500 to-amber-600", roles: ["admin", "teacher", "supervisor", "student"] },
    { href: "/attendance", label: "الحضور", labelEn: "Attendance", icon: CalendarCheck, color: "from-emerald-500 to-emerald-600", roles: ["admin", "teacher", "supervisor"] },
    { href: "/quran", label: "الحفظ", labelEn: "Quran", icon: BookOpen, color: "from-teal-500 to-teal-600", roles: ["admin", "teacher", "student", "supervisor"] },
    { href: "/points-rewards", label: "النقاط", labelEn: "Points", icon: Gift, color: "from-purple-500 to-purple-600", roles: ["admin", "teacher", "student", "supervisor"] },
    { href: "/courses", label: "الدورات", labelEn: "Courses", icon: Award, color: "from-pink-500 to-pink-600", roles: ["admin", "teacher", "supervisor", "student"] },
    { href: "/messages", label: "المحادثات", labelEn: "Messages", icon: MessageSquare, color: "from-indigo-500 to-indigo-600", roles: ["admin", "teacher", "student", "supervisor"] },
    { href: "/reports", label: "التقارير", labelEn: "Reports", icon: BarChart3, color: "from-rose-500 to-rose-600", roles: ["admin", "supervisor"] },
    { href: "/teachers", label: "الأساتذة", labelEn: "Teachers", icon: GraduationCap, color: "from-lime-500 to-lime-600", roles: ["admin", "supervisor"] },
  ].filter(l => l.roles.includes(currentRole ?? ""));

  const previewButtons = [
    { role: "student" as const, label: "معاينة كطالب", labelEn: "View as Student", icon: Users, color: "from-blue-500 to-blue-600", desc: "شاهد ما يراه الطالب", descEn: "See what students see" },
    { role: "teacher" as const, label: "معاينة كأستاذ", labelEn: "View as Teacher", icon: GraduationCap, color: "from-emerald-500 to-emerald-600", desc: "شاهد ما يراه الأستاذ", descEn: "See what teachers see" },
    { role: "supervisor" as const, label: "معاينة كمشرف", labelEn: "View as Supervisor", icon: UserCircle, color: "from-purple-500 to-purple-600", desc: "شاهد ما يراه المشرف", descEn: "See what supervisors see" },
  ];

  const currentHadith = authenticHadiths[hadithIndex];

  return (
    <div className="p-4 md:p-6 space-y-5 page-transition" data-testid="dashboard-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gradient-to-l from-accent/5 to-transparent p-4 md:p-5 rounded-xl border border-accent/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-page-title-dashboard">
            {isEn ? "Dashboard" : "لوحة التحكم"}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <MapPin className="w-4 h-4" />
            <p data-testid="text-mosque-name">{user?.mosqueName || (isAdmin ? (isEn ? "System Administration" : "إدارة النظام") : (isEn ? "Mosque/Center" : "الجامع/المركز"))}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-3 py-1">
            {isEn
              ? new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              : formatDateAr(new Date())
            }
          </Badge>
        </div>
      </div>

      {isRealAdmin && (
        <Card className="border shadow-sm border-accent/20 bg-gradient-to-l from-accent/3 to-transparent" data-testid="card-preview-roles">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-accent" />
              {isEn ? "Role Preview" : "معاينة الأدوار"}
              <Badge variant="secondary" className="text-[10px] px-2 py-0">{isEn ? "Admin Only" : "للمدير فقط"}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {isEn ? "Preview the system from different user perspectives" : "شاهد النظام من منظور المستخدمين المختلفين"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {previewButtons.map((pb) => (
                <button
                  key={pb.role}
                  onClick={() => startPreview(pb.role)}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-md hover:scale-[1.01] transition-all duration-200 group text-start"
                  data-testid={`button-preview-${pb.role}`}
                >
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${pb.color} text-white shadow-sm group-hover:shadow-md transition-shadow shrink-0`}>
                    <pb.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{isEn ? pb.labelEn : pb.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{isEn ? pb.descEn : pb.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 border shadow-sm overflow-hidden" data-testid="card-smart-summary">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Brain className="w-5 h-5 text-accent" />
                {isEn ? "Smart Summary" : "الملخص الذكي"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingSummary ? (
                <div className="p-8 text-center text-muted-foreground italic">
                  {isEn ? "Analyzing data..." : "جاري تحليل البيانات..."}
                </div>
              ) : dailySummary?.items && dailySummary.items.length > 0 ? (
                <div className="divide-y divide-border">
                  {dailySummary.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/10 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-1.5 rounded-full ${
                          item.severity === 'critical' ? 'bg-red-100 text-red-600' :
                          item.severity === 'warning' ? 'bg-amber-100 text-amber-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {item.severity === 'critical' ? <AlertTriangle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-tight">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {item.actionType === 'whatsapp' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 gap-1.5"
                            onClick={() => {
                              const students = Array.isArray(item.data) ? item.data : [];
                              if (students.length > 0) {
                                const phones = students.map((s: any) => s.parentPhone).filter(Boolean);
                                if (phones.length > 0) {
                                  window.open(`https://wa.me/${phones[0]}`, '_blank');
                                }
                              }
                            }}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {isEn ? "Contact" : "تواصل"}
                          </Button>
                        ) : (
                          <Link href={item.actionTarget || '#'}>
                            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5">
                              {isEn ? "View" : "عرض"}
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                  {dailySummary.items.length > 3 && (
                    <Link href="/smart-alerts">
                      <button className="w-full py-2.5 text-xs text-muted-foreground hover:bg-muted/20 transition-colors">
                        {isEn ? `Show ${dailySummary.items.length - 3} more items` : `عرض ${dailySummary.items.length - 3} عناصر أخرى`}
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm italic">
                  {isEn ? "No important alerts for today" : "لا توجد تنبيهات هامة لليوم"}
                </div>
              )}
            </CardContent>
          </Card>

          {(isAdmin || isSupervisor) && (
            <Card className="border shadow-sm" data-testid="card-mosque-health">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  {isEn ? "Mosque Health Score" : "مؤشر صحة الجامع"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHealth ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="w-16 h-16 rounded-full border-4 border-muted border-t-accent animate-spin" />
                  </div>
                ) : mosqueHealth ? (
                  <div className="flex flex-col items-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/10" />
                        <circle
                          cx="50" cy="50" r="45" fill="none"
                          stroke="currentColor" strokeWidth="8"
                          strokeDasharray={`${mosqueHealth.score * 2.827} 282.7`}
                          strokeLinecap="round"
                          className={`transition-all duration-1000 ${
                            mosqueHealth.score >= 80 ? 'text-emerald-500' :
                            mosqueHealth.score >= 60 ? 'text-amber-500' :
                            'text-red-500'
                          }`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-black ${
                          mosqueHealth.score >= 80 ? 'text-emerald-600' :
                          mosqueHealth.score >= 60 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>{mosqueHealth.score}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Score</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 w-full mt-6 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{isEn ? "Att." : "حضور"}</p>
                        <p className="text-sm font-bold">{mosqueHealth.attendance}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{isEn ? "Comp." : "إنجاز"}</p>
                        <p className="text-sm font-bold">{mosqueHealth.completion}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{isEn ? "Active" : "نشط"}</p>
                        <p className="text-sm font-bold">{mosqueHealth.activeRatio}%</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground italic text-sm">
                    {isEn ? "Health score unavailable" : "مؤشر الصحة غير متاح حالياً"}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!isStudent && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(isAdmin || isSupervisor) && (
            <Card className="border shadow-sm" data-testid="card-teacher-comparison">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-500" />
                  {isEn ? "Teacher Comparison" : "مقارنة الأساتذة"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTeacherStats ? (
                  <div className="py-8 text-center text-muted-foreground animate-pulse">
                    {isEn ? "Loading metrics..." : "جاري تحميل المؤشرات..."}
                  </div>
                ) : teacherPerformances.length > 0 ? (
                  <div className="space-y-4">
                    {teacherPerformances.map((tp, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{tp.name}</span>
                          <span className="text-muted-foreground">{tp.avgGrade}% {isEn ? "Avg" : "متوسط"}</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${tp.avgGrade}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{tp.gradingSpeed}d {isEn ? "speed" : "سرعة"}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Activity className="w-3 h-3" />
                            <span>{tp.assignmentFrequency} {isEn ? "freq" : "تكرار"}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Users className="w-3 h-3" />
                            <span>{tp.activeStudentsRatio}% {isEn ? "active" : "نشط"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground italic text-sm">
                    {isEn ? "No teacher data available" : "لا توجد بيانات أساتذة متاحة"}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isTeacher && (
            <Card className="border shadow-sm" data-testid="card-teaching-recommendations">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  {isEn ? "Teaching Recommendations" : "توصيات تعليمية"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teachingRecommendations.length > 0 ? (
                  <div className="space-y-3">
                    {teachingRecommendations.map((rec, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-muted/30 flex gap-3 items-start">
                        <div className={`mt-0.5 p-1 rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                          rec.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{rec.subject}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{rec.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground italic text-sm">
                    {isEn ? "No specific recommendations yet" : "لا توجد توصيات محددة حالياً"}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!isStudent && stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 stagger-children">
            {isAdmin && (
              <>
                <StatCard
                  title={isEn ? "Students" : "الطلاب"}
                  value={stats.totalStudents ?? 0}
                  icon={Users}
                  color="blue"
                  loading={loadingStats}
                  subtitle={
                    stats.activeStudents !== undefined
                      ? `${isEn ? "Active" : "نشط"}: ${stats.activeStudents} | ${isEn ? "Archived" : "مؤرشف"}: ${stats.inactiveStudents ?? 0}`
                      : undefined
                  }
                />
                <StatCard
                  title={isEn ? "Teachers" : "الأساتذة"}
                  value={stats.totalTeachers ?? 0}
                  icon={GraduationCap}
                  color="emerald"
                  loading={loadingStats}
                />
                <StatCard
                  title={isEn ? "Supervisors" : "المشرفون"}
                  value={stats.totalSupervisors ?? 0}
                  icon={ShieldAlert}
                  color="purple"
                  loading={loadingStats}
                />
                <StatCard
                  title={isEn ? "Mosques & Centers" : "الجوامع والمراكز"}
                  value={stats.totalMosques ?? 0}
                  icon={Building2}
                  color="green"
                  loading={loadingStats}
                />
              </>
            )}
            {isSupervisor && (
              <>
                <StatCard title={isEn ? "Teachers" : "الأساتذة"} value={stats.totalTeachers ?? 0} icon={GraduationCap} color="emerald" loading={loadingStats} />
                <StatCard
                  title={isEn ? "Students" : "الطلاب"}
                  value={stats.totalStudents ?? 0}
                  icon={Users}
                  color="blue"
                  loading={loadingStats}
                  subtitle={stats.activeStudents !== undefined ? `${isEn ? "Active" : "نشط"}: ${stats.activeStudents}` : undefined}
                />
              </>
            )}
            {isTeacher && (
              <StatCard
                title={isEn ? "My Students" : "طلابي"}
                value={stats.totalStudents ?? 0}
                icon={Users}
                color="blue"
                loading={loadingStats}
                subtitle={stats.activeStudents !== undefined ? `${isEn ? "Active" : "نشط"}: ${stats.activeStudents}` : undefined}
              />
            )}

            <StatCard
              title={isEn ? "Total Assignments" : "إجمالي الواجبات"}
              value={stats.totalAssignments ?? 0}
              icon={ClipboardList}
              color="amber"
              loading={loadingStats}
            />
            <StatCard
              title={isEn ? "Completed" : "مكتملة"}
              value={stats.completedAssignments ?? 0}
              icon={CheckCircle}
              color="teal"
              loading={loadingStats}
              subtitle={stats.totalAssignments ? `${completionRate}%` : undefined}
            />
            {(stats.pendingAssignments ?? 0) > 0 && (
              <StatCard
                title={isEn ? "Pending" : "معلّقة"}
                value={stats.pendingAssignments ?? 0}
                icon={AlertTriangle}
                color="orange"
                loading={loadingStats}
              />
            )}
          </div>

          {isRealAdmin && growthData && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  {isEn ? "System Growth" : "نمو النظام"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {isEn ? "New Users (monthly)" : "مستخدمون جدد شهرياً"}
                    </p>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={growthData.userGrowth}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => new Date(v + "-01").toLocaleDateString("ar-EG", { month: "short" })}
                        />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                        <Tooltip
                          formatter={(v) => [v, isEn ? "Users" : "مستخدم"]}
                          labelFormatter={(v) => new Date(v + "-01").toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}
                        />
                        <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {isEn ? "Assignment Activity (monthly)" : "نشاط الواجبات شهرياً"}
                    </p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={growthData.assignmentActivity}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => new Date(v + "-01").toLocaleDateString("ar-EG", { month: "short" })}
                        />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                        <Tooltip
                          formatter={(v, name) => [v, name === "completed" ? (isEn ? "Completed" : "مكتملة") : (isEn ? "Total" : "إجمالي")]}
                          labelFormatter={(v) => new Date(v + "-01").toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}
                        />
                        <Bar dataKey="total" fill="#6366f1" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="completed" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border shadow-sm" data-testid="card-completion-rate">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {isEn ? "Assignment Completion Rate" : "نسبة إنجاز الواجبات"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                      <circle
                        cx="40" cy="40" r="34" fill="none"
                        stroke="currentColor" strokeWidth="6"
                        strokeDasharray={`${completionRate * 2.136} 213.6`}
                        strokeLinecap="round"
                        className="text-emerald-500 transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">{loadingStats ? "..." : `${completionRate}%`}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isEn ? "Completed" : "مكتملة"}</span>
                      <span className="font-medium text-emerald-600">{stats.completedAssignments ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isEn ? "Pending" : "معلّقة"}</span>
                      <span className="font-medium text-amber-600">{stats.pendingAssignments ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isEn ? "Total" : "الإجمالي"}</span>
                      <span className="font-bold">{stats.totalAssignments ?? 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {attendance && (
              <Card className="border shadow-sm" data-testid="card-attendance-today">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4" />
                    {isEn ? "Today's Attendance" : "حضور اليوم"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 shrink-0">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                        <circle
                          cx="40" cy="40" r="34" fill="none"
                          stroke="currentColor" strokeWidth="6"
                          strokeDasharray={`${attendanceRate * 2.136} 213.6`}
                          strokeLinecap="round"
                          className="text-blue-500 transition-all duration-700"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold">{attendanceRate}%</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-muted-foreground">{isEn ? "Present" : "حاضر"}</span>
                        </div>
                        <span className="font-medium text-emerald-600">{attendance.today}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5">
                          <UserX className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-muted-foreground">{isEn ? "Absent" : "غائب"}</span>
                        </div>
                        <span className="font-medium text-red-600">{attendance.absent}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{isEn ? "Recorded" : "مسجّل"}</span>
                        <span className="font-bold">{attendance.total}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <Card className="border shadow-sm" data-testid="card-student-breakdown">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {isEn ? "Student Breakdown" : "تفاصيل الطلاب"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      <span>{isEn ? "Active" : "نشطون"}</span>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{stats.activeStudents ?? 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <UserX className="w-4 h-4 text-gray-400" />
                      <span>{isEn ? "Archived" : "مؤرشفون"}</span>
                    </div>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{stats.inactiveStudents ?? 0}</Badge>
                  </div>
                  {(stats.specialNeedsStudents ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span>{isEn ? "Special Needs" : "ذوو احتياجات خاصة"}</span>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{stats.specialNeedsStudents}</Badge>
                    </div>
                  )}
                  {(stats.orphanStudents ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span>{isEn ? "Orphans" : "أيتام"}</span>
                      </div>
                      <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">{stats.orphanStudents}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {!isStudent && user?.id && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HeatmapCard userId={user.id} isEn={isEn} />
          <StarOfWeekCard isEn={isEn} />
        </div>
      )}

      {isStudent && user?.id && (
        <div className="space-y-4">
          <Card className="shadow-sm border bg-gradient-to-l from-accent/5 to-transparent">
            <CardContent className="p-6 md:p-8 text-center">
              <BookOpen className="w-14 h-14 mx-auto mb-4 text-accent/40" />
              <p className="text-xl font-semibold">{isEn ? "Welcome to Mutqin" : "مرحباً بك في نظام مُتْقِن"}</p>
              <p className="text-sm mt-2 text-muted-foreground">{isEn ? "Track your assignments and progress from the sidebar" : "تابع واجباتك وتقدمك من القائمة الجانبية"}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StreaksCard userId={user.id} isEn={isEn} />
            <PredictionCard userId={user.id} isEn={isEn} />
          </div>

          <SmartReviewCard userId={user.id} isEn={isEn} />

          {challenges.length > 0 && (
            <Card className="border shadow-sm overflow-hidden" data-testid="card-weekly-challenges">
              <CardHeader className="bg-blue-50/50 pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-700">
                  <Target className="w-4 h-4" />
                  {isEn ? "Weekly Challenges" : "تحديات الأسبوع"}
                  <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">
                    {challenges.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {challenges.map((c, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold">{c.title}</p>
                        <p className="text-[10px] text-muted-foreground">{c.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700">
                        +{c.reward} {isEn ? "pts" : "نقطة"}
                      </Badge>
                    </div>
                    <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 right-0 h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, (c.current / c.target) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>{c.current} / {c.target}</span>
                      <span>{Math.round((c.current / c.target) * 100)}%</span>
                    </div>
                  </div>
                ))}
                <Link href="/quran">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 mt-2 gap-1">
                    {isEn ? "View all achievements" : "عرض كافة الإنجازات"}
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isStudent && !user?.id && (
        <Card className="shadow-sm border bg-gradient-to-l from-accent/5 to-transparent">
          <CardContent className="p-6 md:p-8 text-center">
            <BookOpen className="w-14 h-14 mx-auto mb-4 text-accent/40" />
            <p className="text-xl font-semibold">{isEn ? "Welcome to Mutqin" : "مرحباً بك في نظام مُتْقِن"}</p>
            <p className="text-sm mt-2 text-muted-foreground">{isEn ? "Track your assignments and progress from the sidebar" : "تابع واجباتك وتقدمك من القائمة الجانبية"}</p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          {isEn ? "Quick Access" : "وصول سريع"}
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3 stagger-children">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div
                className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl bg-card border hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
                data-testid={`quick-link-${link.href.replace('/', '')}`}
              >
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${link.color} text-white shadow-sm group-hover:shadow-md transition-shadow`}>
                  <link.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-center truncate w-full">{isEn ? link.labelEn : link.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Card className="border-0 shadow-none bg-gradient-to-r from-emerald-900/10 via-emerald-800/10 to-emerald-900/10 dark:from-emerald-900/30 dark:via-emerald-800/30 dark:to-emerald-900/30 overflow-hidden" data-testid="card-hadith-ticker">
        <CardContent className="p-4">
          <div className={`flex items-center justify-center gap-3 transition-opacity duration-500 ${hadithFade ? 'opacity-100' : 'opacity-0'}`} dir="rtl">
            <BookMarked className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">«{currentHadith.text}»</p>
              <p className="text-[11px] text-muted-foreground mt-1">— {currentHadith.source}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HeatmapCard({ userId, isEn }: { userId: string; isEn: boolean }) {
  const [data, setData] = useState<HeatmapEntry[]>([]);

  useEffect(() => {
    fetch(`/api/activity-heatmap/${userId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setData)
      .catch(() => {});
  }, [userId]);

  const today = new Date();
  const days: { date: string; count: number; dayOfWeek: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const found = data.find(x => x.date === dateStr);
    days.push({ date: dateStr, count: found?.count || 0, dayOfWeek: d.getDay() });
  }

  const weeks: typeof days[] = [];
  let currentWeek: typeof days = [];
  days.forEach((day, i) => {
    currentWeek.push(day);
    if (day.dayOfWeek === 6 || i === days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted/30 dark:bg-muted/20";
    if (count <= 2) return "bg-emerald-200 dark:bg-emerald-800";
    if (count <= 4) return "bg-emerald-400 dark:bg-emerald-600";
    return "bg-emerald-600 dark:bg-emerald-400";
  };

  const totalActivity = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card data-testid="card-activity-heatmap">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" />
          {isEn ? "Activity Map" : "خريطة النشاط"}
          <Badge variant="secondary" className="text-[10px] px-2 py-0 ms-auto">
            {totalActivity} {isEn ? "actions" : "نشاط"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-[2px] overflow-x-auto pb-2" dir="ltr">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-colors`}
                  title={`${day.date}: ${day.count} ${isEn ? "actions" : "نشاط"}`}
                  data-testid={`heatmap-cell-${day.date}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground" dir="ltr">
          <span>{isEn ? "Less" : "أقل"}</span>
          <div className="w-3 h-3 rounded-sm bg-muted/30" />
          <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600" />
          <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
          <span>{isEn ? "More" : "أكثر"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StarOfWeekCard({ isEn }: { isEn: boolean }) {
  const [data, setData] = useState<StarOfWeek | null>(null);

  useEffect(() => {
    fetch("/api/star-of-week", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];
  const medalLabels = [isEn ? "Gold" : "ذهبي", isEn ? "Silver" : "فضي", isEn ? "Bronze" : "برونزي"];

  return (
    <Card className="bg-gradient-to-br from-amber-50/50 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/10 border-amber-200/50 dark:border-amber-800/30" data-testid="card-star-of-week">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Crown className="w-4 h-4" />
          {isEn ? "Star of the Week" : "نجم الأسبوع"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data?.star ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-100/60 to-yellow-100/40 dark:from-amber-900/20 dark:to-yellow-900/10 border border-amber-200/50 dark:border-amber-700/30">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {data.star.student.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" data-testid="text-star-name">{data.star.student.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                    {isEn ? `Level ${data.star.student.level}` : `المستوى ${data.star.student.level}`}
                  </Badge>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{data.star.score} {isEn ? "pts" : "نقطة"}</span>
                </div>
              </div>
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-md bg-card border">
                <p className="text-xs text-muted-foreground">{isEn ? "Attendance" : "الحضور"}</p>
                <p className="text-sm font-bold text-emerald-600">{data.star.details.attendance}%</p>
              </div>
              <div className="p-2 rounded-md bg-card border">
                <p className="text-xs text-muted-foreground">{isEn ? "Tasks" : "الواجبات"}</p>
                <p className="text-sm font-bold text-blue-600">{data.star.details.assignments}</p>
              </div>
              <div className="p-2 rounded-md bg-card border">
                <p className="text-xs text-muted-foreground">{isEn ? "Points" : "النقاط"}</p>
                <p className="text-sm font-bold text-purple-600">{data.star.details.points}</p>
              </div>
            </div>

            {data.topStudents && data.topStudents.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] text-muted-foreground font-medium">{isEn ? "Top Students" : "أفضل الطلاب"}</p>
                {data.topStudents.slice(0, 3).map((s, i) => (
                  <div key={s.student.id} className="flex items-center gap-2 text-xs" data-testid={`star-top-${i}`}>
                    <Medal className={`w-3.5 h-3.5 ${medalColors[i] || "text-muted-foreground"}`} />
                    <span className="truncate flex-1">{s.student.name}</span>
                    <span className="text-muted-foreground font-medium">{s.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{isEn ? "No star data this week" : "لا توجد بيانات هذا الأسبوع"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StreaksCard({ userId, isEn }: { userId: string; isEn: boolean }) {
  const [data, setData] = useState<StreaksData | null>(null);

  useEffect(() => {
    fetch(`/api/student-streaks/${userId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, [userId]);

  const attendancePercent = data && data.totalRecords > 0
    ? Math.round((data.totalPresent / data.totalRecords) * 100)
    : 0;

  return (
    <Card className="border shadow-sm bg-gradient-to-br from-orange-50/50 to-red-50/30 dark:from-orange-950/20 dark:to-red-950/10 border-orange-200/50 dark:border-orange-800/30" data-testid="card-streaks">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
          <Flame className="w-4 h-4" />
          {isEn ? "Attendance Streak" : "سلسلة الحضور"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="relative">
                  <Flame className="w-12 h-12 text-orange-500 mx-auto" />
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-lg text-white pt-1" data-testid="text-current-streak">
                    {data.currentStreak}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{isEn ? "Current" : "الحالية"}</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-max-streak">{data.maxStreak}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{isEn ? "Best" : "الأفضل"}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{isEn ? "Attendance Rate" : "نسبة الحضور"}</span>
                <span className="font-medium">{attendancePercent}%</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${attendancePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{data.totalPresent} {isEn ? "present" : "حضور"}</span>
                <span>{data.totalRecords} {isEn ? "total" : "إجمالي"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Flame className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{isEn ? "No streak data yet" : "لا توجد بيانات بعد"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PredictionCard({ userId, isEn }: { userId: string; isEn: boolean }) {
  const [data, setData] = useState<PredictionData | null>(null);

  useEffect(() => {
    fetch(`/api/prediction/${userId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, [userId]);

  const prediction = data?.prediction;

  const TrendIcon = prediction?.trend === "up" ? ArrowUpRight
    : prediction?.trend === "down" ? ArrowDownRight
    : Minus;

  const trendColor = prediction?.trend === "up" ? "text-emerald-500"
    : prediction?.trend === "down" ? "text-red-500"
    : "text-muted-foreground";

  const trendLabel = prediction?.trend === "up" ? (isEn ? "Improving" : "تحسّن")
    : prediction?.trend === "down" ? (isEn ? "Declining" : "تراجع")
    : (isEn ? "Stable" : "مستقر");

  return (
    <Card className="border shadow-sm bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-200/50 dark:border-blue-800/30" data-testid="card-prediction">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
          <Target className="w-4 h-4" />
          {isEn ? "Performance Prediction" : "توقع الأداء"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {prediction ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{isEn ? "Quran Progress" : "تقدم الحفظ"}</span>
                <span className="font-medium" data-testid="text-progress-percent">{prediction.progressPercent}%</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(prediction.progressPercent, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-md bg-card border text-center">
                <p className="text-[10px] text-muted-foreground">{isEn ? "Verses/Week" : "آيات/أسبوع"}</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400" data-testid="text-verses-per-week">{prediction.versesPerWeek}</p>
              </div>
              <div className="p-2 rounded-md bg-card border text-center">
                <p className="text-[10px] text-muted-foreground">{isEn ? "Avg Grade" : "متوسط الدرجة"}</p>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{prediction.avgGrade}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-card border">
              <div>
                <p className="text-[10px] text-muted-foreground">{isEn ? "Predicted Completion" : "تاريخ الإتمام المتوقع"}</p>
                <p className="text-xs font-medium" data-testid="text-predicted-date">
                  {prediction.predictedCompletionDate ? (isEn ? new Date(prediction.predictedCompletionDate).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : formatDateAr(prediction.predictedCompletionDate)) : (isEn ? "N/A" : "غير محدد")}
                </p>
              </div>
              <div className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-xs font-medium">{trendLabel}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{isEn ? "Not enough data for prediction" : "لا توجد بيانات كافية للتوقع"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SmartReviewCard({ userId, isEn }: { userId: string; isEn: boolean }) {
  const [data, setData] = useState<SmartReviewData | null>(null);

  useEffect(() => {
    fetch(`/api/smart-review/${userId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, [userId]);

  const urgencyColor = (urgency: string) => {
    if (urgency === "high") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (urgency === "medium") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  };

  const urgencyLabel = (urgency: string) => {
    if (urgency === "high") return isEn ? "Urgent" : "عاجل";
    if (urgency === "medium") return isEn ? "Medium" : "متوسط";
    return isEn ? "Low" : "منخفض";
  };

  return (
    <Card className="border shadow-sm" data-testid="card-smart-review">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Brain className="w-4 h-4" />
          {isEn ? "Smart Review Suggestions" : "اقتراحات المراجعة الذكية"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data && (data.todayReview?.length > 0 || data.weakSpots?.length > 0) ? (
          <div className="space-y-3">
            {data.todayReview?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{isEn ? "Today's Review" : "مراجعة اليوم"}</p>
                {data.todayReview.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border" data-testid={`review-item-${i}`}>
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.surah} ({item.ayahRange})</p>
                      {item.lastReviewed && (
                        <p className="text-[10px] text-muted-foreground">
                          {isEn ? "Last reviewed: " : "آخر مراجعة: "}{item.lastReviewed}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shrink-0 ${urgencyColor(item.urgency)}`}>
                      {urgencyLabel(item.urgency)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {data.weakSpots?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{isEn ? "Weak Spots" : "نقاط الضعف"}</p>
                {data.weakSpots.map((spot, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-md bg-red-50/50 dark:bg-red-950/10 border border-red-200/30 dark:border-red-800/20" data-testid={`weak-spot-${i}`}>
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{spot.surah}: {spot.issue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{isEn ? "No review suggestions yet" : "لا توجد اقتراحات مراجعة بعد"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ title, value, icon: Icon, color, loading, subtitle }: {
  title: string;
  value: number;
  icon: any;
  color: string;
  loading: boolean;
  subtitle?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    blue: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-200 dark:ring-blue-800" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-800" },
    purple: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-200 dark:ring-purple-800" },
    green: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-600 dark:text-green-400", ring: "ring-green-200 dark:ring-green-800" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-200 dark:ring-amber-800" },
    teal: { bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-600 dark:text-teal-400", ring: "ring-teal-200 dark:ring-teal-800" },
    orange: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-200 dark:ring-orange-800" },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <Card className={`border shadow-sm hover:shadow-md transition-shadow`} data-testid={`stat-card-${title}`}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-xl md:text-2xl font-bold mt-1">{loading ? "..." : value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${c.bg} ${c.text} shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}