import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, CheckCircle, TrendingUp, MapPin, ShieldAlert, Activity, GraduationCap,
  BookOpen, ClipboardList, CalendarCheck, Star, Gift, Clock, Trophy,
  MessageSquare, AlertTriangle, Building2, Award, UserCircle, ArrowLeft,
  Wifi, ChevronLeft, BarChart3, UserCheck, UserX, Heart, Sparkles, Eye,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Link } from "wouter";

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

interface AttendanceSummary {
  today: number;
  absent: number;
  total: number;
}

interface RecentActivity {
  type: string;
  text: string;
  textEn: string;
  time: string;
  icon: any;
  color: string;
}

export default function DashboardPage() {
  const { user, previewRole, startPreview, effectiveRole } = useAuth();
  const { language } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);

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

  const isAdmin = currentRole === 'admin';
  const isSupervisor = currentRole === 'supervisor';
  const isTeacher = currentRole === 'teacher';
  const isStudent = currentRole === 'student';
  const isRealAdmin = user?.role === 'admin' && !previewRole;

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
    { href: "/ratings", label: "التقييمات", labelEn: "Ratings", icon: Star, color: "from-yellow-500 to-yellow-600", roles: ["admin", "teacher", "supervisor", "student"] },
    { href: "/courses", label: "الدورات", labelEn: "Courses", icon: Award, color: "from-pink-500 to-pink-600", roles: ["admin", "teacher", "supervisor", "student"] },
    { href: "/messages", label: "المحادثات", labelEn: "Messages", icon: MessageSquare, color: "from-indigo-500 to-indigo-600", roles: ["admin", "teacher", "student", "supervisor"] },
    { href: "/schedules", label: "الجدول", labelEn: "Schedules", icon: Clock, color: "from-cyan-500 to-cyan-600", roles: ["admin", "teacher", "supervisor"] },
    { href: "/competitions", label: "المسابقات", labelEn: "Competitions", icon: Trophy, color: "from-orange-500 to-orange-600", roles: ["admin", "teacher", "supervisor", "student"] },
    { href: "/reports", label: "التقارير", labelEn: "Reports", icon: BarChart3, color: "from-rose-500 to-rose-600", roles: ["admin", "supervisor"] },
    { href: "/teachers", label: "الأساتذة", labelEn: "Teachers", icon: GraduationCap, color: "from-lime-500 to-lime-600", roles: ["admin", "supervisor"] },
  ].filter(l => l.roles.includes(currentRole ?? ""));

  const previewButtons = [
    { role: "student" as const, label: "معاينة كطالب", labelEn: "View as Student", icon: Users, color: "from-blue-500 to-blue-600", desc: "شاهد ما يراه الطالب", descEn: "See what students see" },
    { role: "teacher" as const, label: "معاينة كأستاذ", labelEn: "View as Teacher", icon: GraduationCap, color: "from-emerald-500 to-emerald-600", desc: "شاهد ما يراه الأستاذ", descEn: "See what teachers see" },
    { role: "supervisor" as const, label: "معاينة كمشرف", labelEn: "View as Supervisor", icon: UserCircle, color: "from-purple-500 to-purple-600", desc: "شاهد ما يراه المشرف", descEn: "See what supervisors see" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5" data-testid="dashboard-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gradient-to-l from-accent/5 to-transparent p-4 md:p-5 rounded-xl border border-accent/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-page-title">
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
              : new Date().toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
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

      {!isStudent && stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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

      {isStudent && (
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
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
    </div>
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
    red: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-600 dark:text-red-400", ring: "ring-red-200 dark:ring-red-800" },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow" data-testid={`stat-${title}`}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] md:text-xs font-medium text-muted-foreground truncate">{title}</p>
            <h3 className="text-xl md:text-2xl font-bold mt-1">{loading ? "..." : value.toLocaleString("ar-IQ")}</h3>
            {subtitle && <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${c.bg} shrink-0`}>
            <Icon className={`w-4 h-4 md:w-5 md:h-5 ${c.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
