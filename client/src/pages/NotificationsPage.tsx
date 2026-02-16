import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellRing, CheckCheck, Clock, Info, Loader2, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

interface Notification {
  id: string;
  userId: string;
  mosqueId?: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
  mosqueId?: string | null;
}

interface MosqueOption {
  id: string;
  name: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canDelete = user?.role === "admin" || user?.role === "supervisor";
  const canSend = user?.role === "admin" || user?.role === "supervisor";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showSendForm, setShowSendForm] = useState(false);
  const [sendTitle, setSendTitle] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendType, setSendType] = useState("info");
  const [targetType, setTargetType] = useState("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetMosqueId, setTargetMosqueId] = useState("");
  const [sending, setSending] = useState(false);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [mosquesList, setMosquesList] = useState<MosqueOption[]>([]);

  useEffect(() => {
    fetch("/api/notifications", { credentials: "include" })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Failed to load");
      })
      .then(data => setNotifications(data))
      .catch(() => {
        toast({ title: "خطأ", description: "فشل في تحميل الإشعارات", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!canSend) return;
    fetch("/api/users", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setUsersList(data))
      .catch(() => {});
    if (user?.role === "admin") {
      fetch("/api/mosques", { credentials: "include" })
        .then(res => res.ok ? res.json() : [])
        .then(data => setMosquesList(data))
        .catch(() => {});
    }
  }, [canSend, user?.role]);

  const handleSendNotification = async () => {
    if (!sendTitle.trim() || !sendMessage.trim()) {
      toast({ title: "خطأ", description: "العنوان والرسالة مطلوبان", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sendTitle,
          message: sendMessage,
          type: sendType,
          targetType,
          targetUserId: targetType === "user" ? targetUserId : undefined,
          targetMosqueId: targetType === "mosque" ? targetMosqueId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "تم", description: data.message, className: "bg-green-50 border-green-200 text-green-800" });
      setSendTitle("");
      setSendMessage("");
      setSendType("info");
      setTargetType("all");
      setTargetUserId("");
      setTargetMosqueId("");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل في إرسال الإشعار", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "الآن";
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `منذ ${hours} ساعة`;
      const days = Math.floor(hours / 24);
      return `منذ ${days} يوم`;
    } catch {
      return dateStr;
    }
  };

  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast({ title: "تم", description: "تم تحديد جميع الإشعارات كمقروءة", className: "bg-green-50 border-green-200 text-green-800" });
    } catch {
      toast({ title: "خطأ", description: "فشل في تحديد الإشعارات كمقروءة", variant: "destructive" });
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      toast({ title: "تم", description: "تم تحديد الإشعار كمقروء", className: "bg-green-50 border-green-200 text-green-800" });
    } catch {
      toast({ title: "خطأ", description: "فشل في تحديد الإشعار كمقروء", variant: "destructive" });
    }
  };

  const handleDeleteOne = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      setNotifications(prev => prev.filter(n => n.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast({ title: "تم", description: "تم حذف الإشعار", className: "bg-green-50 border-green-200 text-green-800" });
    } catch {
      toast({ title: "خطأ", description: "فشل في حذف الإشعار", variant: "destructive" });
    }
  };

  const handleMarkSelectedRead = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch("/api/notifications/read-selected", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Failed");
      setNotifications(prev => prev.map(n => selectedIds.has(n.id) ? { ...n, isRead: true } : n));
      setSelectedIds(new Set());
      toast({ title: "تم", description: "تم تحديد الإشعارات المحددة كمقروءة", className: "bg-green-50 border-green-200 text-green-800" });
    } catch {
      toast({ title: "خطأ", description: "فشل في تحديد الإشعارات كمقروءة", variant: "destructive" });
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await fetch("/api/notifications/delete-all", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      setNotifications([]);
      setSelectedIds(new Set());
      toast({ title: "تم", description: "تم حذف جميع الإشعارات", className: "bg-green-50 border-green-200 text-green-800" });
    } catch {
      toast({ title: "خطأ", description: "فشل في حذف الإشعارات", variant: "destructive" });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch("/api/notifications/delete-selected", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Failed");
      setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      toast({ title: "تم", description: "تم حذف الإشعارات المحددة", className: "bg-green-50 border-green-200 text-green-800" });
    } catch {
      toast({ title: "خطأ", description: "فشل في حذف الإشعارات المحددة", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">الإشعارات والتنبيهات</h1>
          <p className="text-muted-foreground">مركز الرسائل والتنبيهات الخاص بك</p>
        </div>
      </div>

      {canSend && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowSendForm(!showSendForm)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                إرسال إشعار جديد
              </CardTitle>
              {showSendForm ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {showSendForm && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان الإشعار</Label>
                <Input
                  placeholder="عنوان الإشعار"
                  value={sendTitle}
                  onChange={e => setSendTitle(e.target.value)}
                  data-testid="input-send-title"
                />
              </div>
              <div className="space-y-2">
                <Label>نص الرسالة</Label>
                <Textarea
                  placeholder="نص الرسالة"
                  value={sendMessage}
                  onChange={e => setSendMessage(e.target.value)}
                  rows={3}
                  data-testid="input-send-message"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع الإشعار</Label>
                <Select value={sendType} onValueChange={setSendType}>
                  <SelectTrigger data-testid="select-send-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">معلومة</SelectItem>
                    <SelectItem value="warning">تحذير</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                    <SelectItem value="success">نجاح</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الهدف</Label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="targetType" value="all" checked={targetType === "all"} onChange={() => setTargetType("all")} data-testid="radio-target-all" />
                    <span className="text-sm">{user?.role === "admin" ? "جميع المستخدمين" : "جميع مستخدمي الجامع/المركز"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="targetType" value="user" checked={targetType === "user"} onChange={() => setTargetType("user")} data-testid="radio-target-user" />
                    <span className="text-sm">مستخدم محدد</span>
                  </label>
                  {user?.role === "admin" && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="targetType" value="mosque" checked={targetType === "mosque"} onChange={() => setTargetType("mosque")} data-testid="radio-target-mosque" />
                      <span className="text-sm">جامع/مركز محدد</span>
                    </label>
                  )}
                </div>
              </div>
              {targetType === "user" && (
                <div className="space-y-2">
                  <Label>اختر المستخدم</Label>
                  <Select value={targetUserId} onValueChange={setTargetUserId}>
                    <SelectTrigger data-testid="select-target-user">
                      <SelectValue placeholder="اختر مستخدم" />
                    </SelectTrigger>
                    <SelectContent>
                      {usersList.filter(u => u.id !== user?.id).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {targetType === "mosque" && user?.role === "admin" && (
                <div className="space-y-2">
                  <Label>اختر الجامع/المركز</Label>
                  <Select value={targetMosqueId} onValueChange={setTargetMosqueId}>
                    <SelectTrigger data-testid="select-target-mosque">
                      <SelectValue placeholder="اختر الجامع/المركز" />
                    </SelectTrigger>
                    <SelectContent>
                      {mosquesList.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                onClick={handleSendNotification}
                disabled={sending || !sendTitle.trim() || !sendMessage.trim()}
                className="w-full gap-2"
                data-testid="button-send-notification"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "جاري الإرسال..." : "إرسال الإشعار"}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {!loading && notifications.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border" data-testid="toolbar-notifications">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={toggleSelectAll}
            data-testid="button-toggle-select-all"
          >
            {allSelected ? "إلغاء التحديد" : "تحديد الكل"}
          </Button>

          {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            data-testid="button-delete-selected"
          >
            <Trash2 className="w-4 h-4" />
            حذف المحدد
          </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleMarkSelectedRead}
            disabled={selectedIds.size === 0}
            data-testid="button-mark-selected-read"
          >
            <CheckCheck className="w-4 h-4" />
            تحديد المحدد كمقروء
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleMarkAllRead}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
          </Button>

          {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleDeleteAll}
            data-testid="button-delete-all"
          >
            <Trash2 className="w-4 h-4" />
            حذف الكل
          </Button>
          )}

          {selectedIds.size > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-selected-count">
              {selectedIds.size} محدد
            </Badge>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12" data-testid="status-loading">
          <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
          <span>جاري التحميل...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground" data-testid="status-empty">
          لا توجد إشعارات
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <Card key={notif.id} className={`transition-all hover:shadow-md ${!notif.isRead ? 'border-r-4 border-r-primary bg-primary/5' : ''}`} data-testid={`card-notification-${notif.id}`}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex items-center pt-1">
                  <Checkbox
                    checked={selectedIds.has(notif.id)}
                    onCheckedChange={() => toggleSelect(notif.id)}
                    data-testid={`checkbox-notification-${notif.id}`}
                  />
                </div>

                <div className={`p-3 rounded-full shrink-0 ${
                  notif.type === 'urgent' ? 'bg-red-100 text-red-600' :
                  notif.type === 'success' ? 'bg-green-100 text-green-600' :
                  notif.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {notif.type === 'urgent' ? <BellRing className="w-5 h-5" /> :
                   notif.type === 'success' ? <CheckCheck className="w-5 h-5" /> :
                   notif.type === 'warning' ? <Info className="w-5 h-5" /> :
                   <Bell className="w-5 h-5" />}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className={`font-bold text-base ${!notif.isRead ? 'text-primary' : ''}`} data-testid={`text-notification-title-${notif.id}`}>{notif.title}</h4>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed" data-testid={`text-notification-message-${notif.id}`}>
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {!notif.isRead && (
                      <>
                        <Badge variant="secondary" className="text-xs font-normal" data-testid={`badge-new-${notif.id}`}>جديد</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleMarkOneRead(notif.id)}
                          data-testid={`button-mark-read-${notif.id}`}
                        >
                          <CheckCheck className="w-3 h-3" />
                          تحديد كمقروء
                        </Button>
                      </>
                    )}
                    {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteOne(notif.id)}
                      data-testid={`button-delete-${notif.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
