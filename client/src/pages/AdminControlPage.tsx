import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Building2, Wifi, CheckCircle, Shield, Activity,
  Clock, ChevronRight, LayoutGrid, AlertCircle, Loader2,
} from "lucide-react";
import { Link } from "wouter";

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalSupervisors: number;
  totalMosques: number;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
}

interface Mosque {
  id: string;
  name: string;
  city?: string;
}

interface ActivityLog {
  id: string;
  userName: string;
  action: string;
  category?: string;
  createdAt: string;
}

interface PendingUser {
  id: string;
  name: string;
  username: string;
  role: string;
  createdAt: string;
}

interface MosqueHealth {
  score: number;
  activeStudents?: number;
  totalStudents?: number;
}

export default function AdminControlPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [enabledFeatures, setEnabledFeatures] = useState<number>(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [mosqueHealth, setMosqueHealth] = useState<Record<string, MosqueHealth>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches = [
      fetch("/api/stats", { credentials: "include" }).then(r => r.ok ? r.json() : null).then(d => d && setStats(d)),
      fetch("/api/admin/online-count", { credentials: "include" }).then(r => r.ok ? r.json() : null).then(d => d && setOnlineCount(d.count ?? 0)),
      fetch("/api/users/pending-approval", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(d => setPendingUsers(d)),
      fetch("/api/feature-flags", { credentials: "include" }).then(r => r.ok ? r.json() : []).then((d: any[]) => setEnabledFeatures(d.filter(f => f.isEnabled).length)),
      fetch("/api/activity-logs?limit=15", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(d => setActivityLogs(d.slice(0, 15))),
      fetch("/api/mosques", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(d => setMosques(d)),
    ];
    Promise.all(fetches).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (mosques.length === 0) return;
    const first10 = mosques.slice(0, 10);
    Promise.all(
      first10.map(m =>
        fetch(`/api/mosque-health/${m.id}`, { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then(d => d ? [m.id, d] : null)
      )
    ).then(results => {
      const map: Record<string, MosqueHealth> = {};
      results.forEach(r => { if (r) map[r[0]] = r[1]; });
      setMosqueHealth(map);
    });
  }, [mosques]);

  const formatTime = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return "الآن";
      if (m < 60) return `منذ ${m} د`;
      const h = Math.floor(m / 60);
      if (h < 24) return `منذ ${h} س`;
      return `منذ ${Math.floor(h / 24)} يوم`;
    } catch { return dateStr; }
  };

  const getRoleName = (role: string) => {
    const map: Record<string, string> = { admin: "مدير", supervisor: "مشرف", teacher: "أستاذ", student: "طالب", parent: "ولي أمر" };
    return map[role] || role;
  };

  const statCards = [
    { label: "إجمالي المستخدمين", value: stats ? stats.totalStudents + stats.totalTeachers + stats.totalSupervisors + 1 : "—", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "الجوامع والمراكز", value: stats?.totalMosques ?? "—", icon: Building2, color: "text-green-600", bg: "bg-green-50" },
    { label: "متصل الآن", value: onlineCount, icon: Wifi, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "في انتظار الموافقة", value: pendingUsers.length, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "الميزات المفعّلة", value: enabledFeatures, icon: Shield, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "إجمالي الواجبات", value: stats?.totalAssignments ?? "—", icon: CheckCircle, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  const quickActions = [
    { href: "/users", label: "إدارة المستخدمين", icon: Users },
    { href: "/mosques", label: "الجوامع والمراكز", icon: Building2 },
    { href: "/activity-logs", label: "سجل الحركات", icon: Activity },
    { href: "/feature-control", label: "التحكم بالمميزات", icon: Shield },
    { href: "/monitoring", label: "المراقبة والأمان", icon: Wifi },
    { href: "/settings", label: "الإعدادات", icon: LayoutGrid },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary flex items-center gap-2">
          <LayoutGrid className="w-7 h-7" />
          لوحة التحكم الإدارية
        </h1>
        <p className="text-muted-foreground mt-1">نظرة شاملة على حالة النظام</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map(card => (
          <Card key={card.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${card.bg} shrink-0`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">الإجراءات السريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {quickActions.map(action => (
              <Link key={action.href} href={action.href}>
                <Button variant="outline" className="w-full flex flex-col h-16 gap-1 text-xs">
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              آخر النشاطات
            </CardTitle>
            <Link href="/activity-logs">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                الكل <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد نشاطات</p>
            ) : activityLogs.map(log => (
              <div key={log.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{log.userName}: {log.action}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              في انتظار الموافقة
              {pendingUsers.length > 0 && <Badge variant="secondary">{pendingUsers.length}</Badge>}
            </CardTitle>
            <Link href="/users">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                الكل <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {pendingUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد طلبات معلقة</p>
            ) : pendingUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div>
                  <p className="text-xs font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.username}</p>
                </div>
                <Badge variant="outline" className="text-xs">{getRoleName(u.role)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Mosques Overview */}
      {mosques.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              نظرة عامة على الجوامع
            </CardTitle>
            <Link href="/mosques">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                الكل <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-right pb-2 font-medium">الجامع/المركز</th>
                    <th className="text-right pb-2 font-medium">المدينة</th>
                    <th className="text-right pb-2 font-medium">نقطة الصحة</th>
                  </tr>
                </thead>
                <tbody>
                  {mosques.slice(0, 10).map(m => {
                    const health = mosqueHealth[m.id];
                    const score = health?.score ?? null;
                    return (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 font-medium">{m.name}</td>
                        <td className="py-2 text-muted-foreground text-xs">{m.city || "—"}</td>
                        <td className="py-2">
                          {score !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-muted rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                                  style={{ width: `${Math.min(100, score)}%` }}
                                />
                              </div>
                              <span className="text-xs">{score}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
