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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Building2, Wifi, CheckCircle, Shield, Activity,
  Clock, LayoutGrid, AlertCircle, Loader2,
  LogOut, Ban, UserCheck, UserX, RefreshCw, Eye,
  ShieldCheck, KeyRound, UserCog, Settings2, Crown,
  TrendingUp, BookOpen, AlertTriangle, Zap, Lock,
  Search, Trash2, Edit, UserPlus, Power, ChevronDown, ChevronUp,
} from "lucide-react";
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
  username: string;
  name: string;
  role: string;
  mosqueId?: string | null;
  ipAddress: string;
  deviceInfo?: string;
  browser?: string;
  os?: string;
  isOnline?: boolean;
  lastActivity: number;
  loginTime: number;
}

interface PendingUser {
  id: string;
  name: string;
  username: string;
  role: string;
  mosqueId?: string;
  phone?: string;
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
  details?: string | null;
  status: string;
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string;
  username: string;
  role: string;
  mosqueId?: string | null;
  phone?: string;
  isActive: boolean;
  isAssistantAdmin?: boolean;
  assistantPermissions?: Record<string, boolean>;
  supervisorPermissions?: Record<string, boolean>;
  teacherPermissions?: Record<string, boolean>;
  createdAt?: string;
}

interface FeatureFlag {
  id: string;
  featureKey: string;
  featureName: string;
  description: string | null;
  category: string;
  isEnabled: boolean;
}

// ===================== ثوابت =====================

const ASSISTANT_PERMS = [
  { key: "manage_users", label: "إدارة المستخدمين" },
  { key: "approve_users", label: "الموافقة على الطلبات" },
  { key: "manage_mosques", label: "إدارة الجوامع" },
  { key: "view_reports", label: "عرض التقارير" },
  { key: "manage_features", label: "التحكم بالمميزات" },
  { key: "view_activity_logs", label: "سجل الحركات" },
  { key: "manage_sessions", label: "إدارة الجلسات" },
  { key: "system_backup", label: "النسخ الاحتياطي" },
  { key: "manage_permissions", label: "إدارة الصلاحيات" },
  { key: "send_notifications", label: "الإشعارات الجماعية" },
];

const SUPERVISOR_PERMS = [
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

const TEACHER_PERMS = [
  { key: "create_students", label: "إنشاء طلاب جدد" },
  { key: "edit_students", label: "تعديل بيانات الطلاب" },
  { key: "delete_assignments", label: "حذف واجبات" },
  { key: "view_all_students", label: "رؤية كل طلاب المسجد" },
  { key: "manage_attendance", label: "حضور لكل الطلاب" },
  { key: "export_data", label: "تصدير بيانات" },
];

const SUP_TEMPLATES: Record<string, Record<string, boolean>> = {
  full: Object.fromEntries(SUPERVISOR_PERMS.map(p => [p.key, true])),
  limited: Object.fromEntries(SUPERVISOR_PERMS.map(p => [p.key, p.key === "view_reports"])),
  academic: { manage_students: true, manage_assignments: true, view_reports: true, manage_attendance: true, manage_courses: true, send_messages: true, export_data: true, manage_teachers: false, print_ids: false, approve_users: false },
};

const roleLabels: Record<string, string> = { admin: "مدير", supervisor: "مشرف", teacher: "أستاذ", student: "طالب", parent: "ولي أمر" };
const roleBg: Record<string, string> = { admin: "bg-red-100 text-red-700", supervisor: "bg-blue-100 text-blue-700", teacher: "bg-emerald-100 text-emerald-700", student: "bg-sky-100 text-sky-700", parent: "bg-amber-100 text-amber-700" };

const moduleLabels: Record<string, string> = {
  assignments: "الواجبات", messages: "الرسائل", points: "النقاط", courses: "الدورات",
  attendance: "الحضور", privacy: "الخصوصية", users: "المستخدمين", auth: "المصادقة",
  mosques: "الجوامع", settings: "الإعدادات", certificates: "الشهادات",
};

function timeAgo(d: string) {
  try {
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return "الآن";
    if (m < 60) return `${m} د`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} س`;
    return `${Math.floor(h / 24)} يوم`;
  } catch { return d; }
}

// ===================== المكون الرئيسي =====================

export default function AdminControlPage() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  // البيانات
  const [stats, setStats] = useState<Stats | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [mosques, setMosques] = useState<MosqueInfo[]>([]);
  const [mosqueHealth, setMosqueHealth] = useState<Record<string, MosqueHealth>>({});
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // فلاتر المستخدمين
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userMosqueFilter, setUserMosqueFilter] = useState("all");

  // نوافذ
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permType, setPermType] = useState<"assistant" | "supervisor" | "teacher">("supervisor");
  const [permUser, setPermUser] = useState<UserInfo | null>(null);
  const [permValues, setPermValues] = useState<Record<string, boolean>>({});
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectUserId, setRejectUserId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"reset_passwords" | "toggle_active" | "move">("reset_passwords");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkMosqueTarget, setBulkMosqueTarget] = useState("");

  // ===================== جلب البيانات =====================

  const fetchAll = useCallback(async () => {
    try {
      const [s, o, p, l, m, ss, u, f] = await Promise.all([
        fetch("/api/stats", { credentials: "include" }).then(r => r.ok ? r.json() : null),
        fetch("/api/admin/online-count", { credentials: "include" }).then(r => r.ok ? r.json() : null),
        fetch("/api/users/pending-approval", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/activity-logs?limit=50", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/mosques", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/admin/sessions", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/users", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/feature-flags", { credentials: "include" }).then(r => r.ok ? r.json() : []),
      ]);
      if (s) setStats(s);
      if (o) setOnlineCount(o.count ?? 0);
      setPendingUsers(p);
      setActivityLogs((l as any[]).slice(0, 50));
      const md = Array.isArray(m) ? m : [m];
      setMosques(md);
      setSessions(ss);
      setAllUsers(u);
      setFeatures(f);
      setLastRefresh(new Date());
      // صحة الجوامع
      if (md.length > 0) {
        Promise.all(md.slice(0, 20).map((mosque: MosqueInfo) =>
          fetch(`/api/mosque-health/${mosque.id}`, { credentials: "include" }).then(r => r.ok ? r.json() : null).then(d => d ? [mosque.id, d] : null).catch(() => null)
        )).then(res => {
          const map: Record<string, MosqueHealth> = {};
          res.forEach(r => { if (r) map[r[0]] = r[1]; });
          setMosqueHealth(map);
        });
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { const i = setInterval(fetchAll, 30000); return () => clearInterval(i); }, [fetchAll]);

  // ===================== الإجراءات =====================

  const api = async (url: string, method = "POST", body?: any) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", ...(body ? { body: JSON.stringify(body) } : {}) });
    return res;
  };

  const kickSession = async (sid: string) => { if ((await api("/api/admin/kick-session", "POST", { sessionId: sid })).ok) { toast({ title: "تم طرد الجلسة" }); fetchAll(); } };
  const kickUser = async (uid: string) => { if ((await api("/api/admin/kick-user", "POST", { userId: uid })).ok) { toast({ title: "تم طرد جميع الجلسات" }); fetchAll(); } };
  const suspendUser = async (uid: string) => { if ((await api("/api/admin/suspend-user", "POST", { userId: uid })).ok) { toast({ title: "تم إيقاف الحساب" }); fetchAll(); } };
  const activateUser = async (uid: string) => { if ((await api("/api/admin/activate-user", "POST", { userId: uid })).ok) { toast({ title: "تم تفعيل الحساب" }); fetchAll(); } };
  const approveUser = async (uid: string) => { if ((await api(`/api/users/${uid}/approve`)).ok) { toast({ title: "تمت الموافقة" }); fetchAll(); } };
  const rejectUser = async () => { if (!rejectUserId) return; if ((await api(`/api/users/${rejectUserId}/reject`, "POST", { reason: rejectReason })).ok) { toast({ title: "تم الرفض" }); setRejectDialogOpen(false); setRejectReason(""); fetchAll(); } };

  const toggleFeature = async (f: FeatureFlag) => {
    const res = await api(`/api/feature-flags/${f.id}`, "PATCH", { isEnabled: !f.isEnabled });
    if (res.ok) { setFeatures(prev => prev.map(ff => ff.id === f.id ? { ...ff, isEnabled: !ff.isEnabled } : ff)); toast({ title: `تم ${!f.isEnabled ? "تفعيل" : "تعطيل"} ${f.featureName}` }); }
  };

  const deleteUser = async (uid: string) => { if ((await api(`/api/users/${uid}`, "DELETE")).ok) { toast({ title: "تم حذف المستخدم" }); fetchAll(); } };

  const toggleUserActive = async (u: UserInfo) => {
    const res = await api(`/api/users/${u.id}`, "PATCH", { isActive: !u.isActive });
    if (res.ok) { toast({ title: u.isActive ? "تم تعطيل الحساب" : "تم تفعيل الحساب" }); fetchAll(); }
  };

  // صلاحيات
  const openPerms = (u: UserInfo, type: "assistant" | "supervisor" | "teacher") => {
    setPermUser(u);
    setPermType(type);
    const c = type === "assistant" ? (u.assistantPermissions || {}) : type === "supervisor" ? (u.supervisorPermissions || {}) : (u.teacherPermissions || {});
    setPermValues(c as Record<string, boolean>);
    setPermDialogOpen(true);
  };

  const savePerms = async () => {
    if (!permUser) return;
    const field = permType === "assistant" ? "assistantPermissions" : permType === "supervisor" ? "supervisorPermissions" : "teacherPermissions";
    const body: any = { [field]: permValues };
    if (permType === "assistant") body.isAssistantAdmin = true;
    if ((await api(`/api/users/${permUser.id}`, "PATCH", body)).ok) {
      toast({ title: "تم حفظ الصلاحيات" });
      setPermDialogOpen(false);
      setAllUsers(prev => prev.map(u => u.id === permUser.id ? { ...u, [field]: permValues, ...(permType === "assistant" ? { isAssistantAdmin: true } : {}) } : u));
    }
  };

  const removeAssistant = async (uid: string) => {
    if ((await api(`/api/users/${uid}`, "PATCH", { isAssistantAdmin: false, assistantPermissions: {} })).ok) {
      toast({ title: "تم إزالة مساعد المدير" });
      setAllUsers(prev => prev.map(u => u.id === uid ? { ...u, isAssistantAdmin: false, assistantPermissions: {} } : u));
    }
  };

  // عمليات جماعية
  const executeBulk = async () => {
    if (selectedUserIds.size === 0) return;
    const ids = Array.from(selectedUserIds);
    if (bulkAction === "reset_passwords") {
      let count = 0;
      for (const id of ids) {
        const res = await api(`/api/users/${id}`, "PATCH", { password: "123456" });
        if (res.ok) count++;
      }
      toast({ title: `تم إعادة تعيين كلمة المرور لـ ${count} مستخدم (123456)` });
    } else if (bulkAction === "toggle_active") {
      let count = 0;
      for (const id of ids) {
        const u = allUsers.find(u => u.id === id);
        if (u) { const res = await api(`/api/users/${id}`, "PATCH", { isActive: !u.isActive }); if (res.ok) count++; }
      }
      toast({ title: `تم تغيير حالة ${count} مستخدم` });
    } else if (bulkAction === "move" && bulkMosqueTarget) {
      let count = 0;
      for (const id of ids) {
        const res = await api(`/api/users/${id}`, "PATCH", { mosqueId: bulkMosqueTarget });
        if (res.ok) count++;
      }
      toast({ title: `تم نقل ${count} مستخدم` });
    }
    setBulkDialogOpen(false);
    setSelectedUserIds(new Set());
    fetchAll();
  };

  // ===================== المشتقات =====================

  const totalUsers = stats ? stats.totalStudents + stats.totalTeachers + stats.totalSupervisors + 1 : 0;
  const enabledFeatures = features.filter(f => f.isEnabled).length;
  const mosqueMap = new Map(mosques.map(m => [m.id, m.name]));

  const filteredUsers = allUsers.filter(u => {
    if (userSearch && !u.name.includes(userSearch) && !u.username.includes(userSearch)) return false;
    if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
    if (userMosqueFilter !== "all" && u.mosqueId !== userMosqueFilter) return false;
    return true;
  });

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]" dir="rtl"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir="rtl">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-primary">لوحة السيطرة الشاملة</h1>
            <p className="text-[10px] text-muted-foreground">آخر تحديث: {lastRefresh.toLocaleTimeString("ar-IQ")} — تحديث تلقائي كل 30 ث</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1"><RefreshCw className="w-3.5 h-3.5" />تحديث</Button>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "المستخدمون", value: totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-50", extra: <span className="text-[9px] text-muted-foreground">{stats?.totalStudents}ط {stats?.totalTeachers}س {stats?.totalSupervisors}م</span> },
          { label: "الجوامع", value: stats?.totalMosques ?? 0, icon: Building2, color: "text-green-600", bg: "bg-green-50" },
          { label: "متصل الآن", value: onlineCount, icon: Wifi, color: "text-emerald-600", bg: "bg-emerald-50", extra: <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" /> },
          { label: "معلقة", value: pendingUsers.length, icon: AlertCircle, color: pendingUsers.length > 0 ? "text-red-600" : "text-amber-600", bg: pendingUsers.length > 0 ? "bg-red-50" : "bg-amber-50" },
          { label: "المميزات", value: `${enabledFeatures}/${features.length}`, icon: Shield, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "الواجبات", value: stats?.totalAssignments ?? 0, icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "الجلسات", value: sessions.length, icon: Activity, color: "text-cyan-600", bg: "bg-cyan-50" },
          { label: "مساعدو المدير", value: allUsers.filter(u => u.isAssistantAdmin).length, icon: Crown, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(c => (
          <Card key={c.label} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-2.5 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${c.bg} shrink-0`}><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-lg font-bold leading-tight">{c.value}</p>
                  {c.extra}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* التبويبات المركزية */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-0.5 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="text-[11px] gap-1 px-2"><Eye className="w-3 h-3" />نظرة عامة</TabsTrigger>
          <TabsTrigger value="users" className="text-[11px] gap-1 px-2"><Users className="w-3 h-3" />المستخدمون <Badge variant="secondary" className="text-[8px] px-1 mr-0.5">{allUsers.length}</Badge></TabsTrigger>
          <TabsTrigger value="sessions" className="text-[11px] gap-1 px-2"><Wifi className="w-3 h-3" />الجلسات</TabsTrigger>
          <TabsTrigger value="approvals" className="text-[11px] gap-1 px-2"><UserCheck className="w-3 h-3" />الموافقات {pendingUsers.length > 0 && <Badge variant="destructive" className="text-[8px] px-1">{pendingUsers.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="features" className="text-[11px] gap-1 px-2"><Shield className="w-3 h-3" />المميزات</TabsTrigger>
          <TabsTrigger value="permissions" className="text-[11px] gap-1 px-2"><ShieldCheck className="w-3 h-3" />الصلاحيات</TabsTrigger>
          <TabsTrigger value="mosques" className="text-[11px] gap-1 px-2"><Building2 className="w-3 h-3" />الجوامع</TabsTrigger>
          <TabsTrigger value="activity" className="text-[11px] gap-1 px-2"><Activity className="w-3 h-3" />السجل</TabsTrigger>
        </TabsList>

        {/* ===== نظرة عامة ===== */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />آخر النشاطات</CardTitle></CardHeader>
              <CardContent className="space-y-1 max-h-64 overflow-y-auto">
                {activityLogs.slice(0, 15).map(log => (
                  <div key={log.id} className="flex items-center gap-2 py-1 border-b last:border-0 text-[11px]">
                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{log.userName}</span>
                    <span className="text-muted-foreground truncate flex-1">{log.action}</span>
                    <Badge variant="outline" className="text-[8px] px-1 shrink-0">{moduleLabels[log.module] || log.module}</Badge>
                    <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" />الموافقات المعلقة ({pendingUsers.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {pendingUsers.length === 0 ? <p className="text-center py-6 text-muted-foreground text-xs">لا توجد طلبات</p> :
                  pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div><p className="text-xs font-medium">{u.name}</p><p className="text-[10px] text-muted-foreground">{u.username}</p></div>
                      <div className="flex items-center gap-1">
                        <Badge className={`text-[9px] ${roleBg[u.role] || ""}`}>{roleLabels[u.role]}</Badge>
                        <Button size="sm" className="h-6 text-[10px] bg-green-600 hover:bg-green-700 px-2" onClick={() => approveUser(u.id)}>قبول</Button>
                        <Button variant="destructive" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setRejectUserId(u.id); setRejectDialogOpen(true); }}>رفض</Button>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== المستخدمون ===== */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />إدارة المستخدمين ({filteredUsers.length})</CardTitle>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative"><Search className="absolute right-2 top-1.5 h-3 w-3 text-muted-foreground" /><Input placeholder="بحث..." className="h-7 text-xs pr-7 w-36" value={userSearch} onChange={e => setUserSearch(e.target.value)} /></div>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}><SelectTrigger className="h-7 text-[10px] w-24"><SelectValue /></SelectTrigger><SelectContent>
                    <SelectItem value="all">كل الأدوار</SelectItem>
                    <SelectItem value="student">طلاب</SelectItem>
                    <SelectItem value="teacher">أساتذة</SelectItem>
                    <SelectItem value="supervisor">مشرفين</SelectItem>
                  </SelectContent></Select>
                  <Select value={userMosqueFilter} onValueChange={setUserMosqueFilter}><SelectTrigger className="h-7 text-[10px] w-32"><SelectValue placeholder="كل الجوامع" /></SelectTrigger><SelectContent>
                    <SelectItem value="all">كل الجوامع</SelectItem>
                    {mosques.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent></Select>
                  {selectedUserIds.size > 0 && (
                    <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => setBulkDialogOpen(true)}>
                      <Zap className="w-3 h-3" />عمليات ({selectedUserIds.size})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-8"><Checkbox checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0} onCheckedChange={() => { if (selectedUserIds.size === filteredUsers.length) setSelectedUserIds(new Set()); else setSelectedUserIds(new Set(filteredUsers.map(u => u.id))); }} /></TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead className="hidden sm:table-cell">المسجد</TableHead>
                      <TableHead className="hidden md:table-cell">الهاتف</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.slice(0, 100).map(u => (
                      <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                        <TableCell><Checkbox checked={selectedUserIds.has(u.id)} onCheckedChange={() => toggleSelectUser(u.id)} /></TableCell>
                        <TableCell><div><p className="text-xs font-medium">{u.name}</p><p className="text-[9px] text-muted-foreground">{u.username}</p></div></TableCell>
                        <TableCell><Badge className={`text-[9px] ${roleBg[u.role] || ""}`}>{roleLabels[u.role] || u.role}{u.isAssistantAdmin && " ★"}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell text-[10px]">{mosqueMap.get(u.mosqueId || "") || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-[10px]" dir="ltr">{u.phone || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[9px] ${u.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{u.isActive ? "نشط" : "معطل"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleUserActive(u)} title={u.isActive ? "تعطيل" : "تفعيل"}><Power className={`w-3 h-3 ${u.isActive ? "text-red-500" : "text-green-500"}`} /></Button>
                            {u.role === "supervisor" && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openPerms(u, "supervisor")} title="صلاحيات"><ShieldCheck className="w-3 h-3 text-blue-500" /></Button>}
                            {u.role === "teacher" && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openPerms(u, "teacher")} title="استثناءات"><UserCog className="w-3 h-3 text-emerald-500" /></Button>}
                            {u.role !== "admin" && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteUser(u.id)} title="حذف"><Trash2 className="w-3 h-3 text-red-400" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== الجلسات ===== */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wifi className="w-4 h-4 text-emerald-600" />الجلسات النشطة ({sessions.length}) <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /></CardTitle></CardHeader>
            <CardContent>
              {sessions.length === 0 ? <p className="text-center py-8 text-muted-foreground text-xs">لا توجد جلسات</p> :
                <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                  <TableHead>المستخدم</TableHead><TableHead>الدور</TableHead><TableHead className="hidden sm:table-cell">IP</TableHead><TableHead className="hidden md:table-cell">المدة</TableHead><TableHead>إجراءات</TableHead>
                </TableRow></TableHeader><TableBody>
                  {sessions.map(s => (
                    <TableRow key={s.sessionId}>
                      <TableCell className="text-xs font-medium">{s.name || "—"}</TableCell>
                      <TableCell><Badge className={`text-[9px] ${roleBg[s.role] || ""}`}>{roleLabels[s.role] || s.role}</Badge></TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-[10px]">{s.ip || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-[10px]">{s.createdAt ? timeAgo(s.createdAt) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-6 text-[9px] gap-0.5 text-red-600" onClick={() => kickSession(s.sessionId)}><LogOut className="w-3 h-3" />طرد</Button>
                          <Button variant="outline" size="sm" className="h-6 text-[9px] gap-0.5 text-orange-600" onClick={() => suspendUser(s.userId)}><Ban className="w-3 h-3" />إيقاف</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== الموافقات ===== */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserCheck className="w-4 h-4 text-amber-600" />الموافقات المعلقة ({pendingUsers.length})</CardTitle></CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? <div className="text-center py-12"><CheckCircle className="w-10 h-10 mx-auto text-green-300 mb-2" /><p className="text-muted-foreground text-xs">لا توجد طلبات</p></div> :
                <div className="space-y-2">{pendingUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-xs font-bold text-primary">{u.name.charAt(0)}</span></div>
                      <div><p className="text-xs font-medium">{u.name}</p><p className="text-[10px] text-muted-foreground">{u.username} | {u.phone || "—"} | {timeAgo(u.createdAt)}</p></div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={roleBg[u.role] || ""}>{roleLabels[u.role]}</Badge>
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => approveUser(u.id)}>قبول</Button>
                      <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => { setRejectUserId(u.id); setRejectDialogOpen(true); }}>رفض</Button>
                    </div>
                  </div>
                ))}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== المميزات ===== */}
        <TabsContent value="features">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-purple-600" />التحكم بالمميزات ({enabledFeatures}/{features.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {features.map(f => (
                  <div key={f.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${f.isEnabled ? "bg-green-50/50 border-green-200/50" : "bg-muted/20"}`}>
                    <div className="flex-1 ml-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{f.featureName}</span>
                        <Badge variant={f.isEnabled ? "default" : "outline"} className={`text-[9px] px-1 py-0 ${f.isEnabled ? "bg-green-100 text-green-700 border-green-200" : "text-muted-foreground"}`}>{f.isEnabled ? "مفعّل" : "معطّل"}</Badge>
                      </div>
                      {f.description && <p className="text-[10px] text-muted-foreground mt-0.5">{f.description}</p>}
                    </div>
                    <Switch checked={f.isEnabled} onCheckedChange={() => toggleFeature(f)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== الصلاحيات ===== */}
        <TabsContent value="permissions">
          <div className="space-y-3">
            {/* مساعدو المدير */}
            <Card className="border-purple-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Crown className="w-4 h-4 text-purple-600" />مساعدو المدير</CardTitle>
                  <Select onValueChange={(uid) => { const u = allUsers.find(u => u.id === uid); if (u) openPerms(u, "assistant"); }}>
                    <SelectTrigger className="h-7 text-[10px] w-36"><SelectValue placeholder="تعيين مساعد..." /></SelectTrigger>
                    <SelectContent>{allUsers.filter(u => u.role !== "admin" && !u.isAssistantAdmin).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {allUsers.filter(u => u.isAssistantAdmin).length === 0 ? <p className="text-center py-4 text-muted-foreground text-xs">لم يُعيَّن مساعد بعد</p> :
                  allUsers.filter(u => u.isAssistantAdmin).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded-lg border mb-1">
                      <div><p className="text-xs font-medium">{u.name}</p><p className="text-[10px] text-muted-foreground">{Object.values(u.assistantPermissions || {}).filter(Boolean).length} صلاحية</p></div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => openPerms(u, "assistant")}>تعديل</Button>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] text-red-600" onClick={() => removeAssistant(u.id)}>إزالة</Button>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* المشرفون */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600" />صلاحيات المشرفين ({allUsers.filter(u => u.role === "supervisor").length})</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {allUsers.filter(u => u.role === "supervisor").map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/30">
                    <div><p className="text-xs font-medium">{u.name}</p><p className="text-[10px] text-muted-foreground">{Object.values(u.supervisorPermissions || {}).filter(Boolean).length}/{SUPERVISOR_PERMS.length} صلاحية</p></div>
                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => openPerms(u, "supervisor")}>تعديل</Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* الأساتذة */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserCog className="w-4 h-4 text-emerald-600" />استثناءات الأساتذة ({allUsers.filter(u => u.role === "teacher").length})</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {allUsers.filter(u => u.role === "teacher").map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/30">
                    <div><p className="text-xs font-medium">{u.name}</p><p className="text-[10px] text-muted-foreground">{Object.values(u.teacherPermissions || {}).filter(Boolean).length > 0 ? `${Object.values(u.teacherPermissions || {}).filter(Boolean).length} استثناء` : "بدون"}</p></div>
                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => openPerms(u, "teacher")}>تعديل</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== الجوامع ===== */}
        <TabsContent value="mosques">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />صحة الجوامع ({mosques.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                <TableHead>المسجد</TableHead><TableHead className="hidden sm:table-cell">المدينة</TableHead><TableHead>الطلاب</TableHead><TableHead>الصحة</TableHead>
              </TableRow></TableHeader><TableBody>
                {mosques.map(m => { const h = mosqueHealth[m.id]; const s = h?.score ?? null; return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs font-medium">{m.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-[10px] text-muted-foreground">{m.city || "—"}</TableCell>
                    <TableCell className="text-[10px]">{h ? `${h.activeStudents ?? 0}/${h.totalStudents ?? 0}` : "—"}</TableCell>
                    <TableCell>{s !== null ? <div className="flex items-center gap-1"><Progress value={Math.min(100, s)} className="h-1.5 w-12" /><span className={`text-[10px] font-medium ${s >= 70 ? "text-green-600" : s >= 40 ? "text-amber-600" : "text-red-600"}`}>{s}%</span></div> : "—"}</TableCell>
                  </TableRow>
                ); })}
              </TableBody></Table></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== السجل ===== */}
        <TabsContent value="activity">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />سجل النشاط ({activityLogs.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto"><Table><TableHeader className="sticky top-0 bg-background"><TableRow>
                <TableHead>المستخدم</TableHead><TableHead>العملية</TableHead><TableHead className="hidden sm:table-cell">القسم</TableHead><TableHead className="hidden md:table-cell">التفاصيل</TableHead><TableHead>الوقت</TableHead><TableHead>الحالة</TableHead>
              </TableRow></TableHeader><TableBody>
                {activityLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-medium">{log.userName}</TableCell>
                    <TableCell className="text-[10px]">{log.action}</TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-[9px]">{moduleLabels[log.module] || log.module}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-[10px] text-muted-foreground max-w-[200px] truncate">{log.details || "—"}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{timeAgo(log.createdAt)}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[9px] ${log.status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{log.status === "success" ? "ناجح" : "تنبيه"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== نوافذ الحوار ===== */}

      {/* نافذة الصلاحيات */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {permType === "assistant" ? <Crown className="w-5 h-5 text-purple-600" /> : permType === "supervisor" ? <ShieldCheck className="w-5 h-5 text-blue-600" /> : <UserCog className="w-5 h-5 text-emerald-600" />}
              {permType === "assistant" ? "صلاحيات مساعد المدير" : permType === "supervisor" ? "صلاحيات المشرف" : "استثناءات الأستاذ"}
            </DialogTitle>
          </DialogHeader>
          {permUser && <div className="bg-muted/50 p-2 rounded-lg"><p className="text-sm font-medium">{permUser.name}</p><p className="text-[10px] text-muted-foreground">{roleLabels[permUser.role]} | {permUser.username}</p></div>}
          {permType === "supervisor" && <div className="flex gap-1">{[["full", "كامل"], ["limited", "محدود"], ["academic", "أكاديمي"]].map(([k, l]) => <Button key={k} variant="outline" size="sm" className="text-[10px] h-6" onClick={() => setPermValues(SUP_TEMPLATES[k])}>{l}</Button>)}</div>}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {(permType === "assistant" ? ASSISTANT_PERMS : permType === "supervisor" ? SUPERVISOR_PERMS : TEACHER_PERMS).map(p => (
              <div key={p.key} className="flex items-center justify-between p-2 rounded-lg border">
                <span className="text-xs">{p.label}</span>
                <Switch checked={!!permValues[p.key]} onCheckedChange={v => setPermValues(prev => ({ ...prev, [p.key]: v }))} />
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={savePerms} className="flex-1">حفظ</Button><Button variant="outline" onClick={() => setPermDialogOpen(false)}>إلغاء</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة الرفض */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>رفض الطلب</DialogTitle></DialogHeader>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="سبب الرفض (اختياري)..." />
          <DialogFooter><Button variant="destructive" onClick={rejectUser}>تأكيد</Button><Button variant="outline" onClick={() => setRejectDialogOpen(false)}>إلغاء</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة العمليات الجماعية */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5" />عمليات جماعية ({selectedUserIds.size} مستخدم)</DialogTitle></DialogHeader>
          <Select value={bulkAction} onValueChange={(v: any) => setBulkAction(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reset_passwords">إعادة تعيين كلمات المرور (123456)</SelectItem>
              <SelectItem value="toggle_active">تفعيل/تعطيل الحسابات</SelectItem>
              <SelectItem value="move">نقل إلى مسجد آخر</SelectItem>
            </SelectContent>
          </Select>
          {bulkAction === "move" && (
            <Select value={bulkMosqueTarget} onValueChange={setBulkMosqueTarget}>
              <SelectTrigger><SelectValue placeholder="اختر المسجد الهدف" /></SelectTrigger>
              <SelectContent>{mosques.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <DialogFooter><Button onClick={executeBulk}>تنفيذ</Button><Button variant="outline" onClick={() => setBulkDialogOpen(false)}>إلغاء</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
