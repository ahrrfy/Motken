import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Building2, Wifi, CheckCircle, Shield, Activity,
  Clock, ChevronRight, LayoutGrid, AlertCircle, Loader2,
  LogOut, Ban, UserCheck, UserX, RefreshCw, Eye,
  ShieldCheck, KeyRound, UserCog, Settings2, Crown,
  TrendingUp, BookOpen, AlertTriangle, Zap, Lock,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";

// ===================== الأنواع =====================

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalSupervisors: number;
  totalMosques: number;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
}

interface SessionInfo {
  sessionId: string;
  userId: string;
  userName: string;
  userRole: string;
  mosqueName?: string;
  ip?: string;
  lastActivity?: string;
  createdAt?: string;
}

interface PendingUser {
  id: string;
  name: string;
  username: string;
  role: string;
  mosqueId?: string;
  createdAt: string;
}

interface MosqueInfo {
  id: string;
  name: string;
  city?: string;
  isActive?: boolean;
}

interface MosqueHealth {
  score: number;
  activeStudents?: number;
  totalStudents?: number;
}

interface ActivityLog {
  id: string;
  userName: string;
  action: string;
  module: string;
  status: string;
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string;
  username: string;
  role: string;
  mosqueId?: string;
  isActive: boolean;
  isAssistantAdmin?: boolean;
  assistantPermissions?: Record<string, boolean>;
  supervisorPermissions?: Record<string, boolean>;
  teacherPermissions?: Record<string, boolean>;
}

// ===================== ثوابت الصلاحيات =====================

const ASSISTANT_PERMISSIONS = [
  { key: "manage_users", label: "إدارة المستخدمين", icon: Users, desc: "إضافة وتعديل وحذف المستخدمين" },
  { key: "approve_users", label: "الموافقة على الطلبات", icon: UserCheck, desc: "قبول ورفض طلبات التسجيل" },
  { key: "manage_mosques", label: "إدارة الجوامع", icon: Building2, desc: "إضافة وتعديل الجوامع والمراكز" },
  { key: "view_reports", label: "عرض التقارير", icon: TrendingUp, desc: "الاطلاع على جميع التقارير" },
  { key: "manage_features", label: "التحكم بالمميزات", icon: Shield, desc: "تفعيل وتعطيل المميزات" },
  { key: "view_activity_logs", label: "سجل الحركات", icon: Activity, desc: "مراجعة جميع العمليات" },
  { key: "manage_sessions", label: "إدارة الجلسات", icon: LogOut, desc: "طرد المستخدمين وإدارة الجلسات" },
  { key: "system_backup", label: "النسخ الاحتياطي", icon: KeyRound, desc: "إنشاء واستعادة النسخ" },
  { key: "manage_permissions", label: "إدارة الصلاحيات", icon: ShieldCheck, desc: "تعديل صلاحيات المشرفين" },
  { key: "send_notifications", label: "الإشعارات الجماعية", icon: Zap, desc: "إرسال إشعارات لجميع المستخدمين" },
];

const SUPERVISOR_PERMISSIONS = [
  { key: "manage_students", label: "إدارة الطلاب" },
  { key: "manage_teachers", label: "إدارة الأساتذة" },
  { key: "manage_assignments", label: "إدارة الواجبات" },
  { key: "view_reports", label: "عرض التقارير" },
  { key: "manage_attendance", label: "إدارة الحضور" },
  { key: "print_ids", label: "طباعة الهويات" },
  { key: "send_messages", label: "إرسال الرسائل" },
  { key: "manage_courses", label: "إدارة الدورات" },
  { key: "export_data", label: "تصدير البيانات" },
  { key: "approve_users", label: "الموافقة على المستخدمين" },
];

const TEACHER_PERMISSIONS = [
  { key: "create_students", label: "إنشاء طلاب جدد" },
  { key: "edit_students", label: "تعديل بيانات الطلاب" },
  { key: "delete_assignments", label: "حذف واجبات" },
  { key: "view_all_students", label: "رؤية كل طلاب المسجد" },
  { key: "manage_attendance", label: "تسجيل حضور لكل الطلاب" },
  { key: "export_data", label: "تصدير بيانات" },
];

const SUPERVISOR_TEMPLATES: Record<string, { label: string; permissions: Record<string, boolean> }> = {
  full: { label: "مشرف كامل الصلاحيات", permissions: Object.fromEntries(SUPERVISOR_PERMISSIONS.map(p => [p.key, true])) },
  limited: { label: "مشرف محدود (عرض فقط)", permissions: Object.fromEntries(SUPERVISOR_PERMISSIONS.map(p => [p.key, p.key === "view_reports"])) },
  academic: { label: "مشرف أكاديمي", permissions: { manage_students: true, manage_assignments: true, view_reports: true, manage_attendance: true, manage_courses: true, manage_teachers: false, print_ids: false, send_messages: true, export_data: true, approve_users: false } },
};

// ===================== المساعدات =====================

const roleLabels: Record<string, string> = { admin: "مدير النظام", admin_assistant: "مساعد المدير", supervisor: "مشرف", teacher: "أستاذ", student: "طالب", parent: "ولي أمر" };
const roleColors: Record<string, string> = { admin: "bg-red-100 text-red-700", admin_assistant: "bg-purple-100 text-purple-700", supervisor: "bg-blue-100 text-blue-700", teacher: "bg-emerald-100 text-emerald-700", student: "bg-sky-100 text-sky-700", parent: "bg-amber-100 text-amber-700" };

const moduleLabels: Record<string, string> = {
  assignments: "الواجبات", messages: "الرسائل", points: "النقاط", courses: "الدورات",
  attendance: "الحضور", privacy: "الخصوصية", users: "المستخدمين", auth: "المصادقة",
  mosques: "الجوامع", settings: "الإعدادات", certificates: "الشهادات",
};

function formatTime(dateStr: string) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "الآن";
    if (m < 60) return `منذ ${m} د`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h} س`;
    return `منذ ${Math.floor(h / 24)} يوم`;
  } catch { return dateStr; }
}

// ===================== المكون الرئيسي =====================

export default function AdminControlPage() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [enabledFeatures, setEnabledFeatures] = useState(0);
  const [totalFeatures, setTotalFeatures] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [mosques, setMosques] = useState<MosqueInfo[]>([]);
  const [mosqueHealth, setMosqueHealth] = useState<Record<string, MosqueHealth>>({});
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // حالة نوافذ الصلاحيات
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permDialogType, setPermDialogType] = useState<"assistant" | "supervisor" | "teacher">("assistant");
  const [permUser, setPermUser] = useState<UserInfo | null>(null);
  const [permValues, setPermValues] = useState<Record<string, boolean>>({});
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // حالة الموافقات
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectUserId, setRejectUserId] = useState("");

  // جلب البيانات
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, onlineRes, pendingRes, flagsRes, logsRes, mosquesRes, sessionsRes] = await Promise.all([
        fetch("/api/stats", { credentials: "include" }).then(r => r.ok ? r.json() : null),
        fetch("/api/admin/online-count", { credentials: "include" }).then(r => r.ok ? r.json() : null),
        fetch("/api/users/pending-approval", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/feature-flags", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/activity-logs?limit=30", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/mosques", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/admin/sessions", { credentials: "include" }).then(r => r.ok ? r.json() : []),
      ]);
      if (statsRes) setStats(statsRes);
      if (onlineRes) setOnlineCount(onlineRes.count ?? 0);
      setPendingUsers(pendingRes);
      setEnabledFeatures((flagsRes as any[]).filter((f: any) => f.isEnabled).length);
      setTotalFeatures((flagsRes as any[]).length);
      setActivityLogs((logsRes as any[]).slice(0, 30));
      const mosqueData = Array.isArray(mosquesRes) ? mosquesRes : [mosquesRes];
      setMosques(mosqueData);
      setSessions(sessionsRes);
      setLastRefresh(new Date());

      // جلب صحة الجوامع
      if (mosqueData.length > 0) {
        const healthResults = await Promise.all(
          mosqueData.slice(0, 15).map((m: MosqueInfo) =>
            fetch(`/api/mosque-health/${m.id}`, { credentials: "include" })
              .then(r => r.ok ? r.json() : null)
              .then(d => d ? [m.id, d] : null)
              .catch(() => null)
          )
        );
        const map: Record<string, MosqueHealth> = {};
        healthResults.forEach(r => { if (r) map[r[0]] = r[1]; });
        setMosqueHealth(map);
      }
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // تحديث تلقائي كل 30 ثانية
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // جلب المستخدمين عند فتح تبويب الصلاحيات
  const loadUsers = useCallback(async () => {
    if (allUsers.length > 0) return;
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) setAllUsers(await res.json());
    } catch { } finally { setUsersLoading(false); }
  }, [allUsers.length]);

  // إجراءات الجلسات
  const kickSession = async (sessionId: string) => {
    const res = await fetch("/api/admin/kick-session", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ sessionId }) });
    if (res.ok) { toast({ title: "تم طرد الجلسة" }); fetchData(); }
    else toast({ title: "فشل", variant: "destructive" });
  };

  const kickUser = async (userId: string) => {
    const res = await fetch("/api/admin/kick-user", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ userId }) });
    if (res.ok) { toast({ title: "تم طرد جميع جلسات المستخدم" }); fetchData(); }
    else toast({ title: "فشل", variant: "destructive" });
  };

  const suspendUser = async (userId: string) => {
    const res = await fetch("/api/admin/suspend-user", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ userId }) });
    if (res.ok) { toast({ title: "تم إيقاف الحساب" }); fetchData(); }
    else toast({ title: "فشل", variant: "destructive" });
  };

  // موافقة/رفض
  const approveUser = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}/approve`, { method: "POST", credentials: "include" });
    if (res.ok) { toast({ title: "تمت الموافقة" }); fetchData(); }
    else toast({ title: "فشل", variant: "destructive" });
  };

  const rejectUser = async () => {
    if (!rejectUserId) return;
    const res = await fetch(`/api/users/${rejectUserId}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ reason: rejectReason }) });
    if (res.ok) { toast({ title: "تم الرفض" }); setRejectDialogOpen(false); setRejectReason(""); fetchData(); }
    else toast({ title: "فشل", variant: "destructive" });
  };

  // فتح نافذة الصلاحيات
  const openPermDialog = (user: UserInfo, type: "assistant" | "supervisor" | "teacher") => {
    setPermUser(user);
    setPermDialogType(type);
    const current = type === "assistant" ? (user.assistantPermissions || {})
      : type === "supervisor" ? (user.supervisorPermissions || {})
      : (user.teacherPermissions || {});
    setPermValues(current as Record<string, boolean>);
    setPermDialogOpen(true);
  };

  const savePermissions = async () => {
    if (!permUser) return;
    const field = permDialogType === "assistant" ? "assistantPermissions"
      : permDialogType === "supervisor" ? "supervisorPermissions"
      : "teacherPermissions";
    const body: any = { [field]: permValues };
    if (permDialogType === "assistant") body.isAssistantAdmin = true;

    const res = await fetch(`/api/users/${permUser.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    if (res.ok) {
      toast({ title: "تم حفظ الصلاحيات" });
      setPermDialogOpen(false);
      setAllUsers(prev => prev.map(u => u.id === permUser.id ? { ...u, [field]: permValues, ...(permDialogType === "assistant" ? { isAssistantAdmin: true } : {}) } : u));
    } else toast({ title: "فشل في الحفظ", variant: "destructive" });
  };

  const removeAssistant = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ isAssistantAdmin: false, assistantPermissions: {} }) });
    if (res.ok) {
      toast({ title: "تم إزالة مساعد المدير" });
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, isAssistantAdmin: false, assistantPermissions: {} } : u));
    }
  };

  // الإحصائيات
  const totalUsers = stats ? stats.totalStudents + stats.totalTeachers + stats.totalSupervisors + 1 : 0;
  const supervisors = allUsers.filter(u => u.role === "supervisor");
  const teachers = allUsers.filter(u => u.role === "teacher");
  const assistants = allUsers.filter(u => u.isAssistantAdmin);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5 max-w-7xl mx-auto" dir="rtl">
      {/* العنوان */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-primary">لوحة السيطرة الشاملة</h1>
            <p className="text-xs text-muted-foreground">
              آخر تحديث: {lastRefresh.toLocaleTimeString("ar-IQ")}
              <span className="mx-2">|</span>
              تحديث تلقائي كل 30 ثانية
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1">
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث الآن
        </Button>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">المستخدمون</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{totalUsers}</p>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-sky-50 text-sky-700">{stats?.totalStudents ?? 0} طالب</Badge>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700">{stats?.totalTeachers ?? 0} أستاذ</Badge>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-violet-50 text-violet-700">{stats?.totalSupervisors ?? 0} مشرف</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">الجوامع والمراكز</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats?.totalMosques ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wifi className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-600 font-medium">متصل الآن</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">{onlineCount}</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${pendingUsers.length > 0 ? "from-red-50 to-white border-red-200" : "from-amber-50 to-white border-amber-100"}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className={`w-4 h-4 ${pendingUsers.length > 0 ? "text-red-600" : "text-amber-600"}`} />
              <span className={`text-xs font-medium ${pendingUsers.length > 0 ? "text-red-600" : "text-amber-600"}`}>بانتظار الموافقة</span>
            </div>
            <p className={`text-2xl font-bold ${pendingUsers.length > 0 ? "text-red-700" : "text-amber-700"}`}>{pendingUsers.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">المميزات</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{enabledFeatures}<span className="text-sm text-muted-foreground font-normal">/{totalFeatures}</span></p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span className="text-xs text-indigo-600 font-medium">الواجبات</span>
            </div>
            <p className="text-2xl font-bold text-indigo-700">{stats?.totalAssignments ?? 0}</p>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-green-50 text-green-700">{stats?.completedAssignments ?? 0} مكتمل</Badge>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700">{stats?.pendingAssignments ?? 0} معلق</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-white border-cyan-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-cyan-600" />
              <span className="text-xs text-cyan-600 font-medium">الجلسات النشطة</span>
            </div>
            <p className="text-2xl font-bold text-cyan-700">{sessions.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-orange-600 font-medium">مساعدو المدير</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{assistants.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* التبويبات المركزية */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "permissions") loadUsers(); }}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs gap-1"><Eye className="w-3.5 h-3.5" />نظرة عامة</TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs gap-1"><Wifi className="w-3.5 h-3.5" />الجلسات <Badge variant="secondary" className="text-[9px] px-1 mr-1">{sessions.length}</Badge></TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs gap-1"><UserCheck className="w-3.5 h-3.5" />الموافقات {pendingUsers.length > 0 && <Badge variant="destructive" className="text-[9px] px-1 mr-1">{pendingUsers.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1"><Activity className="w-3.5 h-3.5" />النشاط</TabsTrigger>
          <TabsTrigger value="mosques" className="text-xs gap-1"><Building2 className="w-3.5 h-3.5" />الجوامع</TabsTrigger>
          <TabsTrigger value="permissions" className="text-xs gap-1"><ShieldCheck className="w-3.5 h-3.5" />الصلاحيات</TabsTrigger>
        </TabsList>

        {/* تبويب: نظرة عامة */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* الإجراءات السريعة */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  الإجراءات السريعة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { href: "/users", label: "المستخدمون", icon: Users, color: "text-blue-600" },
                    { href: "/mosques", label: "الجوامع", icon: Building2, color: "text-green-600" },
                    { href: "/monitoring", label: "المراقبة", icon: Eye, color: "text-amber-600" },
                    { href: "/feature-control", label: "المميزات", icon: Shield, color: "text-purple-600" },
                    { href: "/reports", label: "التقارير", icon: TrendingUp, color: "text-indigo-600" },
                    { href: "/settings", label: "الإعدادات", icon: Settings2, color: "text-gray-600" },
                  ].map(a => (
                    <Link key={a.href} href={a.href}>
                      <Button variant="outline" className="w-full flex flex-col h-14 gap-1 text-xs hover:bg-muted/50">
                        <a.icon className={`w-4 h-4 ${a.color}`} />
                        {a.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* آخر النشاطات */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  آخر النشاطات
                </CardTitle>
                <Link href="/monitoring">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">الكل <ChevronRight className="w-3 h-3" /></Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-60 overflow-y-auto">
                {activityLogs.slice(0, 10).map(log => (
                  <div key={log.id} className="flex items-center gap-2 py-1 border-b last:border-0">
                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] truncate"><strong>{log.userName}</strong>: {log.action}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1 shrink-0">{moduleLabels[log.module] || log.module}</Badge>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(log.createdAt)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* تبويب: الجلسات النشطة */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600" />
                الجلسات النشطة ({sessions.length})
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">لا توجد جلسات نشطة</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المستخدم</TableHead>
                        <TableHead>الدور</TableHead>
                        <TableHead className="hidden sm:table-cell">IP</TableHead>
                        <TableHead className="hidden md:table-cell">المدة</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map(s => (
                        <TableRow key={s.sessionId}>
                          <TableCell className="font-medium">{s.userName || "—"}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${roleColors[s.userRole] || ""}`}>
                              {roleLabels[s.userRole] || s.userRole}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-xs">{s.ip || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs">{s.createdAt ? formatTime(s.createdAt) : "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 text-red-600 hover:bg-red-50" onClick={() => kickSession(s.sessionId)}>
                                <LogOut className="w-3 h-3" />طرد
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 text-orange-600 hover:bg-orange-50" onClick={() => suspendUser(s.userId)}>
                                <Ban className="w-3 h-3" />إيقاف
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب: الموافقات */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600" />
                الموافقات المعلقة ({pendingUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-300 mb-3" />
                  <p className="text-muted-foreground">لا توجد طلبات معلقة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{u.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.username} | {formatTime(u.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={roleColors[u.role] || ""} variant="outline">{roleLabels[u.role] || u.role}</Badge>
                        <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => approveUser(u.id)}>
                          <UserCheck className="w-3 h-3" />قبول
                        </Button>
                        <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={() => { setRejectUserId(u.id); setRejectDialogOpen(true); }}>
                          <UserX className="w-3 h-3" />رفض
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب: النشاط */}
        <TabsContent value="activity">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                سجل النشاط الحي ({activityLogs.length})
              </CardTitle>
              <Link href="/monitoring">
                <Button variant="outline" size="sm" className="text-xs gap-1">عرض الكل <ChevronRight className="w-3 h-3" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>العملية</TableHead>
                      <TableHead className="hidden sm:table-cell">القسم</TableHead>
                      <TableHead>الوقت</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-xs">{log.userName}</TableCell>
                        <TableCell className="text-xs">{log.action}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-[10px]">{moduleLabels[log.module] || log.module}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatTime(log.createdAt)}</TableCell>
                        <TableCell>
                          <Badge className={log.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} variant="outline">
                            {log.status === "success" ? "ناجح" : "تنبيه"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب: صحة الجوامع */}
        <TabsContent value="mosques">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                صحة الجوامع ({mosques.length})
              </CardTitle>
              <Link href="/mosques">
                <Button variant="outline" size="sm" className="text-xs gap-1">إدارة <ChevronRight className="w-3 h-3" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الجامع/المركز</TableHead>
                      <TableHead className="hidden sm:table-cell">المدينة</TableHead>
                      <TableHead>الطلاب</TableHead>
                      <TableHead>نقطة الصحة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mosques.slice(0, 15).map(m => {
                      const health = mosqueHealth[m.id];
                      const score = health?.score ?? null;
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{m.city || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {health ? `${health.activeStudents ?? 0}/${health.totalStudents ?? 0}` : "—"}
                          </TableCell>
                          <TableCell>
                            {score !== null ? (
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={Math.min(100, score)}
                                  className="h-2 w-16"
                                />
                                <span className={`text-xs font-medium ${score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-red-600"}`}>
                                  {score}%
                                </span>
                              </div>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب: الصلاحيات */}
        <TabsContent value="permissions">
          <div className="space-y-4">
            {/* مساعدو المدير */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-600" />
                    مساعدو المدير
                  </CardTitle>
                  <Button size="sm" className="text-xs gap-1" onClick={() => {
                    const nonAdmins = allUsers.filter(u => u.role !== "admin" && !u.isAssistantAdmin);
                    if (nonAdmins.length > 0) openPermDialog(nonAdmins[0], "assistant");
                  }}>
                    <UserCog className="w-3 h-3" />تعيين مساعد
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : assistants.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-sm">لم يتم تعيين مساعد مدير بعد</p>
                ) : (
                  <div className="space-y-2">
                    {assistants.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <Crown className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Object.values(u.assistantPermissions || {}).filter(Boolean).length} صلاحية
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openPermDialog(u, "assistant")}>
                            <Settings2 className="w-3 h-3 ml-1" />تعديل
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => removeAssistant(u.id)}>إزالة</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* استثناءات المشرفين */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  صلاحيات المشرفين ({supervisors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : supervisors.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-sm">لا يوجد مشرفون</p>
                ) : (
                  <div className="space-y-2">
                    {supervisors.map(u => {
                      const permCount = Object.values(u.supervisorPermissions || {}).filter(Boolean).length;
                      return (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{permCount} من {SUPERVISOR_PERMISSIONS.length} صلاحية</p>
                          </div>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openPermDialog(u, "supervisor")}>
                            <Settings2 className="w-3 h-3 ml-1" />تعديل الصلاحيات
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* استثناءات الأساتذة */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-emerald-600" />
                  استثناءات الأساتذة ({teachers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : teachers.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-sm">لا يوجد أساتذة</p>
                ) : (
                  <div className="space-y-2">
                    {teachers.map(u => {
                      const permCount = Object.values(u.teacherPermissions || {}).filter(Boolean).length;
                      return (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{permCount > 0 ? `${permCount} استثناء` : "بدون استثناءات"}</p>
                          </div>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openPermDialog(u, "teacher")}>
                            <Settings2 className="w-3 h-3 ml-1" />الاستثناءات
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* نافذة إدارة الصلاحيات */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {permDialogType === "assistant" ? <Crown className="w-5 h-5 text-purple-600" /> :
               permDialogType === "supervisor" ? <ShieldCheck className="w-5 h-5 text-blue-600" /> :
               <UserCog className="w-5 h-5 text-emerald-600" />}
              {permDialogType === "assistant" ? "صلاحيات مساعد المدير" :
               permDialogType === "supervisor" ? "صلاحيات المشرف" : "استثناءات الأستاذ"}
            </DialogTitle>
          </DialogHeader>

          {permDialogType === "assistant" && (
            <div className="mb-3">
              <Label className="text-xs text-muted-foreground mb-1 block">اختر المستخدم</Label>
              <Select value={permUser?.id || ""} onValueChange={(v) => {
                const u = allUsers.find(u => u.id === v);
                if (u) { setPermUser(u); setPermValues(u.assistantPermissions as Record<string, boolean> || {}); }
              }}>
                <SelectTrigger><SelectValue placeholder="اختر مستخدم" /></SelectTrigger>
                <SelectContent>
                  {allUsers.filter(u => u.role !== "admin").map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({roleLabels[u.role] || u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {permUser && (
            <div className="bg-muted/50 p-3 rounded-lg mb-3">
              <p className="font-medium text-sm">{permUser.name}</p>
              <p className="text-xs text-muted-foreground">{roleLabels[permUser.role] || permUser.role} | {permUser.username}</p>
            </div>
          )}

          {/* قوالب جاهزة للمشرفين */}
          {permDialogType === "supervisor" && (
            <div className="flex gap-2 mb-3">
              {Object.entries(SUPERVISOR_TEMPLATES).map(([key, tmpl]) => (
                <Button key={key} variant="outline" size="sm" className="text-[10px] h-7" onClick={() => setPermValues(tmpl.permissions)}>
                  {tmpl.label}
                </Button>
              ))}
            </div>
          )}

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(permDialogType === "assistant" ? ASSISTANT_PERMISSIONS :
              permDialogType === "supervisor" ? SUPERVISOR_PERMISSIONS :
              TEACHER_PERMISSIONS
            ).map(p => (
              <div key={p.key} className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  {"icon" in p && <p.icon className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <span className="text-sm font-medium">{p.label}</span>
                    {"desc" in p && <p className="text-[10px] text-muted-foreground">{(p as any).desc}</p>}
                  </div>
                </div>
                <Switch
                  checked={!!permValues[p.key]}
                  onCheckedChange={(v) => setPermValues(prev => ({ ...prev, [p.key]: v }))}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="flex gap-2">
            <Button className="flex-1" onClick={savePermissions}>حفظ الصلاحيات</Button>
            <Button variant="outline" onClick={() => setPermDialogOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة الرفض */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>رفض الطلب</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>سبب الرفض (اختياري)</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="اكتب سبب الرفض..." />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={rejectUser}>تأكيد الرفض</Button>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
