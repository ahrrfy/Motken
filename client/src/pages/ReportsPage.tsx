import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Printer,
  Loader2,
  Filter,
  BarChart3,
  Building2,
  UserCheck,
  UserX,
  ShieldCheck,
  Award,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { exportMultiSheetExcel } from "@/lib/excel-utils";
import { openPrintWindow, generateStatsHtml, generateUsersTableHtml, generateSemesterReportHtml, generateAnnualSummaryHtml } from "@/lib/print-utils";
import { quranSurahs } from "@shared/quran-surahs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#6366f1"];
const LEVEL_NAMES = ["المستوى الأول", "المستوى الثاني", "المستوى الثالث", "المستوى الرابع", "المستوى الخامس", "المستوى السادس", "حافظ"];

interface StatsData {
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
  users?: any[];
  assignments?: any[];
}

interface Mosque {
  id: string;
  name: string;
  image?: string | null;
}

interface Teacher {
  id: string;
  name: string;
  role: string;
}

function gradeColor(grade: number): string {
  if (grade >= 90) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
  if (grade >= 75) return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
  if (grade >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
}

function QuranPassport({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [badges, setBadges] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [passportLoading, setPassportLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setPassportLoading(true);

    Promise.all([
      fetch(`/api/users?role=student`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/assignments?studentId=${studentId}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/points/total/${studentId}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/badges?userId=${studentId}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/attendance?studentId=${studentId}`, { credentials: "include" }).then((r) => r.json()).catch(() => []),
    ])
      .then(([students, assignmentsData, pointsData, badgesData, attendanceData]) => {
        const s = Array.isArray(students) ? students.find((u: any) => String(u.id) === String(studentId)) : null;
        setStudent(s || null);
        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
        setTotalPoints(pointsData?.total || pointsData?.points || 0);
        setBadges(Array.isArray(badgesData) ? badgesData : []);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      })
      .catch(() => {})
      .finally(() => setPassportLoading(false));
  }, [studentId]);

  if (passportLoading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="passport-loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-10 text-muted-foreground" data-testid="passport-no-student">
        لم يتم العثور على بيانات الطالب
      </div>
    );
  }

  const completedAssignments = assignments.filter((a: any) => a.status === "completed" || a.status === "graded").length;
  const totalAttendance = attendance.length;
  const presentCount = attendance.filter((a: any) => a.status === "present").length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const totalVerses = quranSurahs.reduce((sum, s) => sum + s.versesCount, 0);
  const memorizedVerses = assignments
    .filter((a: any) => a.status === "completed" || a.status === "graded")
    .reduce((sum: number, a: any) => {
      const from = a.fromVerse || 1;
      const to = a.toVerse || 1;
      return sum + Math.max(0, to - from + 1);
    }, 0);
  const progressPercent = totalVerses > 0 ? Math.min(100, Math.round((memorizedVerses / totalVerses) * 100)) : 0;

  const level = student.level || 1;
  const levelName = LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length) - 1] || LEVEL_NAMES[0];

  const joinDate = student.createdAt
    ? new Date(student.createdAt).toLocaleDateString("ar-SA")
    : new Date().toLocaleDateString("ar-SA");

  const recentGrades = assignments
    .filter((a: any) => a.grade != null)
    .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 5)
    .map((a: any) => {
      const surahByName = quranSurahs.find((s) => s.name === a.surahName || a.surahName?.includes(s.name));
      const surahByNum = a.surahNumber ? quranSurahs.find((s) => s.number === a.surahNumber) : null;
      const resolvedName = surahByName?.name || surahByNum?.name || a.surahName || "سورة";
      return {
        surahName: resolvedName,
        fromVerse: a.fromVerse || 1,
        toVerse: a.toVerse || 1,
        grade: a.grade,
      };
    });

  return (
    <div data-testid="quran-passport">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #quran-passport, #quran-passport * { visibility: visible; }
          #quran-passport { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
        }
      `}</style>
      <div id="quran-passport" className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-primary/20 p-6 max-w-2xl mx-auto space-y-6 print:border-0">
        <div className="text-center space-y-2 border-b-2 border-primary/20 pb-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-bold" data-testid="passport-avatar">
              {student?.name?.charAt(0)}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-primary" data-testid="passport-title">جواز سفر القرآن الكريم</h2>
          <p className="text-lg font-semibold" data-testid="passport-student-name">{student?.name}</p>
          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            <span data-testid="passport-level">المستوى: {levelName}</span>
            <span>|</span>
            <span data-testid="passport-join-date">تاريخ الانضمام: {joinDate}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center" data-testid="passport-stats">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3">
            <p className="text-2xl font-bold text-emerald-600" data-testid="passport-completed">{completedAssignments}</p>
            <p className="text-xs text-muted-foreground">واجبات مكتملة</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3">
            <p className="text-2xl font-bold text-blue-600" data-testid="passport-points">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">نقاط</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
            <p className="text-2xl font-bold text-amber-600" data-testid="passport-attendance">{attendanceRate}%</p>
            <p className="text-xs text-muted-foreground">نسبة الحضور</p>
          </div>
        </div>

        <div data-testid="passport-progress">
          <div className="flex justify-between text-sm mb-2">
            <span>تقدم الحفظ</span>
            <span data-testid="passport-progress-percent">{progressPercent}%</span>
          </div>
          <div className="h-4 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div data-testid="passport-badges">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            الإنجازات والأوسمة
          </h3>
          <div className="flex flex-wrap gap-2">
            {badges.length > 0 ? (
              badges.map((badge: any) => {
                let displayName = badge.badgeName || badge.name;
                const numMatch = displayName?.match(/حافظ سورة رقم (\d+)/);
                if (numMatch) {
                  const surah = quranSurahs.find(s => s.number === Number(numMatch[1]));
                  if (surah) displayName = `حافظ سورة ${surah.name}`;
                }
                return (
                <div key={badge.id} className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-medium" data-testid={`passport-badge-${badge.id}`}>
                  <Star className="w-3 h-3" />
                  {displayName}
                </div>
              );})

            ) : (
              <p className="text-sm text-muted-foreground">لا توجد أوسمة بعد</p>
            )}
          </div>
        </div>

        <div data-testid="passport-grades">
          <h3 className="font-semibold mb-3">آخر الدرجات</h3>
          <div className="space-y-2">
            {recentGrades.length > 0 ? (
              recentGrades.map((a, i) => (
                <div key={i} className="flex justify-between items-center bg-muted/20 rounded-lg px-3 py-2 text-sm" data-testid={`passport-grade-${i}`}>
                  <span>{a.surahName} ({a.fromVerse}-{a.toVerse})</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeColor(a.grade)}`}>{a.grade}/100</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد درجات بعد</p>
            )}
          </div>
        </div>

        <div className="text-center print:hidden">
          <Button onClick={() => window.print()} className="gap-2" data-testid="button-print-passport">
            <Printer className="w-4 h-4" />
            طباعة الجواز
          </Button>
        </div>
      </div>
    </div>
  );
}

function MosqueInfographic({ stats, isAdmin }: { stats: StatsData; isAdmin: boolean }) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [weekAttendance, setWeekAttendance] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/points/leaderboard", { credentials: "include" }).then((r) => r.json()).catch(() => []),
      fetch("/api/attendance", { credentials: "include" }).then((r) => r.json()).catch(() => []),
      fetch("/api/users?role=student", { credentials: "include" }).then((r) => r.json()).catch(() => []),
    ]).then(([lb, att, stu]) => {
      setLeaderboard(Array.isArray(lb) ? lb.slice(0, 5) : []);
      setStudents(Array.isArray(stu) ? stu : []);

      if (Array.isArray(att)) {
        const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekData = dayNames.map((name, idx) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + idx);
          const dayStr = dayDate.toISOString().split("T")[0];
          const dayRecords = att.filter((a: any) => {
            const d = a.date || a.createdAt || "";
            return d.startsWith(dayStr);
          });
          return {
            name,
            حاضر: dayRecords.filter((a: any) => a.status === "present").length,
            غائب: dayRecords.filter((a: any) => a.status === "absent").length,
          };
        });
        setWeekAttendance(weekData);
      }
    });
  }, []);

  const levelDistribution = LEVEL_NAMES.map((name, idx) => {
    const count = students.filter((s: any) => (s.level || 1) === idx + 1).length;
    return { name, count };
  }).filter((d) => d.count > 0);

  return (
    <div className="space-y-6" data-testid="mosque-infographic">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" data-testid="infographic-summary">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400" data-testid="infographic-students">{stats.totalStudents || 0}</p>
            <p className="text-xs text-blue-600/70">إجمالي الطلاب</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="infographic-teachers">{stats.totalTeachers || 0}</p>
            <p className="text-xs text-green-600/70">إجمالي الأساتذة</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400" data-testid="infographic-completed">{stats.completedAssignments || 0}</p>
            <p className="text-xs text-purple-600/70">واجبات مكتملة</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400" data-testid="infographic-total-assignments">{stats.totalAssignments || 0}</p>
            <p className="text-xs text-amber-600/70">إجمالي الواجبات</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="infographic-attendance-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              الحضور هذا الأسبوع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {weekAttendance.some((d) => d["حاضر"] > 0 || d["غائب"] > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekAttendance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="حاضر" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="غائب" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  لا توجد بيانات حضور لهذا الأسبوع
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="infographic-leaderboard">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              أفضل 5 طلاب بالنقاط
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry: any, idx: number) => (
                  <div key={entry.userId || idx} className="flex items-center gap-3" data-testid={`leaderboard-entry-${idx}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-700" : "bg-blue-500"}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{entry.userName || entry.name || `طالب ${idx + 1}`}</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star className="w-4 h-4" />
                      {entry.totalPoints || entry.points || 0}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات نقاط</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {levelDistribution.length > 0 && (
        <Card data-testid="infographic-levels">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              توزيع المستويات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="عدد الطلاب" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {levelDistribution.map((_entry, index) => (
                      <Cell key={`level-${index}`} fill={["#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"][index % 7]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData>({});
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedMosque, setSelectedMosque] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userMosqueData, setUserMosqueData] = useState<{ name?: string; image?: string | null }>({});
  const [activeTab, setActiveTab] = useState("statistics");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const isAdmin = user?.role === "admin";
  const isSupervisor = user?.role === "supervisor";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  useEffect(() => {
    fetch("/api/mosques", { credentials: "include" })
      .then((r) => r.json())
      .then((data: any[]) => {
        if (isAdmin) setMosques(data);
        if (user?.mosqueId) {
          const m = data.find((ms: any) => ms.id === user.mosqueId);
          if (m) setUserMosqueData({ name: m.name, image: m.image });
        }
      })
      .catch(() => {});
  }, [isAdmin, user?.mosqueId]);

  useEffect(() => {
    if (isAdmin || isSupervisor) {
      const url = isAdmin
        ? "/api/users?role=teacher"
        : "/api/users?role=teacher";
      fetch(url, { credentials: "include" })
        .then((r) => r.json())
        .then(setTeachers)
        .catch(() => {});
    }
  }, [isAdmin, isSupervisor]);

  useEffect(() => {
    fetch("/api/users?role=student", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isStudent) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedMosque) params.set("mosqueId", selectedMosque);
    if (selectedTeacher) params.set("teacherId", selectedTeacher);
    const qs = params.toString();
    fetch(`/api/stats${qs ? `?${qs}` : ""}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedMosque, selectedTeacher, isStudent]);

  if (isStudent) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]" data-testid="access-denied">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
            <p className="text-muted-foreground">
              ليس لديك صلاحية للوصول إلى صفحة التقارير
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cancelledAssignments =
    (stats.totalAssignments || 0) -
    (stats.completedAssignments || 0) -
    (stats.pendingAssignments || 0);

  const pieData = [
    { name: "مكتملة", value: stats.completedAssignments || 0 },
    { name: "معلقة", value: stats.pendingAssignments || 0 },
    { name: "ملغاة", value: cancelledAssignments > 0 ? cancelledAssignments : 0 },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: "نشط", count: stats.activeStudents || 0 },
    { name: "غير نشط", count: stats.inactiveStudents || 0 },
  ];

  const exportExcel = () => {
    const statsSheet: unknown[][] = [
      ["الإحصائية", "القيمة"],
      ["إجمالي الطلاب", stats.totalStudents || 0],
      ["إجمالي الأساتذة", stats.totalTeachers || 0],
      ...(isAdmin ? [["إجمالي المشرفين", stats.totalSupervisors || 0]] : []),
      ...(isAdmin ? [["إجمالي الجوامع والمراكز", stats.totalMosques || 0]] : []),
      ["إجمالي الواجبات", stats.totalAssignments || 0],
      ["الواجبات المكتملة", stats.completedAssignments || 0],
      ["الواجبات المعلقة", stats.pendingAssignments || 0],
      ["الطلاب النشطين", stats.activeStudents || 0],
      ["الطلاب غير النشطين", stats.inactiveStudents || 0],
      ["ذوي الاحتياجات الخاصة", stats.specialNeedsStudents || 0],
      ["الأيتام", stats.orphanStudents || 0],
    ];

    const sheets: { name: string; data: Record<string, unknown>[] | unknown[][] }[] = [
      { name: "Statistics", data: statsSheet },
    ];

    if (stats.users && stats.users.length > 0) {
      sheets.push({
        name: "Users",
        data: stats.users.map((u: any) => ({
          Name: u.name,
          Role: u.role,
          Username: u.username,
          Active: u.isActive ? "Yes" : "No",
          Phone: u.phone || "",
        })),
      });
    }

    exportMultiSheetExcel(sheets, "report.xlsx");
  };

  const printOpts = { mosqueName: userMosqueData.name, mosqueImage: userMosqueData.image || undefined };

  const exportPDF = () => {
    const content = generateStatsHtml(stats, isAdmin) + generateUsersTableHtml(stats.users || []);
    openPrintWindow("التقارير والإحصائيات", content, printOpts);
  };

  const exportWord = () => {
    const content = generateStatsHtml(stats, isAdmin) + generateUsersTableHtml(stats.users || []);
    openPrintWindow("التقارير والإحصائيات - تصدير", content, printOpts);
  };

  const handlePrint = () => {
    const content = generateStatsHtml(stats, isAdmin) + generateUsersTableHtml(stats.users || []);
    openPrintWindow("التقارير والإحصائيات", content, printOpts);
  };

  const handlePrintSemesterReport = async () => {
    if (!selectedStudentId) return;
    try {
      const [studentData, assignmentsData] = await Promise.all([
        fetch(`/api/users/${selectedStudentId}`).then(r => r.json()),
        fetch(`/api/assignments?studentId=${selectedStudentId}`).then(r => r.json())
      ]);
      
      const gradedAssignments = assignmentsData.filter((a: any) => a.grade != null).map((a: any) => {
        const surahByName = quranSurahs.find(s => s.name === a.surahName || a.surahName?.includes(s.name));
        const surahByNum = a.surahNumber ? quranSurahs.find(s => s.number === a.surahNumber) : null;
        return {
          ...a,
          surahName: surahByName?.name || surahByNum?.name || a.surahName || "سورة"
        };
      });

      const html = generateSemesterReportHtml(studentData, gradedAssignments, userMosqueData.name || "المركز");
      openPrintWindow(`تقرير الطالب ${studentData.name}`, html, printOpts);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintAnnualSummary = async () => {
    try {
      const leaderboard = await fetch("/api/points/leaderboard").then(r => r.json());
      const html = generateAnnualSummaryHtml(stats, leaderboard.slice(0, 10), userMosqueData.name || "المركز");
      openPrintWindow("التقرير السنوي", html, printOpts);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" data-testid="reports-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="reports-title">
            التقارير والإحصائيات
          </h1>
          <p className="text-muted-foreground">تحليل شامل لأداء الحلقات والطلاب</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-testid="reports-tabs">
        <TabsList className="" data-testid="reports-tabs-list">
          <TabsTrigger value="statistics" data-testid="tab-statistics">
            <BarChart3 className="w-4 h-4 ml-2" />
            الإحصائيات
          </TabsTrigger>
          <TabsTrigger value="passport" data-testid="tab-passport">
            <BookOpen className="w-4 h-4 ml-2" />
            جواز القرآن
          </TabsTrigger>
          <TabsTrigger value="infographic" data-testid="tab-infographic">
            <TrendingUp className="w-4 h-4 ml-2" />
            إنفوجرافيك
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statistics" className="space-y-4 md:space-y-6" data-testid="tab-content-statistics">
          {(isAdmin || isSupervisor) && (
            <div className="flex flex-wrap items-center gap-3" data-testid="filters-row">
              <Filter className="h-5 w-5 text-muted-foreground" />
              {isAdmin && (
                <SearchableSelect
                  options={[{ value: "all", label: "جميع الجوامع والمراكز" }, ...mosques.map((m) => ({ value: m.id, label: m.name }))]}
                  value={selectedMosque || "all"}
                  onValueChange={(val) => { setSelectedMosque(val === "all" ? "" : val); }}
                  placeholder="جميع الجوامع والمراكز"
                  searchPlaceholder="ابحث عن جامع..."
                  emptyText="لا يوجد جامع بهذا الاسم"
                  triggerClassName="w-full sm:w-[200px]"
                  data-testid="select-mosque-trigger"
                />
              )}
              <SearchableSelect
                options={[{ value: "all", label: "جميع الأساتذة" }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]}
                value={selectedTeacher || "all"}
                onValueChange={(val) => { setSelectedTeacher(val === "all" ? "" : val); }}
                placeholder="جميع الأساتذة"
                searchPlaceholder="ابحث عن أستاذ..."
                emptyText="لا يوجد أستاذ بهذا الاسم"
                triggerClassName="w-full sm:w-[200px]"
                data-testid="select-teacher-trigger"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2" data-testid="export-buttons">
            <Button variant="outline" onClick={exportExcel} data-testid="button-export-excel">
              <Download className="h-4 w-4 ml-2" />
              تصدير Excel
            </Button>
            <Button variant="outline" onClick={exportPDF} data-testid="button-export-pdf">
              <FileText className="h-4 w-4 ml-2" />
              تصدير PDF
            </Button>
            <Button variant="outline" onClick={exportWord} data-testid="button-export-word">
              <FileText className="h-4 w-4 ml-2" />
              تصدير Word
            </Button>
            <Button variant="outline" onClick={handlePrint} data-testid="button-print">
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
            <Button variant="outline" onClick={handlePrintAnnualSummary} data-testid="button-print-annual">
              <Printer className="h-4 w-4 ml-2" />
              طباعة التقرير السنوي
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20" data-testid="loading-spinner">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="stats-cards">
                <Card data-testid="card-total-students">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
                    <Users className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="value-total-students">
                      {stats.totalStudents || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-teachers">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الأساتذة</CardTitle>
                    <BookOpen className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="value-total-teachers">
                      {stats.totalTeachers || 0}
                    </div>
                  </CardContent>
                </Card>

                {isAdmin && (
                  <Card data-testid="card-total-supervisors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">إجمالي المشرفين</CardTitle>
                      <ShieldCheck className="h-5 w-5 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="value-total-supervisors">
                        {stats.totalSupervisors || 0}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isAdmin && (
                  <Card data-testid="card-total-mosques">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">إجمالي الجوامع والمراكز</CardTitle>
                      <Building2 className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="value-total-mosques">
                        {stats.totalMosques || 0}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card data-testid="card-total-assignments">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الواجبات</CardTitle>
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="value-total-assignments">
                      {stats.totalAssignments || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-completed-assignments">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">الواجبات المكتملة</CardTitle>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="value-completed-assignments">
                      {stats.completedAssignments || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-pending-assignments">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">الواجبات المعلقة</CardTitle>
                    <Clock className="h-5 w-5 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="value-pending-assignments">
                      {stats.pendingAssignments || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-active-students">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">الطلاب النشطين</CardTitle>
                    <UserCheck className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="value-active-students">
                        {stats.activeStudents || 0}
                      </span>
                      <Badge variant="secondary" data-testid="badge-inactive-students">
                        <UserX className="h-3 w-3 ml-1" />
                        {stats.inactiveStudents || 0} غير نشط
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-special-needs">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">ذوي الاحتياجات الخاصة</CardTitle>
                    <ShieldCheck className="h-5 w-5 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="value-special-needs">
                      {stats.specialNeedsStudents || 0}
                    </span>
                  </CardContent>
                </Card>

                <Card data-testid="card-orphans">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الأيتام</CardTitle>
                    <Users className="h-5 w-5 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="value-orphans">
                      {stats.orphanStudents || 0}
                    </span>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6" data-testid="charts-grid">
                <Card data-testid="chart-assignments-status">
                  <CardHeader>
                    <CardTitle>حالة الواجبات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px] sm:h-[280px] md:h-[300px] w-full">
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              fill="#8884d8"
                              paddingAngle={5}
                              dataKey="value"
                              label
                            >
                              {pieData.map((_entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground" data-testid="no-assignments-data">
                          لا توجد بيانات واجبات
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="chart-students-status">
                  <CardHeader>
                    <CardTitle>حالة الطلاب</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px] sm:h-[280px] md:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip cursor={{ fill: "transparent" }} />
                          <Bar
                            dataKey="count"
                            name="عدد الطلاب"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          >
                            {barData.map((_entry, index) => (
                              <Cell
                                key={`bar-${index}`}
                                fill={index === 0 ? "#22c55e" : "#ef4444"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {stats.users && stats.users.length > 0 && (
                <Card data-testid="users-table-card">
                  <CardHeader>
                    <CardTitle>قائمة المستخدمين</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" data-testid="users-table">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-2 sm:p-3 text-right font-medium">الاسم</th>
                            <th className="p-2 sm:p-3 text-right font-medium">الدور</th>
                            <th className="p-2 sm:p-3 text-right font-medium hidden sm:table-cell">اسم المستخدم</th>
                            <th className="p-2 sm:p-3 text-right font-medium">الحالة</th>
                            <th className="p-2 sm:p-3 text-right font-medium hidden md:table-cell">الهاتف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.users.map((u: any, i: number) => (
                            <tr key={u.id || i} className="border-b" data-testid={`row-user-${u.id || i}`}>
                              <td className="p-2 sm:p-3">{u.name}</td>
                              <td className="p-2 sm:p-3">
                                <Badge variant="outline">{u.role}</Badge>
                              </td>
                              <td className="p-2 sm:p-3 hidden sm:table-cell">{u.username}</td>
                              <td className="p-2 sm:p-3">
                                <Badge variant={u.isActive ? "default" : "secondary"}>
                                  {u.isActive ? "نشط" : "غير نشط"}
                                </Badge>
                              </td>
                              <td className="p-2 sm:p-3 hidden md:table-cell">{u.phone || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="passport" className="space-y-4" data-testid="tab-content-passport">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                جواز سفر القرآن الكريم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">اختر الطالب</label>
                <SearchableSelect
                  options={students.map((s) => ({ value: String(s.id), label: s.name }))}
                  value={selectedStudentId}
                  onValueChange={setSelectedStudentId}
                  placeholder="اختر طالباً لعرض جوازه"
                  searchPlaceholder="ابحث عن طالب..."
                  emptyText="لا يوجد طالب بهذا الاسم"
                  triggerClassName="w-full sm:w-[300px]"
                  data-testid="select-passport-student-trigger"
                />
                {selectedStudentId && (
                  <Button variant="outline" className="mr-4" onClick={handlePrintSemesterReport} data-testid="button-print-semester">
                    <Printer className="h-4 w-4 ml-2" />
                    طباعة تقرير الدرجات
                  </Button>
                )}
              </div>
              {selectedStudentId ? (
                <QuranPassport studentId={selectedStudentId} />
              ) : (
                <div className="text-center py-16 text-muted-foreground" data-testid="passport-placeholder">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">اختر طالباً لعرض جواز القرآن الكريم</p>
                  <p className="text-sm mt-1">سيتم عرض تقرير شامل عن رحلة حفظ الطالب</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infographic" className="space-y-4" data-testid="tab-content-infographic">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <MosqueInfographic stats={stats} isAdmin={isAdmin} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
