import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";
import {
  Loader2, Plus, AlertTriangle, ShieldAlert, Users, RefreshCw, Trash2, Edit, UserX, UserCheck
} from "lucide-react";

interface Substitution {
  id: string;
  absentTeacherId: string;
  absentTeacherName?: string;
  substituteTeacherId: string;
  substituteTeacherName?: string;
  reason?: string;
  date: string;
  studentsCount?: number;
  status: string;
  createdAt?: string;
}

interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  reportedBy?: string;
  reporterName?: string;
  actionTaken?: string;
  createdAt?: string;
}

interface Teacher {
  id: string;
  name: string;
  role?: string;
}

const subStatusMap: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-green-100 text-green-800 border-green-200" },
  completed: { label: "مكتمل", color: "bg-gray-100 text-gray-800 border-gray-200" },
  cancelled: { label: "ملغى", color: "bg-red-100 text-red-800 border-red-200" },
};

const severityMap: Record<string, { label: string; color: string }> = {
  low: { label: "منخفض", color: "bg-green-100 text-green-800 border-green-200" },
  medium: { label: "متوسط", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  high: { label: "مرتفع", color: "bg-orange-100 text-orange-800 border-orange-200" },
  critical: { label: "حرج", color: "bg-red-100 text-red-800 border-red-200" },
};

const incidentStatusMap: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوح", color: "bg-blue-100 text-blue-800 border-blue-200" },
  investigating: { label: "قيد التحقيق", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  resolved: { label: "تم الحل", color: "bg-green-100 text-green-800 border-green-200" },
};

export default function CrisisManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [incidentsLoading, setIncidentsLoading] = useState(true);

  const [createSubOpen, setCreateSubOpen] = useState(false);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [absentTeacherId, setAbsentTeacherId] = useState("");
  const [substituteTeacherId, setSubstituteTeacherId] = useState("");
  const [subReason, setSubReason] = useState("");
  const [subDate, setSubDate] = useState("");

  const [autoAbsentTeacherId, setAutoAbsentTeacherId] = useState("");

  const [createIncidentOpen, setCreateIncidentOpen] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState("medium");
  const [incidentActionTaken, setIncidentActionTaken] = useState("");
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);

  const [editIncidentOpen, setEditIncidentOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editIncidentStatus, setEditIncidentStatus] = useState("");
  const [editIncidentAction, setEditIncidentAction] = useState("");

  const canManage = user?.role === "admin" || user?.role === "supervisor" || user?.role === "teacher";

  const fetchSubstitutions = async () => {
    try {
      const res = await fetch("/api/emergency-substitutions", { credentials: "include" });
      if (res.ok) setSubstitutions(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الاستبدالات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch("/api/incidents", { credentials: "include" });
      if (res.ok) setIncidents(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الحوادث", variant: "destructive" });
    } finally {
      setIncidentsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubstitutions();
    fetchIncidents();
    fetch("/api/users?role=teacher", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setTeachers(data))
      .catch(() => {});
  }, []);

  const resetSubForm = () => {
    setAbsentTeacherId("");
    setSubstituteTeacherId("");
    setSubReason("");
    setSubDate("");
  };

  const handleCreateSub = async () => {
    if (!absentTeacherId || !substituteTeacherId || !subDate) {
      toast({ title: "خطأ", description: "جميع الحقول المطلوبة يجب ملؤها", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/emergency-substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          absentTeacherId,
          substituteTeacherId,
          reason: subReason || null,
          date: subDate,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء الاستبدال بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setCreateSubOpen(false);
        resetSubForm();
        fetchSubstitutions();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الاستبدال", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!autoAbsentTeacherId) {
      toast({ title: "خطأ", description: "اختر المعلم الغائب", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/emergency-substitutions/auto-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ absentTeacherId: autoAbsentTeacherId, date: new Date().toISOString().split("T")[0] }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم التوزيع التلقائي بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setAutoAssignOpen(false);
        setAutoAbsentTeacherId("");
        fetchSubstitutions();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في التوزيع التلقائي", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSub = async (id: string) => {
    try {
      const res = await fetch(`/api/emergency-substitutions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف الاستبدال", className: "bg-green-50 border-green-200 text-green-800" });
        fetchSubstitutions();
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الاستبدال", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const resetIncidentForm = () => {
    setIncidentTitle("");
    setIncidentDescription("");
    setIncidentSeverity("medium");
    setIncidentActionTaken("");
  };

  const handleCreateIncident = async () => {
    if (!incidentTitle) {
      toast({ title: "خطأ", description: "عنوان الحادثة مطلوب", variant: "destructive" });
      return;
    }
    setIncidentSubmitting(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: incidentTitle,
          description: incidentDescription || null,
          severity: incidentSeverity,
          actionTaken: incidentActionTaken || null,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم تسجيل الحادثة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setCreateIncidentOpen(false);
        resetIncidentForm();
        fetchIncidents();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في تسجيل الحادثة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setIncidentSubmitting(false);
    }
  };

  const openEditIncident = (incident: Incident) => {
    setEditingIncident(incident);
    setEditIncidentStatus(incident.status);
    setEditIncidentAction(incident.actionTaken || "");
    setEditIncidentOpen(true);
  };

  const handleUpdateIncident = async () => {
    if (!editingIncident) return;
    setIncidentSubmitting(true);
    try {
      const res = await fetch(`/api/incidents/${editingIncident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: editIncidentStatus,
          actionTaken: editIncidentAction || null,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم تحديث الحادثة", className: "bg-green-50 border-green-200 text-green-800" });
        setEditIncidentOpen(false);
        setEditingIncident(null);
        fetchIncidents();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في تحديث الحادثة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setIncidentSubmitting(false);
    }
  };

  const handleDeleteIncident = async (id: string) => {
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف الحادثة", className: "bg-green-50 border-green-200 text-green-800" });
        fetchIncidents();
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الحادثة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || id;

  const todayStr = new Date().toISOString().split("T")[0];
  const activeToday = substitutions.filter(s => s.status === "active" && s.date?.startsWith(todayStr)).length;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-crisis-management">
            إدارة الأزمات
          </h1>
          <p className="text-muted-foreground">إدارة الاستبدالات الطارئة وسجل الحوادث</p>
        </div>
      </div>

      <Tabs defaultValue="substitutions" dir="rtl">
        <TabsList data-testid="tabs-crisis">
          <TabsTrigger value="substitutions" data-testid="tab-substitutions">الاستبدال الطارئ</TabsTrigger>
          <TabsTrigger value="incidents" data-testid="tab-incidents">سجل الحوادث</TabsTrigger>
        </TabsList>

        <TabsContent value="substitutions" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card data-testid="card-stat-total-subs">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الاستبدالات</p>
                    <p className="text-2xl font-bold" data-testid="text-total-subs">{substitutions.length}</p>
                  </div>
                  <UserX className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-active-today">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">نشطة اليوم</p>
                    <p className="text-2xl font-bold" data-testid="text-active-today">{activeToday}</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-total-incidents">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الحوادث</p>
                    <p className="text-2xl font-bold" data-testid="text-total-incidents">{incidents.length}</p>
                  </div>
                  <ShieldAlert className="w-8 h-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  الاستبدالات الطارئة
                </CardTitle>
                {canManage && (
                  <div className="flex gap-2">
                    <Dialog open={autoAssignOpen} onOpenChange={setAutoAssignOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-auto-assign">
                          <RefreshCw className="w-4 h-4 ml-1" />
                          توزيع تلقائي
                        </Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl">
                        <DialogHeader>
                          <DialogTitle>توزيع تلقائي للاستبدال</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>المعلم الغائب</Label>
                            <Select value={autoAbsentTeacherId} onValueChange={setAutoAbsentTeacherId}>
                              <SelectTrigger data-testid="select-auto-absent-teacher">
                                <SelectValue placeholder="اختر المعلم الغائب" />
                              </SelectTrigger>
                              <SelectContent>
                                {teachers.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={handleAutoAssign}
                            disabled={!autoAbsentTeacherId || submitting}
                            className="w-full"
                            data-testid="button-confirm-auto-assign"
                          >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                            توزيع تلقائي
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={createSubOpen} onOpenChange={setCreateSubOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-create-substitution">
                          <Plus className="w-4 h-4 ml-1" />
                          إضافة استبدال
                        </Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl">
                        <DialogHeader>
                          <DialogTitle>إنشاء استبدال طارئ</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>المعلم الغائب *</Label>
                            <Select value={absentTeacherId} onValueChange={setAbsentTeacherId}>
                              <SelectTrigger data-testid="select-absent-teacher">
                                <SelectValue placeholder="اختر المعلم الغائب" />
                              </SelectTrigger>
                              <SelectContent>
                                {teachers.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>المعلم البديل *</Label>
                            <Select value={substituteTeacherId} onValueChange={setSubstituteTeacherId}>
                              <SelectTrigger data-testid="select-substitute-teacher">
                                <SelectValue placeholder="اختر المعلم البديل" />
                              </SelectTrigger>
                              <SelectContent>
                                {teachers.filter(t => t.id !== absentTeacherId).map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>السبب</Label>
                            <Textarea
                              value={subReason}
                              onChange={e => setSubReason(e.target.value)}
                              placeholder="سبب الغياب..."
                              data-testid="input-sub-reason"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>التاريخ *</Label>
                            <Input
                              type="date"
                              value={subDate}
                              onChange={e => setSubDate(e.target.value)}
                              data-testid="input-sub-date"
                            />
                          </div>
                          <Button
                            onClick={handleCreateSub}
                            disabled={submitting}
                            className="w-full"
                            data-testid="button-confirm-create-sub"
                          >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                            إنشاء الاستبدال
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8" data-testid="status-loading-subs">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
                </div>
              ) : !substitutions.length ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-subs">
                  لا توجد استبدالات طارئة
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-substitutions">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المعلم الغائب</TableHead>
                        <TableHead className="text-right">المعلم البديل</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">عدد الطلاب</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        {canManage && <TableHead className="text-right">إجراءات</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {substitutions.map(s => (
                        <TableRow key={s.id} data-testid={`row-sub-${s.id}`}>
                          <TableCell data-testid={`text-absent-teacher-${s.id}`}>
                            {s.absentTeacherName || getTeacherName(s.absentTeacherId)}
                          </TableCell>
                          <TableCell data-testid={`text-substitute-teacher-${s.id}`}>
                            {s.substituteTeacherName || getTeacherName(s.substituteTeacherId)}
                          </TableCell>
                          <TableCell data-testid={`text-sub-date-${s.id}`}>{formatDateAr(s.date)}</TableCell>
                          <TableCell data-testid={`text-students-count-${s.id}`}>{s.studentsCount ?? "—"}</TableCell>
                          <TableCell>
                            <Badge className={subStatusMap[s.status]?.color || subStatusMap.active.color} data-testid={`badge-sub-status-${s.id}`}>
                              {subStatusMap[s.status]?.label || s.status}
                            </Badge>
                          </TableCell>
                          {canManage && (
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteSub(s.id)}
                                data-testid={`button-delete-sub-${s.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  سجل الحوادث
                </CardTitle>
                {canManage && (
                  <Dialog open={createIncidentOpen} onOpenChange={setCreateIncidentOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-create-incident">
                        <Plus className="w-4 h-4 ml-1" />
                        تسجيل حادثة
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogTitle>تسجيل حادثة جديدة</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>عنوان الحادثة *</Label>
                          <Input
                            value={incidentTitle}
                            onChange={e => setIncidentTitle(e.target.value)}
                            placeholder="عنوان الحادثة"
                            data-testid="input-incident-title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>الوصف</Label>
                          <Textarea
                            value={incidentDescription}
                            onChange={e => setIncidentDescription(e.target.value)}
                            placeholder="وصف تفصيلي للحادثة..."
                            data-testid="input-incident-description"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>مستوى الخطورة</Label>
                          <Select value={incidentSeverity} onValueChange={setIncidentSeverity}>
                            <SelectTrigger data-testid="select-incident-severity">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">منخفض</SelectItem>
                              <SelectItem value="medium">متوسط</SelectItem>
                              <SelectItem value="high">مرتفع</SelectItem>
                              <SelectItem value="critical">حرج</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>الإجراء المتخذ</Label>
                          <Textarea
                            value={incidentActionTaken}
                            onChange={e => setIncidentActionTaken(e.target.value)}
                            placeholder="الإجراء المتخذ..."
                            data-testid="input-incident-action"
                          />
                        </div>
                        <Button
                          onClick={handleCreateIncident}
                          disabled={incidentSubmitting}
                          className="w-full"
                          data-testid="button-confirm-create-incident"
                        >
                          {incidentSubmitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                          تسجيل الحادثة
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {incidentsLoading ? (
                <div className="flex items-center justify-center py-8" data-testid="status-loading-incidents">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
                </div>
              ) : !incidents.length ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-incidents">
                  لا توجد حوادث مسجلة
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-incidents">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">العنوان</TableHead>
                        <TableHead className="text-right">الخطورة</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">المُبلّغ</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        {canManage && <TableHead className="text-right">إجراءات</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map(inc => (
                        <TableRow key={inc.id} data-testid={`row-incident-${inc.id}`}>
                          <TableCell data-testid={`text-incident-title-${inc.id}`}>{inc.title}</TableCell>
                          <TableCell>
                            <Badge className={severityMap[inc.severity]?.color || severityMap.medium.color} data-testid={`badge-severity-${inc.id}`}>
                              {severityMap[inc.severity]?.label || inc.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={incidentStatusMap[inc.status]?.color || incidentStatusMap.open.color} data-testid={`badge-incident-status-${inc.id}`}>
                              {incidentStatusMap[inc.status]?.label || inc.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-reporter-${inc.id}`}>{inc.reporterName || inc.reportedBy || "—"}</TableCell>
                          <TableCell data-testid={`text-incident-date-${inc.id}`}>{formatDateAr(inc.createdAt)}</TableCell>
                          {canManage && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditIncident(inc)}
                                  data-testid={`button-edit-incident-${inc.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleDeleteIncident(inc.id)}
                                  data-testid={`button-delete-incident-${inc.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={editIncidentOpen} onOpenChange={setEditIncidentOpen}>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>تعديل الحادثة</DialogTitle>
              </DialogHeader>
              {editingIncident && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{editingIncident.title}</p>
                    {editingIncident.description && (
                      <p className="text-sm text-muted-foreground mt-1">{editingIncident.description}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select value={editIncidentStatus} onValueChange={setEditIncidentStatus}>
                      <SelectTrigger data-testid="select-edit-incident-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">مفتوح</SelectItem>
                        <SelectItem value="investigating">قيد التحقيق</SelectItem>
                        <SelectItem value="resolved">تم الحل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الإجراء المتخذ</Label>
                    <Textarea
                      value={editIncidentAction}
                      onChange={e => setEditIncidentAction(e.target.value)}
                      placeholder="الإجراء المتخذ..."
                      data-testid="input-edit-incident-action"
                    />
                  </div>
                  <Button
                    onClick={handleUpdateIncident}
                    disabled={incidentSubmitting}
                    className="w-full"
                    data-testid="button-confirm-update-incident"
                  >
                    {incidentSubmitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    تحديث الحادثة
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}