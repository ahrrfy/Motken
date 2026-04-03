import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, BookOpen, UserCheck, Activity,
  MessageSquare, MapPin, Phone, Calendar,
  ArrowRight, ShieldCheck, MessageCircle,
  BarChart3, Clock, AlertTriangle
} from "lucide-react";
import { MessagingPanel } from "@/components/messaging-panel";
import { useToast } from "@/hooks/use-toast";
import { getWhatsAppUrl } from "@/lib/phone-utils";
import { formatDateAr } from "@/lib/utils";

export default function MosqueDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: mosque, isLoading } = useQuery<any>({
    queryKey: [`/api/mosques/${id}`],
    staleTime: 30_000,
  });

  const { data: stats } = useQuery<any>({
    queryKey: [`/api/mosques/${id}/stats`],
    staleTime: 60_000,
    enabled: !!mosque,
  });

  const { data: history } = useQuery<any>({
    queryKey: [`/api/mosques/${id}/history`],
    staleTime: 30_000,
    enabled: !!mosque,
  });

  const { data: students } = useQuery<any[]>({
    queryKey: [`/api/mosques/${id}/users-list?role=student`],
    staleTime: 30_000,
    enabled: !!mosque,
  });

  const { data: teachers } = useQuery<any[]>({
    queryKey: [`/api/mosques/${id}/users-list?role=teacher`],
    staleTime: 30_000,
    enabled: !!mosque,
  });

  const changeStatus = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/mosques/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/mosques/${id}`] });
      qc.invalidateQueries({ queryKey: [`/api/mosques/${id}/stats`] });
      qc.invalidateQueries({ queryKey: [`/api/mosques/${id}/history`] });
      qc.invalidateQueries({ queryKey: ["/api/mosques"] });
      toast({ title: "تم تحديث الحالة بنجاح" });
    },
    onError: () => toast({ title: "فشل تحديث الحالة", variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!mosque) return (
    <div className="p-10 text-center">
      <div className="text-gray-400 text-lg">المسجد/المركز غير موجود</div>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/mosques")}>
        <ArrowRight className="h-4 w-4 ml-2" />
        العودة للجوامع
      </Button>
    </div>
  );

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    suspended: "bg-yellow-100 text-yellow-800",
    permanently_closed: "bg-red-100 text-red-800",
  };

  const statusLabel: Record<string, string> = {
    active: "نشط",
    suspended: "موقوف مؤقتاً",
    permanently_closed: "مغلق نهائياً",
  };

  const whatsappUrl = stats?.supervisorPhone
    ? getWhatsAppUrl(stats.supervisorPhone)
    : null;

  const formatLastActivity = (dateStr: string | null) => {
    if (!dateStr) return "لا يوجد نشاط مسجل";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "اليوم";
    if (diffDays === 1) return "أمس";
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    return formatDateAr(date);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
        <button onClick={() => navigate("/mosques")} className="hover:text-primary transition-colors" data-testid="link-back-mosques">الجوامع والمراكز</button>
        <span>/</span>
        <span className="text-gray-600">{mosque.name}</span>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {mosque.image ? (
            <img src={mosque.image} alt={mosque.name} className="w-14 h-14 rounded-xl object-cover border" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800" data-testid="text-mosque-name">{mosque.name}</h1>
            <div className="flex items-center gap-2 text-gray-500 mt-1 text-sm">
              <MapPin className="h-3.5 w-3.5" />
              <span>{[mosque.province, mosque.city, mosque.area].filter(Boolean).join(" - ")}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusColor[mosque.status] || "bg-gray-100 text-gray-800"} data-testid="badge-mosque-status">
            {statusLabel[mosque.status] || mosque.status}
          </Badge>
          {mosque.status !== "active" && (
            <Button size="sm" variant="outline" className="text-green-600 border-green-400 gap-1"
              onClick={() => changeStatus.mutate("active")}
              disabled={changeStatus.isPending}
              data-testid="button-activate-mosque">
              تفعيل
            </Button>
          )}
          {mosque.status === "active" && (
            <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-400 gap-1"
              onClick={() => changeStatus.mutate("suspended")}
              disabled={changeStatus.isPending}
              data-testid="button-suspend-mosque">
              إيقاف مؤقت
            </Button>
          )}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="text-green-600 border-green-400 gap-1" data-testid="button-whatsapp-supervisor">
                <MessageCircle className="h-3.5 w-3.5" />
                واتساب المشرف
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "الطلاب", value: stats?.studentsCount ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "الأساتذة", value: stats?.teachersCount ?? 0, icon: BookOpen, color: "text-green-600", bg: "bg-green-50" },
          { label: "المشرفون", value: stats?.supervisorsCount ?? 0, icon: UserCheck, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "الطلاب النشطون", value: stats?.activeStudents ?? 0, icon: Activity, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "نسبة الحضور", value: `${stats?.attendanceRate ?? 0}%`, icon: BarChart3, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "آخر نشاط", value: formatLastActivity(stats?.lastActivity), icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50", small: true },
        ].map((item, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div className={`font-bold text-gray-800 ${(item as any).small ? "text-sm" : "text-2xl"}`} data-testid={`stat-${item.label}`}>{item.value}</div>
              <div className="text-sm text-gray-500">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats?.lastActivity && (() => {
        const daysSince = Math.floor((Date.now() - new Date(stats.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 7) {
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3" data-testid="alert-inactivity">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-medium text-amber-800">تنبيه عدم نشاط</div>
                <div className="text-sm text-amber-600">لم يتم تسجيل أي نشاط في هذا المسجد/المركز منذ {daysSince} يوم</div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <Tabs defaultValue="info" dir="rtl">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent">
          <TabsTrigger value="info" data-testid="tab-info">المعلومات</TabsTrigger>
          <TabsTrigger value="supervisor" data-testid="tab-supervisor">المشرف المؤسس</TabsTrigger>
          <TabsTrigger value="students" data-testid="tab-students">الطلاب</TabsTrigger>
          <TabsTrigger value="teachers" data-testid="tab-teachers">الأساتذة</TabsTrigger>
          <TabsTrigger value="message" data-testid="tab-message">مراسلة المشرف</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">سجل الأحداث</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "اسم المسجد/المركز", value: mosque.name },
                { label: "المحافظة", value: mosque.province },
                { label: "المدينة", value: mosque.city },
                { label: "المنطقة / الحي", value: mosque.area },
                { label: "أقرب نقطة دالة", value: mosque.landmark },
                { label: "العنوان التفصيلي", value: mosque.address },
                { label: "هاتف المسجد", value: mosque.phone },
                { label: "المسؤول", value: mosque.managerName },
                { label: "الوصف", value: mosque.description },
                { label: "تاريخ التسجيل", value: mosque.createdAt ? formatDateAr(mosque.createdAt) : "—" },
                { label: "الحالة", value: statusLabel[mosque.status] || mosque.status },
              ].map((row, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-xs text-gray-400 font-medium">{row.label}</div>
                  <div className="text-gray-800 font-medium" data-testid={`info-${row.label}`}>{row.value || "—"}</div>
                </div>
              ))}
              {mosque.adminNotes && (
                <div className="col-span-full space-y-1 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="text-xs text-yellow-600 font-medium">ملاحظات إدارية</div>
                  <div className="text-gray-800 text-sm">{mosque.adminNotes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supervisor" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-700">
                  {(stats?.supervisorName || "م")?.charAt(0)}
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-800" data-testid="text-supervisor-name">{stats?.supervisorName || "لم يُعيّن مشرف"}</div>
                  <div className="text-gray-500">المشرف المؤسس</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-400">رقم الهاتف</div>
                    <div className="font-mono font-medium" dir="ltr" data-testid="text-supervisor-phone">
                      {stats?.supervisorPhone || "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-400">تاريخ التسجيل</div>
                    <div className="font-medium">{mosque.createdAt ? formatDateAr(mosque.createdAt) : "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-400">آخر تسجيل دخول</div>
                    <div className="font-medium" data-testid="text-supervisor-last-login">
                      {stats?.lastSupervisorLogin ? formatDateAr(stats.lastSupervisorLogin) : "—"}
                    </div>
                  </div>
                </div>
              </div>
              {whatsappUrl && (
                <div className="mt-4 flex gap-2">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-green-600 hover:bg-green-700 gap-2" data-testid="button-whatsapp-panel">
                      <MessageCircle className="h-4 w-4" />
                      تواصل عبر واتساب
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">قائمة الطلاب ({students?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {(!students || students.length === 0) ? (
                <div className="text-center text-gray-400 py-8">لا يوجد طلاب مسجلون بعد</div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {students.map((s: any) => (
                    <div key={s.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium" data-testid={`student-name-${s.id}`}>{s.name}</div>
                        <div className="text-sm text-gray-400">{s.phone || s.parentPhone || "—"}</div>
                      </div>
                      <Badge variant={s.isActive ? "default" : "secondary"}>
                        {s.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">قائمة الأساتذة ({teachers?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {(!teachers || teachers.length === 0) ? (
                <div className="text-center text-gray-400 py-8">لا يوجد أساتذة مسجلون بعد</div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {teachers.map((t: any) => (
                    <div key={t.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium" data-testid={`teacher-name-${t.id}`}>{t.name}</div>
                        <div className="text-sm text-gray-400" dir="ltr">{t.phone || "—"}</div>
                      </div>
                      <Badge variant={t.isActive ? "default" : "secondary"}>
                        {t.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="message" className="mt-4">
          <MessagingPanel mosqueId={id!} supervisorName={stats?.supervisorName || mosque.managerName || "المشرف"} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">سجل الأحداث</CardTitle></CardHeader>
            <CardContent>
              {(!history || (history as any[]).length === 0) ? (
                <div className="text-center text-gray-400 py-8">لا توجد أحداث مسجلة</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(history as any[]).map((h: any) => (
                    <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        h.type === "status_change" ? "bg-yellow-400" :
                        h.type === "created" ? "bg-green-400" :
                        h.type === "message_sent" ? "bg-blue-400" : "bg-gray-400"
                      }`} />
                      <div>
                        <div className="text-sm font-medium">{h.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(h.createdAt).toLocaleString("ar-IQ")} — بواسطة: {h.byUser ?? "النظام"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
