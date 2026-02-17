import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Copy, Trash2, MessageCircle, Link, ClipboardCheck, Users } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/phone-utils";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  username: string;
  phone?: string;
  parentPhone?: string | null;
  mosqueId?: string | null;
}

interface ParentReport {
  id: string;
  studentId: string;
  mosqueId?: string | null;
  reportType: string;
  content: string;
  accessToken: string;
  expiresAt?: string | null;
  createdAt: string;
}

interface Assignment {
  id: string;
  studentId: string;
  title: string;
  grade?: number | null;
  maxGrade?: number | null;
  status?: string;
}

interface PointTotal {
  totalPoints: number;
}

export default function ParentPortalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [reports, setReports] = useState<ParentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reportType, setReportType] = useState("weekly");
  const [expiresAt, setExpiresAt] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progressData, setProgressData] = useState<{
    assignments: Assignment[];
    totalPoints: number;
  } | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchReports(selectedStudentId);
      fetchProgress(selectedStudentId);
    } else {
      setReports([]);
      setProgressData(null);
    }
  }, [selectedStudentId]);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/users?role=student", { credentials: "include" });
      if (res.ok) setStudents(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل قائمة الطلاب", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (studentId: string) => {
    setReportsLoading(true);
    try {
      const res = await fetch(`/api/parent-reports?studentId=${studentId}`, { credentials: "include" });
      if (res.ok) setReports(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل التقارير", variant: "destructive" });
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchProgress = async (studentId: string) => {
    setProgressLoading(true);
    try {
      const [assignmentsRes, pointsRes] = await Promise.all([
        fetch(`/api/assignments?studentId=${studentId}`, { credentials: "include" }),
        fetch(`/api/points/total/${studentId}`, { credentials: "include" }),
      ]);
      const assignments = assignmentsRes.ok ? await assignmentsRes.json() : [];
      const pointsData: PointTotal = pointsRes.ok ? await pointsRes.json() : { totalPoints: 0 };
      setProgressData({
        assignments: Array.isArray(assignments) ? assignments : [],
        totalPoints: pointsData.totalPoints || 0,
      });
    } catch {
      setProgressData({ assignments: [], totalPoints: 0 });
    } finally {
      setProgressLoading(false);
    }
  };

  const getSelectedStudent = () => students.find(s => s.id === selectedStudentId);

  const generateReportContent = () => {
    const student = getSelectedStudent();
    if (!student || !progressData) return "";

    const assignments = progressData.assignments;
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === "completed" || a.grade !== null).length;
    const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    const lastFive = assignments
      .filter(a => a.grade !== null)
      .slice(-5)
      .map(a => `${a.title}: ${a.grade}${a.maxGrade ? `/${a.maxGrade}` : ""}`)
      .join("\n");

    let progressDesc = "جيد";
    if (completionRate >= 90) progressDesc = "ممتاز";
    else if (completionRate >= 75) progressDesc = "جيد جداً";
    else if (completionRate >= 60) progressDesc = "جيد";
    else if (completionRate >= 40) progressDesc = "مقبول";
    else progressDesc = "يحتاج تحسين";

    const reportTypeLabel = reportType === "weekly" ? "أسبوعي" : "شهري";

    const lines = [
      `📋 تقرير ${reportTypeLabel} - ${student.name}`,
      ``,
      `📊 إحصائيات الواجبات:`,
      `- إجمالي الواجبات: ${totalAssignments}`,
      `- الواجبات المكتملة: ${completedAssignments}`,
      `- نسبة الإنجاز: ${completionRate}%`,
      ``,
    ];

    if (lastFive) {
      lines.push(`📝 آخر 5 درجات:`);
      lines.push(lastFive);
      lines.push(``);
    }

    lines.push(`⭐ إجمالي النقاط: ${progressData.totalPoints}`);
    lines.push(``);
    lines.push(`📈 التقدم العام: ${progressDesc}`);

    return lines.join("\n");
  };

  const handleGenerateReport = async () => {
    const student = getSelectedStudent();
    if (!student) {
      toast({ title: "خطأ", description: "يرجى اختيار طالب", variant: "destructive" });
      return;
    }

    const content = generateReportContent();
    if (!content) {
      toast({ title: "خطأ", description: "لا توجد بيانات كافية لإنشاء التقرير", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/parent-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId: student.id,
          reportType,
          content,
          expiresAt: expiresAt || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء التقرير بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        setExpiresAt("");
        fetchReports(student.id);
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء التقرير", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    setDeleting(reportId);
    try {
      const res = await fetch(`/api/parent-reports/${reportId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف التقرير", className: "bg-green-50 border-green-200 text-green-800" });
        setReports(prev => prev.filter(r => r.id !== reportId));
      } else {
        toast({ title: "خطأ", description: "فشل في حذف التقرير", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const getReportLink = (token: string) => {
    return `${window.location.origin}/parent-report/${token}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "تم النسخ", description: "تم نسخ الرابط بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
    } catch {
      toast({ title: "خطأ", description: "فشل في نسخ الرابط", variant: "destructive" });
    }
  };

  const shareViaWhatsApp = (report: ParentReport) => {
    const student = students.find(s => s.id === report.studentId);
    const link = getReportLink(report.accessToken);
    const message = `📋 تقرير تقدم الطالب: ${student?.name || ""}
🔗 رابط التقرير: ${link}`;
    const phone = student?.parentPhone || student?.phone || "";
    const url = phone ? getWhatsAppUrl(phone, message) : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const formatDate = (dateStr: string) => {
    return formatDateAr(dateStr);
  };

  const selectedStudent = getSelectedStudent();
  const assignments = progressData?.assignments || [];
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === "completed" || a.grade !== null).length;

  if (!["admin", "teacher", "supervisor"].includes(user?.role || "")) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <h2 className="text-xl font-bold text-muted-foreground">غير مصرح لك بالوصول لهذه الصفحة</h2>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
            بوابة أولياء الأمور
          </h1>
          <p className="text-muted-foreground">إدارة تقارير الطلاب ومشاركة التقدم مع أولياء الأمور</p>
        </div>
      </div>

      <Card dir="rtl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            اختيار الطالب
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6" data-testid="loading-students">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="mr-2 text-muted-foreground">جاري تحميل الطلاب...</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="w-full sm:w-72">
                <Label className="mb-2 block">الطالب</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger data-testid="select-student">
                    <SelectValue placeholder="اختر طالباً..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedStudentId && (
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white gap-2"
                  data-testid="button-generate-report"
                >
                  <FileText className="w-4 h-4" />
                  إنشاء تقرير جديد
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudentId && (
        <Card dir="rtl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">ملخص تقدم الطالب: {selectedStudent?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <div className="flex items-center justify-center py-6" data-testid="loading-progress">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="mr-2 text-muted-foreground">جاري تحميل البيانات...</span>
              </div>
            ) : progressData ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center" data-testid="stat-total-assignments">
                  <p className="text-sm text-muted-foreground">إجمالي الواجبات</p>
                  <p className="text-2xl font-bold text-blue-600">{totalAssignments}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-center" data-testid="stat-completed-assignments">
                  <p className="text-sm text-muted-foreground">الواجبات المكتملة</p>
                  <p className="text-2xl font-bold text-green-600">{completedAssignments}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center" data-testid="stat-total-points">
                  <p className="text-sm text-muted-foreground">إجمالي النقاط</p>
                  <p className="text-2xl font-bold text-amber-600">{progressData.totalPoints}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {selectedStudentId && (
        <Card dir="rtl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Link className="w-5 h-5" />
              التقارير المُنشأة ({reports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="flex items-center justify-center py-6" data-testid="loading-reports">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="mr-2 text-muted-foreground">جاري تحميل التقارير...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-reports">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد تقارير لهذا الطالب</p>
                <p className="text-sm mt-1">أنشئ تقريراً جديداً لمشاركته مع ولي الأمر</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                      <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                      <TableHead className="text-right">الرابط</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map(report => (
                      <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                        <TableCell>
                          <Badge variant={report.reportType === "weekly" ? "default" : "secondary"} data-testid={`badge-type-${report.id}`}>
                            {report.reportType === "weekly" ? "أسبوعي" : "شهري"}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-created-${report.id}`}>
                          {formatDate(report.createdAt)}
                        </TableCell>
                        <TableCell data-testid={`text-expires-${report.id}`}>
                          {report.expiresAt ? (
                            <span className={new Date(report.expiresAt) < new Date() ? "text-red-500" : ""}>
                              {formatDate(report.expiresAt)}
                              {new Date(report.expiresAt) < new Date() && (
                                <Badge variant="destructive" className="mr-2 text-xs">منتهي</Badge>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">بدون انتهاء</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[150px] truncate block" data-testid={`text-link-${report.id}`}>
                            {getReportLink(report.accessToken).slice(0, 40)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(getReportLink(report.accessToken))}
                              className="gap-1"
                              data-testid={`button-copy-${report.id}`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                              نسخ
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => shareViaWhatsApp(report)}
                              className="gap-1 text-green-600 hover:text-green-700"
                              data-testid={`button-whatsapp-${report.id}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              واتساب
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteReport(report.id)}
                              disabled={deleting === report.id}
                              className="gap-1 text-red-500 hover:text-red-600"
                              data-testid={`button-delete-${report.id}`}
                            >
                              {deleting === report.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              حذف
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
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء تقرير جديد - {selectedStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>نوع التقرير</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">أسبوعي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تاريخ الانتهاء (اختياري)</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                data-testid="input-expires-at"
                dir="ltr"
              />
            </div>
            {progressData && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1" data-testid="text-report-preview">
                <p className="font-semibold mb-2">معاينة محتوى التقرير:</p>
                <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans">
                  {generateReportContent()}
                </pre>
              </div>
            )}
            <Button
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full gap-2"
              data-testid="button-submit-report"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ClipboardCheck className="w-4 h-4" />
              )}
              إنشاء التقرير ومشاركته
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
