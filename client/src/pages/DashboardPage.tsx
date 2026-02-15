import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, TrendingUp, MapPin, ShieldAlert, Activity, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

interface Stats {
  totalStudents?: number;
  totalTeachers?: number;
  totalSupervisors?: number;
  totalMosques?: number;
  totalAssignments?: number;
  completedAssignments?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user?.role === "student") {
      setLoadingStats(false);
      return;
    }
    fetch("/api/stats", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [user?.role]);

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const getDisplayStats = () => {
    if (!stats || isStudent) return [];

    if (isAdmin) {
      return [
        { title: "الطلاب", value: String(stats.totalStudents ?? 0), icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { title: "الأساتذة", value: String(stats.totalTeachers ?? 0), icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-100" },
        { title: "المشرفون", value: String(stats.totalSupervisors ?? 0), icon: ShieldAlert, color: "text-purple-600", bg: "bg-purple-100" },
        { title: "الجوامع", value: String(stats.totalMosques ?? 0), icon: Activity, color: "text-green-700", bg: "bg-green-50" },
        { title: "الواجبات المكتملة", value: String(stats.completedAssignments ?? 0), icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-100" },
        { title: "إجمالي الواجبات", value: String(stats.totalAssignments ?? 0), icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
      ];
    }

    if (isSupervisor) {
      return [
        { title: "الأساتذة", value: String(stats.totalTeachers ?? 0), icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-100" },
        { title: "الطلاب", value: String(stats.totalStudents ?? 0), icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { title: "الواجبات المكتملة", value: String(stats.completedAssignments ?? 0), icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-100" },
        { title: "إجمالي الواجبات", value: String(stats.totalAssignments ?? 0), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
      ];
    }

    if (isTeacher) {
      return [
        { title: "طلابي", value: String(stats.totalStudents ?? 0), icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { title: "الواجبات المكتملة", value: String(stats.completedAssignments ?? 0), icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-100" },
        { title: "إجمالي الواجبات", value: String(stats.totalAssignments ?? 0), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
      ];
    }

    return [];
  };

  const displayStats = getDisplayStats();

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-serif" data-testid="text-page-title">لوحة التحكم</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <MapPin className="w-4 h-4" />
            <p data-testid="text-mosque-name">{user?.mosqueName || (isAdmin ? "إدارة النظام" : "المسجد غير محدد")}</p>
          </div>
        </div>
      </div>

      {displayStats.length > 0 && (
        <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-' + Math.min(displayStats.length, 4)} gap-3 md:gap-4`}>
          {displayStats.map((stat, i) => (
            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow" data-testid={`card-stat-${i}`}>
              <CardContent className="p-3 md:p-6 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">{stat.title}</p>
                  <h3 className="text-lg md:text-2xl font-bold" data-testid={`text-stat-value-${i}`}>{loadingStats ? "..." : stat.value}</h3>
                </div>
                <div className={`p-2 md:p-3 rounded-full ${stat.bg} shrink-0`}>
                  <stat.icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isStudent && (
        <Card className="shadow-sm border-none">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">مرحباً بك في نظام مُتْقِن</p>
            <p className="text-sm mt-1">تابع واجباتك واختباراتك من القائمة الجانبية</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
