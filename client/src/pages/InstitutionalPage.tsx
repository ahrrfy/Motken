import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";
import {
  Loader2, Plus, ArrowLeftRight, CheckCircle, XCircle, Clock, Building2, Users
} from "lucide-react";

interface Transfer {
  id: string;
  studentId: string;
  studentName?: string;
  fromMosqueId: string;
  fromMosqueName?: string;
  toMosqueId: string;
  toMosqueName?: string;
  reason?: string;
  status: string;
  createdAt?: string;
  studentStats?: {
    totalJuz?: number;
    attendanceRate?: string;
    lastActivity?: string;
  };
}

interface Student {
  id: string;
  name: string;
  mosqueId?: string;
}

interface Mosque {
  id: string;
  name: string;
}

const transferStatusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  approved: { label: "موافق عليه", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

export default function InstitutionalPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [targetMosqueId, setTargetMosqueId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const [previewTransfer, setPreviewTransfer] = useState<Transfer | null>(null);

  const canManage = user?.role === "admin" || user?.role === "supervisor";
  const canCreate = user?.role === "admin" || user?.role === "supervisor" || user?.role === "teacher";

  const fetchTransfers = async () => {
    try {
      const res = await fetch("/api/student-transfers", { credentials: "include" });
      if (res.ok) setTransfers(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل التحويلات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetch("/api/users?role=student", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setStudents(data))
      .catch(() => {});
    fetch("/api/mosques", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setMosques(data))
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setSelectedStudentId("");
    setTargetMosqueId("");
    setTransferReason("");
  };

  const handleCreate = async () => {
    if (!selectedStudentId || !targetMosqueId) {
      toast({ title: "خطأ", description: "الطالب والمسجد المستهدف مطلوبان", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/student-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId: selectedStudentId,
          toMosqueId: targetMosqueId,
          reason: transferReason || null,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء طلب التحويل بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetForm();
        fetchTransfers();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء طلب التحويل", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/student-transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({
          title: "تم بنجاح",
          description: status === "approved" ? "تمت الموافقة على التحويل" : "تم رفض التحويل",
          className: "bg-green-50 border-green-200 text-green-800",
        });
        fetchTransfers();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في تحديث الحالة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || id;
  const getMosqueName = (id: string) => mosques.find(m => m.id === id)?.name || id;

  const pendingCount = transfers.filter(t => t.status === "pending").length;
  const approvedCount = transfers.filter(t => t.status === "approved").length;
  const rejectedCount = transfers.filter(t => t.status === "rejected").length;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-institutional">
            التحويلات المؤسسية
          </h1>
          <p className="text-muted-foreground">إدارة تحويلات الطلاب بين المساجد</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-transfer">
                <Plus className="w-4 h-4 ml-1" />
                طلب تحويل
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>طلب تحويل طالب</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الطالب *</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger data-testid="select-transfer-student">
                      <SelectValue placeholder="اختر الطالب" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المسجد المستهدف *</Label>
                  <Select value={targetMosqueId} onValueChange={setTargetMosqueId}>
                    <SelectTrigger data-testid="select-target-mosque">
                      <SelectValue placeholder="اختر المسجد المستهدف" />
                    </SelectTrigger>
                    <SelectContent>
                      {mosques.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>سبب التحويل</Label>
                  <Textarea
                    value={transferReason}
                    onChange={e => setTransferReason(e.target.value)}
                    placeholder="سبب طلب التحويل..."
                    data-testid="input-transfer-reason"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="w-full"
                  data-testid="button-confirm-create-transfer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  إرسال طلب التحويل
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total-transfers">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي التحويلات</p>
                <p className="text-2xl font-bold" data-testid="text-total-transfers">{transfers.length}</p>
              </div>
              <ArrowLeftRight className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-pending">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قيد الانتظار</p>
                <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-approved">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">موافق عليها</p>
                <p className="text-2xl font-bold" data-testid="text-approved-count">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-rejected">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مرفوضة</p>
                <p className="text-2xl font-bold" data-testid="text-rejected-count">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            طلبات التحويل
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8" data-testid="status-loading-transfers">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
            </div>
          ) : !transfers.length ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-transfers">
              لا توجد طلبات تحويل
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-transfers">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الطالب</TableHead>
                    <TableHead className="text-right">من مسجد</TableHead>
                    <TableHead className="text-right">إلى مسجد</TableHead>
                    <TableHead className="text-right">السبب</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    {canManage && <TableHead className="text-right">إجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map(t => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setPreviewTransfer(t)}
                      data-testid={`row-transfer-${t.id}`}
                    >
                      <TableCell data-testid={`text-transfer-student-${t.id}`}>
                        {t.studentName || getStudentName(t.studentId)}
                      </TableCell>
                      <TableCell data-testid={`text-from-mosque-${t.id}`}>
                        {t.fromMosqueName || getMosqueName(t.fromMosqueId)}
                      </TableCell>
                      <TableCell data-testid={`text-to-mosque-${t.id}`}>
                        {t.toMosqueName || getMosqueName(t.toMosqueId)}
                      </TableCell>
                      <TableCell data-testid={`text-transfer-reason-${t.id}`}>{t.reason || "—"}</TableCell>
                      <TableCell>
                        <Badge className={transferStatusMap[t.status]?.color || transferStatusMap.pending.color} data-testid={`badge-transfer-status-${t.id}`}>
                          {transferStatusMap[t.status]?.label || t.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-transfer-date-${t.id}`}>{formatDateAr(t.createdAt)}</TableCell>
                      {canManage && (
                        <TableCell>
                          {t.status === "pending" && (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-800"
                                onClick={() => handleUpdateStatus(t.id, "approved")}
                                data-testid={`button-approve-transfer-${t.id}`}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleUpdateStatus(t.id, "rejected")}
                                data-testid={`button-reject-transfer-${t.id}`}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
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

      <Dialog open={!!previewTransfer} onOpenChange={(open) => { if (!open) setPreviewTransfer(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب التحويل</DialogTitle>
          </DialogHeader>
          {previewTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">الطالب</p>
                  <p className="font-medium" data-testid="text-preview-student">
                    {previewTransfer.studentName || getStudentName(previewTransfer.studentId)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">الحالة</p>
                  <Badge className={transferStatusMap[previewTransfer.status]?.color} data-testid="badge-preview-status">
                    {transferStatusMap[previewTransfer.status]?.label || previewTransfer.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">من مسجد</p>
                  <p className="font-medium flex items-center gap-1" data-testid="text-preview-from">
                    <Building2 className="w-4 h-4" />
                    {previewTransfer.fromMosqueName || getMosqueName(previewTransfer.fromMosqueId)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">إلى مسجد</p>
                  <p className="font-medium flex items-center gap-1" data-testid="text-preview-to">
                    <Building2 className="w-4 h-4" />
                    {previewTransfer.toMosqueName || getMosqueName(previewTransfer.toMosqueId)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">التاريخ</p>
                  <p className="font-medium" data-testid="text-preview-date">{formatDateAr(previewTransfer.createdAt)}</p>
                </div>
                {previewTransfer.reason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">السبب</p>
                    <p className="font-medium" data-testid="text-preview-reason">{previewTransfer.reason}</p>
                  </div>
                )}
              </div>

              {previewTransfer.studentStats && (
                <div className="border-t pt-4">
                  <p className="font-medium mb-2 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    إحصائيات الطالب الحالية
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {previewTransfer.studentStats.totalJuz !== undefined && (
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <p className="text-muted-foreground text-xs">الأجزاء</p>
                        <p className="font-bold" data-testid="text-preview-juz">{previewTransfer.studentStats.totalJuz}</p>
                      </div>
                    )}
                    {previewTransfer.studentStats.attendanceRate && (
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <p className="text-muted-foreground text-xs">الحضور</p>
                        <p className="font-bold" data-testid="text-preview-attendance">{previewTransfer.studentStats.attendanceRate}</p>
                      </div>
                    )}
                    {previewTransfer.studentStats.lastActivity && (
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <p className="text-muted-foreground text-xs">آخر نشاط</p>
                        <p className="font-bold" data-testid="text-preview-activity">{formatDateAr(previewTransfer.studentStats.lastActivity)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {canManage && previewTransfer.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => { handleUpdateStatus(previewTransfer.id, "approved"); setPreviewTransfer(null); }}
                    data-testid="button-preview-approve"
                  >
                    <CheckCircle className="w-4 h-4 ml-1" />
                    موافقة
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => { handleUpdateStatus(previewTransfer.id, "rejected"); setPreviewTransfer(null); }}
                    data-testid="button-preview-reject"
                  >
                    <XCircle className="w-4 h-4 ml-1" />
                    رفض
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}