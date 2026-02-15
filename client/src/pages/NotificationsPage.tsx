import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, BellRing, CheckCheck, Clock, Info, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
