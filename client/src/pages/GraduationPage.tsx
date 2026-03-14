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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";
import {
  Loader2, Plus, GraduationCap, ArrowRight, Award, Users, Download, BookOpen, ClipboardList, Printer
} from "lucide-react";
import { CERTIFICATE_TEMPLATES, printCertificate, type CertificateData } from "@/lib/certificate-templates";

interface Graduate {
  id: string;
  studentId: string;
  studentName?: string;
  mosqueId?: string;
  mosqueName?: string;
  graduationDate: string;
  totalJuz: number;
  recitationStyle: string;
  ijazahChain?: string;
  ijazahTeacher?: string;
  finalGrade?: string;
  certificateId?: string;
  createdAt?: string;
  followups?: Followup[];
}

interface Followup {
  id: string;
  graduateId: string;
  date: string;
  retentionLevel: string;
  juzReviewedCount?: number;
  notes?: string;
  createdAt?: string;
}

interface Student {
  id: string;
  name: string;
  level?: number;
  memorizedJuz?: number;
  mosqueId?: string;
  mosqueName?: string;
  teacherName?: string;
}

const retentionMap: Record<string, { label: string; color: string }> = {
  excellent: { label: "ممتاز", color: "bg-green-100 text-green-800 border-green-200" },
  good: { label: "جيد", color: "bg-blue-100 text-blue-800 border-blue-200" },
  average: { label: "متوسط", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  weak: { label: "ضعيف", color: "bg-red-100 text-red-800 border-red-200" },
};

const recitationStyles: Record<string, string> = {
  hafs: "حفص",
  warsh: "ورش",
  qaloon: "قالون",
};

const gradeOptions = [
  { value: "excellent", label: "ممتاز" },
  { value: "very_good", label: "جيد جداً" },
  { value: "good", label: "جيد" },
  { value: "acceptable", label: "مقبول" },
];

export default function GraduationPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedGraduate, setSelectedGraduate] = useState<Graduate | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [totalJuz, setTotalJuz] = useState("30");
  const [ijazahChain, setIjazahChain] = useState("");
  const [ijazahTeacher, setIjazahTeacher] = useState("");
  const [recitationStyle, setRecitationStyle] = useState("hafs");
  const [finalGrade, setFinalGrade] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("classic-gold");

  const [followupDialogOpen, setFollowupDialogOpen] = useState(false);
  const [followupDate, setFollowupDate] = useState("");
  const [followupRetention, setFollowupRetention] = useState("good");
  const [followupJuzCount, setFollowupJuzCount] = useState("");
  const [followupNotes, setFollowupNotes] = useState("");
  const [followupSubmitting, setFollowupSubmitting] = useState(false);

  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printTemplateId, setPrintTemplateId] = useState("classic-gold");

  const canManage = user?.role === "admin" || user?.role === "supervisor" || user?.role === "teacher";

  const fetchGraduates = async () => {
    try {
      const res = await fetch("/api/graduates", { credentials: "include" });
      if (res.ok) setGraduates(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الخريجين", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraduates();
    fetch("/api/users?role=student", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setStudents(data))
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setStudentId("");
    setGraduationDate("");
    setTotalJuz("30");
    setIjazahChain("");
    setIjazahTeacher("");
    setRecitationStyle("hafs");
    setFinalGrade("");
    setSelectedTemplateId("classic-gold");
  };

  const handleStudentChange = (id: string) => {
    setStudentId(id);
    const student = students.find(s => s.id === id);
    if (student) {
      if (student.memorizedJuz) setTotalJuz(String(student.memorizedJuz));
      if (!graduationDate) setGraduationDate(new Date().toISOString().split("T")[0]);
    }
  };

  const handleCreate = async () => {
    if (!studentId || !graduationDate) {
      toast({ title: "خطأ", description: "الطالب وتاريخ التخرج مطلوبان", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/graduates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId,
          graduationDate,
          totalJuz: parseInt(totalJuz) || 30,
          recitationStyle,
          ijazahChain: ijazahChain || null,
          ijazahTeacher: ijazahTeacher || null,
          finalGrade: finalGrade || null,
          templateId: selectedTemplateId,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم تسجيل الخريج وإصدار الشهادة تلقائياً", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetForm();
        fetchGraduates();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في تسجيل الخريج", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (grad: Graduate) => {
    setDetailLoading(true);
    setSelectedGraduate(grad);
    try {
      const res = await fetch(`/api/graduates/${grad.id}/followups`, { credentials: "include" });
      if (res.ok) {
        const followups = await res.json();
        setSelectedGraduate({ ...grad, followups });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل المتابعات", variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const resetFollowupForm = () => {
    setFollowupDate("");
    setFollowupRetention("good");
    setFollowupJuzCount("");
    setFollowupNotes("");
  };

  const handleAddFollowup = async () => {
    if (!selectedGraduate || !followupDate) {
      toast({ title: "خطأ", description: "التاريخ مطلوب", variant: "destructive" });
      return;
    }
    setFollowupSubmitting(true);
    try {
      const res = await fetch(`/api/graduates/${selectedGraduate.id}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          followupDate: followupDate,
          retentionLevel: followupRetention,
          juzReviewed: followupJuzCount ? parseInt(followupJuzCount) : null,
          notes: followupNotes || null,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إضافة المتابعة", className: "bg-green-50 border-green-200 text-green-800" });
        setFollowupDialogOpen(false);
        resetFollowupForm();
        openDetail(selectedGraduate);
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة المتابعة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setFollowupSubmitting(false);
    }
  };

  const handlePrintGraduateCert = (grad: Graduate, templateId: string) => {
    const certData: CertificateData = {
      certificateNumber: grad.certificateId || `MTQ-GRAD-${grad.id.slice(0, 8)}`,
      studentName: grad.studentName || getStudentName(grad.studentId),
      title: "شهادة إتمام حفظ القرآن الكريم",
      mosqueName: grad.mosqueName || "",
      grade: grad.finalGrade,
      issuedAt: grad.graduationDate,
      certificateType: "graduation",
      totalJuz: grad.totalJuz,
      recitationStyle: grad.recitationStyle,
      ijazahTeacher: grad.ijazahTeacher,
    };
    printCertificate(certData, templateId);
  };

  const handleExport = () => {
    const csvRows = [
      ["الاسم", "تاريخ التخرج", "الأجزاء", "الرواية", "الإجازة", "التقدير"].join(","),
      ...graduates.map(g => [
        g.studentName || getStudentName(g.studentId),
        new Date(g.graduationDate).toLocaleDateString("ar-SA"),
        g.totalJuz,
        recitationStyles[g.recitationStyle] || g.recitationStyle,
        g.ijazahChain ? "نعم" : "لا",
        g.finalGrade || "",
      ].join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graduates.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تصدير", description: "تم تصدير بيانات الخريجين", className: "bg-green-50 border-green-200 text-green-800" });
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || id;

  const currentYear = new Date().getFullYear();
  const thisYearGrads = graduates.filter(g => new Date(g.graduationDate).getFullYear() === currentYear);
  const withIjazah = graduates.filter(g => g.ijazahChain);
  const pendingFollowups = graduates.filter(g => !g.followups?.length);

  if (selectedGraduate) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedGraduate(null); fetchGraduates(); }}
              data-testid="button-back-to-graduates"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              العودة
            </Button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-graduate-detail-title">
              تفاصيل الخريج
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setPrintTemplateId("classic-gold"); setPrintDialogOpen(true); }}
            data-testid="button-print-certificate"
          >
            <Printer className="w-4 h-4 ml-1" />
            طباعة الشهادة
          </Button>
        </div>

        <Card className="border-t-4 border-t-primary shadow-md" data-testid="card-graduate-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              {selectedGraduate.studentName || getStudentName(selectedGraduate.studentId)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">تاريخ التخرج: </span>
                <span data-testid="text-grad-date">{formatDateAr(selectedGraduate.graduationDate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">عدد الأجزاء: </span>
                <span data-testid="text-total-juz">{selectedGraduate.totalJuz}</span>
              </div>
              <div>
                <span className="text-muted-foreground">رواية القراءة: </span>
                <span data-testid="text-recitation">{recitationStyles[selectedGraduate.recitationStyle] || selectedGraduate.recitationStyle}</span>
              </div>
              {selectedGraduate.ijazahChain && (
                <div>
                  <span className="text-muted-foreground">سند الإجازة: </span>
                  <span data-testid="text-ijazah-chain">{selectedGraduate.ijazahChain}</span>
                </div>
              )}
              {selectedGraduate.ijazahTeacher && (
                <div>
                  <span className="text-muted-foreground">معلم الإجازة: </span>
                  <span data-testid="text-ijazah-teacher">{selectedGraduate.ijazahTeacher}</span>
                </div>
              )}
              {selectedGraduate.finalGrade && (
                <div>
                  <span className="text-muted-foreground">التقدير النهائي: </span>
                  <Badge variant="secondary" data-testid="text-final-grade">
                    {gradeOptions.find(g => g.value === selectedGraduate.finalGrade)?.label || selectedGraduate.finalGrade}
                  </Badge>
                </div>
              )}
              {selectedGraduate.certificateId && (
                <div>
                  <span className="text-muted-foreground">الشهادة: </span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <Award className="w-3 h-3 ml-1" />
                    صادرة
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                سجل المتابعات
              </CardTitle>
              {canManage && (
                <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-followup">
                      <Plus className="w-4 h-4 ml-1" />
                      إضافة متابعة
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl">
                    <DialogHeader>
                      <DialogTitle>إضافة متابعة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>التاريخ *</Label>
                        <Input
                          type="date"
                          value={followupDate}
                          onChange={e => setFollowupDate(e.target.value)}
                          data-testid="input-followup-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>مستوى الحفظ</Label>
                        <Select value={followupRetention} onValueChange={setFollowupRetention}>
                          <SelectTrigger data-testid="select-followup-retention">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">ممتاز</SelectItem>
                            <SelectItem value="good">جيد</SelectItem>
                            <SelectItem value="average">متوسط</SelectItem>
                            <SelectItem value="weak">ضعيف</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>عدد الأجزاء المراجعة</Label>
                        <Input
                          type="number"
                          value={followupJuzCount}
                          onChange={e => setFollowupJuzCount(e.target.value)}
                          placeholder="عدد الأجزاء"
                          data-testid="input-followup-juz-count"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ملاحظات</Label>
                        <Textarea
                          value={followupNotes}
                          onChange={e => setFollowupNotes(e.target.value)}
                          placeholder="ملاحظات..."
                          data-testid="input-followup-notes"
                        />
                      </div>
                      <Button
                        onClick={handleAddFollowup}
                        disabled={followupSubmitting}
                        className="w-full"
                        data-testid="button-confirm-add-followup"
                      >
                        {followupSubmitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                        إضافة المتابعة
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex items-center justify-center py-8" data-testid="status-loading-followups">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
              </div>
            ) : !selectedGraduate.followups?.length ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-followups">
                لا توجد متابعات بعد
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="table-followups">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">مستوى الحفظ</TableHead>
                      <TableHead className="text-right">الأجزاء المراجعة</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedGraduate.followups.map(f => (
                      <TableRow key={f.id} data-testid={`row-followup-${f.id}`}>
                        <TableCell data-testid={`text-followup-date-${f.id}`}>{formatDateAr(f.date)}</TableCell>
                        <TableCell>
                          <Badge className={retentionMap[f.retentionLevel]?.color || retentionMap.good.color} data-testid={`badge-retention-${f.id}`}>
                            {retentionMap[f.retentionLevel]?.label || f.retentionLevel}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-juz-reviewed-${f.id}`}>{f.juzReviewedCount ?? "—"}</TableCell>
                        <TableCell data-testid={`text-followup-notes-${f.id}`}>{f.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                طباعة شهادة التخرج
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <strong>{selectedGraduate.studentName || getStudentName(selectedGraduate.studentId)}</strong>
                <span className="text-muted-foreground"> — حفظ {selectedGraduate.totalJuz} جزءاً</span>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">اختر قالب الشهادة</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CERTIFICATE_TEMPLATES.map(tmpl => (
                    <div
                      key={tmpl.id}
                      className={`p-2.5 border rounded-lg cursor-pointer transition-all text-sm ${printTemplateId === tmpl.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-gray-200 hover:border-primary/50"}`}
                      onClick={() => setPrintTemplateId(tmpl.id)}
                      data-testid={`print-template-${tmpl.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tmpl.preview}</span>
                        <div>
                          <div className="font-medium">{tmpl.name}</div>
                          <div className="text-xs text-muted-foreground">{tmpl.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  handlePrintGraduateCert(selectedGraduate, printTemplateId);
                  setPrintDialogOpen(false);
                }}
                data-testid="button-confirm-print-cert"
              >
                <Printer className="w-4 h-4 ml-2" />
                طباعة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-graduation">
            الخريجون
          </h1>
          <p className="text-muted-foreground">إدارة الخريجين والمتابعة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-graduates">
            <Download className="w-4 h-4 ml-1" />
            تصدير
          </Button>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-graduate">
                  <Plus className="w-4 h-4 ml-1" />
                  تسجيل خريج
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle>تسجيل خريج جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>الطالب *</Label>
                    <Select value={studentId} onValueChange={handleStudentChange}>
                      <SelectTrigger data-testid="select-graduate-student">
                        <SelectValue placeholder="اختر الطالب" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {studentId && (() => {
                    const s = students.find(st => st.id === studentId);
                    if (!s) return null;
                    return (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1" data-testid="student-auto-info">
                        <div className="font-medium text-blue-800">معلومات الطالب</div>
                        {s.level && <div className="text-blue-700">المستوى: <strong>المستوى {s.level <= 6 ? ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"][s.level - 1] : "حافظ"}</strong></div>}
                        {s.mosqueName && <div className="text-blue-700">المسجد: <strong>{s.mosqueName}</strong></div>}
                        {s.teacherName && <div className="text-blue-700">المعلم: <strong>{s.teacherName}</strong></div>}
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    <Label>تاريخ التخرج *</Label>
                    <Input
                      type="date"
                      value={graduationDate}
                      onChange={e => setGraduationDate(e.target.value)}
                      data-testid="input-graduation-date"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>عدد الأجزاء</Label>
                      <Input
                        type="number"
                        value={totalJuz}
                        onChange={e => setTotalJuz(e.target.value)}
                        data-testid="input-total-juz"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رواية القراءة</Label>
                      <Select value={recitationStyle} onValueChange={setRecitationStyle}>
                        <SelectTrigger data-testid="select-recitation-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hafs">حفص</SelectItem>
                          <SelectItem value="warsh">ورش</SelectItem>
                          <SelectItem value="qaloon">قالون</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>التقدير النهائي</Label>
                    <Select value={finalGrade} onValueChange={setFinalGrade}>
                      <SelectTrigger data-testid="select-final-grade">
                        <SelectValue placeholder="اختر التقدير" />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map(g => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>سند الإجازة</Label>
                      <Input
                        value={ijazahChain}
                        onChange={e => setIjazahChain(e.target.value)}
                        placeholder="سند الإجازة"
                        data-testid="input-ijazah-chain"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>معلم الإجازة</Label>
                      <Input
                        value={ijazahTeacher}
                        onChange={e => setIjazahTeacher(e.target.value)}
                        placeholder="اسم معلم الإجازة"
                        data-testid="input-ijazah-teacher"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">قالب الشهادة</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger data-testid="select-template">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CERTIFICATE_TEMPLATES.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.preview} {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {CERTIFICATE_TEMPLATES.find(t => t.id === selectedTemplateId)?.description}
                    </p>
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={submitting}
                    className="w-full"
                    data-testid="button-confirm-create-graduate"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    تسجيل الخريج وإصدار الشهادة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total-graduates">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الخريجين</p>
                <p className="text-2xl font-bold" data-testid="text-total-graduates">{graduates.length}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-this-year">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">خريجو هذا العام</p>
                <p className="text-2xl font-bold" data-testid="text-this-year-grads">{thisYearGrads.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-with-ijazah">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">حاصلون على إجازة</p>
                <p className="text-2xl font-bold" data-testid="text-with-ijazah">{withIjazah.length}</p>
              </div>
              <Award className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-pending-followups">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">بدون متابعة</p>
                <p className="text-2xl font-bold" data-testid="text-pending-followups">{pendingFollowups.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            قائمة الخريجين
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8" data-testid="status-loading-graduates">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
            </div>
          ) : !graduates.length ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-graduates">
              لا يوجد خريجون بعد
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-graduates">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الخريج</TableHead>
                    <TableHead className="text-right">تاريخ التخرج</TableHead>
                    <TableHead className="text-right">الأجزاء</TableHead>
                    <TableHead className="text-right">الرواية</TableHead>
                    <TableHead className="text-right">الإجازة</TableHead>
                    <TableHead className="text-right">التقدير</TableHead>
                    <TableHead className="text-right">الشهادة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {graduates.map(g => (
                    <TableRow
                      key={g.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(g)}
                      data-testid={`row-graduate-${g.id}`}
                    >
                      <TableCell data-testid={`text-graduate-name-${g.id}`}>
                        {g.studentName || getStudentName(g.studentId)}
                      </TableCell>
                      <TableCell data-testid={`text-graduation-date-${g.id}`}>{formatDateAr(g.graduationDate)}</TableCell>
                      <TableCell data-testid={`text-juz-${g.id}`}>{g.totalJuz}</TableCell>
                      <TableCell data-testid={`text-style-${g.id}`}>
                        {recitationStyles[g.recitationStyle] || g.recitationStyle}
                      </TableCell>
                      <TableCell data-testid={`text-ijazah-${g.id}`}>
                        {g.ijazahChain ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">حاصل على إجازة</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-grade-${g.id}`}>
                        {g.finalGrade ? (
                          <Badge variant="secondary">{gradeOptions.find(go => go.value === g.finalGrade)?.label || g.finalGrade}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {g.certificateId ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            <Award className="w-3 h-3 ml-1" />
                            صادرة
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
