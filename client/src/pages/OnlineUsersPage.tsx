import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Monitor,
  Smartphone,
  Tablet,
  Shield,
  ShieldOff,
  UserX,
  LogOut,
  Ban,
  RefreshCw,
  Wifi,
  WifiOff,
  MoreVertical,
  Plus,
  Trash2,
  Globe,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { formatDateAr, formatDateTimeAr } from "@/lib/utils";

interface Session {
  sessionId: string;
  userId: string;
  username: string;
  name: string;
  role: string;
  mosqueId: string | null;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  deviceInfo: string;
  browser: string;
  os: string;
  lastActivity: number;
  loginTime: number;
  isOnline: boolean;
}

interface BannedDevice {
  id: string;
  ipAddress?: string;
  reason?: string;
  createdAt?: string;
  bannedAt?: string;
}

const roleNames: Record<string, string> = {
  admin: "مدير النظام",
  supervisor: "مشرف",
  teacher: "أستاذ",
  student: "طالب",
};

function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "الآن";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function formatDateTime(timestamp: number): string {
  return formatDateTimeAr(timestamp);
}

function DeviceIcon({ type }: { type: string }) {
  switch (type) {
    case "mobile":
      return <Smartphone className="w-4 h-4" />;
    case "tablet":
      return <Tablet className="w-4 h-4" />;
    default:
      return <Monitor className="w-4 h-4" />;
  }
}

export default function OnlineUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bannedDevices, setBannedDevices] = useState<BannedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannedLoading, setBannedLoading] = useState(true);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<Session | null>(null);
  const [banReason, setBanReason] = useState("");
  const [newBanIp, setNewBanIp] = useState("");
  const [newBanReason, setNewBanReason] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/sessions", { credentials: "include" });
      if (res.ok) {
        setSessions(await res.json());
      }
    } catch {
      if (showRefresh) {
        toast({ title: "خطأ في تحميل الجلسات", variant: "destructive" });
      }
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  }, [toast]);

  const fetchBannedDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/banned-devices", { credentials: "include" });
      if (res.ok) {
        setBannedDevices(await res.json());
      }
    } catch {
      // silent
    } finally {
      setBannedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchBannedDevices();
  }, [fetchSessions, fetchBannedDevices]);

  useEffect(() => {
    const interval = setInterval(() => fetchSessions(), 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleKickSession = async (sessionId: string) => {
    try {
      const res = await fetch("/api/admin/kick-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        toast({ title: "تم إنهاء الجلسة بنجاح" });
        fetchSessions(true);
      } else {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const handleKickUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/kick-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        toast({ title: "تم إنهاء جميع جلسات المستخدم" });
        fetchSessions(true);
      } else {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/suspend-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        toast({ title: "تم إيقاف الحساب مؤقتاً" });
        fetchSessions(true);
      } else {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/activate-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        toast({ title: "تم تفعيل الحساب بنجاح" });
        fetchSessions(true);
      } else {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const handleBanPermanent = async () => {
    if (!banTarget || !banReason.trim()) return;
    try {
      const res = await fetch("/api/admin/ban-permanent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: banTarget.userId, reason: banReason }),
      });
      if (res.ok) {
        toast({ title: "تم حظر المستخدم نهائياً" });
        fetchSessions(true);
        fetchBannedDevices();
      } else {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setBanDialogOpen(false);
      setBanTarget(null);
      setBanReason("");
    }
  };

  const handleBanIp = async () => {
    if (!newBanIp.trim()) return;
    try {
      const res = await fetch("/api/admin/ban-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ipAddress: newBanIp, reason: newBanReason }),
      });
      if (res.ok) {
        toast({ title: "تم حظر العنوان بنجاح" });
        setNewBanIp("");
        setNewBanReason("");
        fetchBannedDevices();
      } else {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const handleRemoveBan = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/banned-devices/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم إزالة الحظر" });
        fetchBannedDevices();
      } else {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  if (user?.role !== "admin") {
    return <div className="p-8 text-center text-muted-foreground">غير مصرح بالوصول</div>;
  }

  const onlineCount = sessions.filter((s) => s.isOnline).length;
  const offlineCount = sessions.filter((s) => !s.isOnline).length;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold" data-testid="text-page-title">مراقبة المستخدمين</h1>
          <p className="text-muted-foreground text-sm">مراقبة الجلسات النشطة وإدارة الحظر</p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchSessions(true)}
          disabled={refreshing}
          data-testid="button-refresh-sessions"
        >
          <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <Card className="border-r-4 border-r-green-500">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold" data-testid="text-stat-online">{onlineCount}</div>
              <div className="text-xs text-muted-foreground">متصل الآن</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-r-4 border-r-orange-500">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold" data-testid="text-stat-offline">{offlineCount}</div>
              <div className="text-xs text-muted-foreground">غير متصل</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-r-4 border-r-red-500">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold" data-testid="text-stat-banned">{bannedDevices.length}</div>
              <div className="text-xs text-muted-foreground">عناوين محظورة</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="sessions" data-testid="tab-sessions" className="flex-1 sm:flex-none gap-2">
            <Globe className="w-4 h-4" />
            الجلسات النشطة
          </TabsTrigger>
          <TabsTrigger value="banned" data-testid="tab-banned" className="flex-1 sm:flex-none gap-2">
            <Shield className="w-4 h-4" />
            العناوين المحظورة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">لا توجد جلسات نشطة</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right py-3 px-3 font-medium">الحالة</th>
                        <th className="text-right py-3 px-3 font-medium">المستخدم</th>
                        <th className="text-right py-3 px-3 font-medium hidden md:table-cell">اسم المستخدم</th>
                        <th className="text-right py-3 px-3 font-medium hidden lg:table-cell">عنوان IP</th>
                        <th className="text-right py-3 px-3 font-medium hidden md:table-cell">الجهاز</th>
                        <th className="text-right py-3 px-3 font-medium hidden xl:table-cell">المتصفح / النظام</th>
                        <th className="text-right py-3 px-3 font-medium">آخر نشاط</th>
                        <th className="text-right py-3 px-3 font-medium hidden lg:table-cell">وقت الدخول</th>
                        <th className="text-center py-3 px-3 font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr
                          key={session.sessionId}
                          className="border-b hover:bg-muted/50 transition-colors"
                          data-testid={`row-session-${session.sessionId}`}
                        >
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block w-3 h-3 rounded-full ${
                                session.isOnline ? "bg-green-500" : "bg-orange-500"
                              }`}
                              title={session.isOnline ? "متصل" : "غير متصل"}
                              data-testid={`status-${session.sessionId}`}
                            />
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-medium" data-testid={`text-name-${session.sessionId}`}>
                                {session.name}
                              </span>
                              <Badge variant="secondary" className="w-fit text-xs mt-1">
                                {roleNames[session.role] || session.role}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell text-muted-foreground" dir="ltr">
                            {session.username}
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <code className="text-xs bg-muted px-2 py-1 rounded" dir="ltr" data-testid={`text-ip-${session.sessionId}`}>
                              {session.ipAddress}
                            </code>
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DeviceIcon type={session.deviceType} />
                              <span className="text-xs">{session.deviceInfo}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden xl:table-cell text-xs text-muted-foreground">
                            <div>{session.browser}</div>
                            <div>{session.os}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span data-testid={`text-activity-${session.sessionId}`}>
                                {getRelativeTime(session.lastActivity)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell text-xs text-muted-foreground">
                            {formatDateTime(session.loginTime)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  data-testid={`button-actions-${session.sessionId}`}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleKickSession(session.sessionId)}
                                  data-testid={`action-kick-session-${session.sessionId}`}
                                >
                                  <LogOut className="w-4 h-4 ml-2" />
                                  إنهاء الجلسة
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleKickUser(session.userId)}
                                  data-testid={`action-kick-user-${session.sessionId}`}
                                >
                                  <UserX className="w-4 h-4 ml-2" />
                                  إنهاء جميع الجلسات
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleSuspendUser(session.userId)}
                                  data-testid={`action-suspend-${session.sessionId}`}
                                >
                                  <ShieldOff className="w-4 h-4 ml-2" />
                                  إيقاف الحساب مؤقتاً
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleActivateUser(session.userId)}
                                  data-testid={`action-activate-${session.sessionId}`}
                                >
                                  <Shield className="w-4 h-4 ml-2" />
                                  تفعيل الحساب
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => {
                                    setBanTarget(session);
                                    setBanDialogOpen(true);
                                  }}
                                  data-testid={`action-ban-${session.sessionId}`}
                                >
                                  <Ban className="w-4 h-4 ml-2" />
                                  حظر نهائي
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banned" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                حظر عنوان IP جديد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1">
                  <Label>عنوان IP</Label>
                  <Input
                    value={newBanIp}
                    onChange={(e) => setNewBanIp(e.target.value)}
                    placeholder="192.168.1.1"
                    dir="ltr"
                    data-testid="input-ban-ip"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label>السبب</Label>
                  <Input
                    value={newBanReason}
                    onChange={(e) => setNewBanReason(e.target.value)}
                    placeholder="سبب الحظر..."
                    data-testid="input-ban-reason"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleBanIp} disabled={!newBanIp.trim()} data-testid="button-add-ban">
                    <Ban className="w-4 h-4 ml-2" />
                    حظر
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {bannedLoading ? (
                <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
              ) : bannedDevices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">لا توجد عناوين محظورة</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right py-3 px-3 font-medium">عنوان IP</th>
                        <th className="text-right py-3 px-3 font-medium">السبب</th>
                        <th className="text-right py-3 px-3 font-medium hidden md:table-cell">تاريخ الحظر</th>
                        <th className="text-center py-3 px-3 font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bannedDevices.map((device) => (
                        <tr
                          key={device.id}
                          className="border-b hover:bg-muted/50 transition-colors"
                          data-testid={`row-banned-${device.id}`}
                        >
                          <td className="py-3 px-3">
                            <code className="text-xs bg-muted px-2 py-1 rounded" dir="ltr">
                              {device.ipAddress || "—"}
                            </code>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {device.reason || "—"}
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell text-xs text-muted-foreground">
                            {device.createdAt
                              ? formatDateAr(device.createdAt)
                              : device.bannedAt
                              ? formatDateAr(device.bannedAt)
                              : "—"}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                              onClick={() => handleRemoveBan(device.id)}
                              data-testid={`button-remove-ban-${device.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد الحظر النهائي
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حظر المستخدم "{banTarget?.name}" نهائياً؟ سيتم إيقاف حسابه وحظر جميع عناوين IP المرتبطة به. لا يمكن التراجع عن هذا الإجراء بسهولة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>سبب الحظر *</Label>
            <Input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="اكتب سبب الحظر..."
              data-testid="input-ban-permanent-reason"
            />
          </div>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel onClick={() => { setBanTarget(null); setBanReason(""); }}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanPermanent}
              disabled={!banReason.trim()}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-ban"
            >
              <Ban className="w-4 h-4 ml-2" />
              حظر نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
