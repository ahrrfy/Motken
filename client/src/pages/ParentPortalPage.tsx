import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Copy, Trash2, MessageCircle, Link, ClipboardCheck, Users, BookOpen, CheckCircle, Star, Calendar, TrendingUp, Award, Phone, Heart, AlertTriangle, Send } from "lucide-react";
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
  level?: number | null;
  isSpecialNeeds?: boolean;
  isOrphan?: boolean;
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
  surahName: string;
  fromVerse: number;
  toVerse: number;
  type?: string;
  grade?: number | null;
  status?: string;
  createdAt?: string;
}

interface PointTotal {
  totalPoints: number;
  total?: number;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  status: string;
  date: string;
  notes?: string;
}

interface BadgeRecord {
  id: string;
  userId: string;
  badgeType: string;
  badgeName: string;
  description?: string;
  earnedAt: string;
}

interface PointRecord {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  category: string;
  createdAt: string;
}

const LEVEL_NAMES = ["مبتدئ", "متوسط", "متقدم", "متميز", "خبير", "حافظ"];
const LEVEL_COLORS = [
  "bg-gray-100 text-gray-700 border-gray-300",
  "bg-blue-100 text-blue-700 border-blue-300",
  "bg-green-100 text-green-700 border-green-300",
  "bg-purple-100 text-purple-700 border-purple-300",
  "bg-amber-100 text-amber-700 border-amber-300",
  "bg-emerald-100 text-emerald-700 border-emerald-300",
];

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
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [badgesData, setBadgesData] = useState<BadgeRecord[]>([]);
  const [pointsData, setPointsData] = useState<PointRecord[]>([]);

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
      setAttendanceData([]);
      setBadgesData([]);
      setPointsData([]);
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
      const [assignmentsRes, pointsRes, attendanceRes, badgesRes, pointsDetailRes] = await Promise.all([
        fetch(`/api/assignments?studentId=${studentId}`, { credentials: "include" }),
        fetch(`/api/points/total/${studentId}`, { credentials: "include" }),
        fetch(`/api/attendance?studentId=${studentId}`, { credentials: "include" }),
        fetch(`/api/badges?userId=${studentId}`, { credentials: "include" }),
        fetch(`/api/points?userId=${studentId}`, { credentials: "include" }),
      ]);
      const assignments = assignmentsRes.ok ? await assignmentsRes.json() : [];
      const pointsTotalData: PointTotal = pointsRes.ok ? await pointsRes.json() : { totalPoints: 0 };
      const attendanceRecords = attendanceRes.ok ? await attendanceRes.json() : [];
      const badgesRecords = badgesRes.ok ? await badgesRes.json() : [];
      const pointsRecords = pointsDetailRes.ok ? await pointsDetailRes.json() : [];
      setProgressData({
        assignments: Array.isArray(assignments) ? assignments : [],
        totalPoints: pointsTotalData.totalPoints || pointsTotalData.total || 0,
      });
      setAttendanceData(Array.isArray(attendanceRecords) ? attendanceRecords : []);
      setBadgesData(Array.isArray(badgesRecords) ? badgesRecords : []);
      setPointsData(Array.isArray(pointsRecords) ? pointsRecords : []);
    } catch {
      setProgressData({ assignments: [], totalPoints: 0 });
      setAttendanceData([]);
      setBadgesData([]);
      setPointsData([]);
    } finally {
      setProgressLoading(false);
    }
  };

  const getSelectedStudent = () => students.find(s => s.id === selectedStudentId);

  const getAttendanceCounts = () => {
    const present = attendanceData.filter(a => a.status === "present").length;
    const absent = attendanceData.filter(a => a.status === "absent").length;
    const late = attendanceData.filter(a => a.status === "late").length;
    const total = attendanceData.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, total, rate };
  };

  const getLevelName = (level?: number | null) => {
    if (!level || level < 1 || level > 6) return "غير محدد";
    return LEVEL_NAMES[level - 1];
  };

  const getLevelColor = (level?: number | null) => {
    if (!level || level < 1 || level > 6) return "bg-gray-100 text-gray-600 border-gray-300";
    return LEVEL_COLORS[level - 1];
  };

  const getPointsByCategory = () => {
    const categories: Record<string, number> = {};
    pointsData.forEach(p => {
      const cat = p.category || "أخرى";
      categories[cat] = (categories[cat] || 0) + p.amount;
    });
    return categories;
  };

  const getWeeklyTrend = () => {
    const now = new Date();
    const weeks: number[] = [0, 0, 0, 0];
    const assignments = progressData?.assignments || [];
    assignments.forEach(a => {
      if (a.createdAt && (a.status === "done" || a.grade !== null)) {
        const assignDate = new Date(a.createdAt);
        const diffDays = Math.floor((now.getTime() - assignDate.getTime()) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(diffDays / 7);
        if (weekIndex >= 0 && weekIndex < 4) {
          weeks[weekIndex]++;
        }
      }
    });
    return weeks.reverse();
  };

  const generateReportContent = () => {
    const student = getSelectedStudent();
    if (!student || !progressData) return "";

    const assignments = progressData.assignments;
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === "done" || a.grade !== null).length;
    const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    const lastFive = assignments
      .filter(a => a.grade !== null)
      .slice(-5)
      .map(a => `${a.surahName} (${a.fromVerse}-${a.toVerse}): ${a.grade}/100`)
      .join("\n");

    let progressDesc = "جيد";
    if (completionRate >= 90) progressDesc = "ممتاز";
    else if (completionRate >= 75) progressDesc = "جيد جداً";
    else if (completionRate >= 60) progressDesc = "جيد";
    else if (completionRate >= 40) progressDesc = "مقبول";
    else progressDesc = "يحتاج تحسين";

    const reportTypeLabel = reportType === "weekly" ? "أسبوعي" : "شهري";
    const attendanceCounts = getAttendanceCounts();
    const levelName = getLevelName(student.level);
    const categoryPoints = getPointsByCategory();

    const lines = [
      `السلام عليكم ورحمة الله وبركاته`,
      `📋 تقرير ${reportTypeLabel} - ${student.name}`,
      ``,
      `🎓 المستوى: ${levelName}`,
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

    lines.push(`📅 ملخص الحضور:`);
    lines.push(`- حاضر: ${attendanceCounts.present}`);
    lines.push(`- غائب: ${attendanceCounts.absent}`);
    lines.push(`- متأخر: ${attendanceCounts.late}`);
    lines.push(`- نسبة الحضور: ${attendanceCounts.rate}%`);
    lines.push(``);

    lines.push(`⭐ إجمالي النقاط: ${progressData.totalPoints}`);

    if (Object.keys(categoryPoints).length > 0) {
      lines.push(`📊 النقاط حسب الفئة:`);
      Object.entries(categoryPoints).forEach(([cat, amount]) => {
        const catLabel = cat === "assignment" ? "واجبات" : cat === "attendance" ? "حضور" : cat === "behavior" ? "سلوك" : cat === "quran" ? "قرآن" : cat;
        lines.push(`  - ${catLabel}: ${amount}`);
      });
      lines.push(``);
    }

    if (badgesData.length > 0) {
      lines.push(`🏅 الأوسمة المكتسبة (${badgesData.length}):`);
      badgesData.slice(-5).forEach(b => {
        lines.push(`  - ${b.badgeName}`);
      });
      lines.push(``);
    }

    lines.push(`📈 التقدم العام: ${progressDesc}`);
    lines.push(``);
    lines.push(`بارك الله فيكم ونفع بكم 🤲`);

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

  const sendWhatsAppTemplate = (templateKey: string) => {
    const student = getSelectedStudent();
    if (!student) return;
    const phone = student.parentPhone || student.phone || "";
    const attendanceCounts = getAttendanceCounts();

    const templates: Record<string, string> = {
      attendance_reminder: `السلام عليكم ورحمة الله وبركاته\n\nتذكير بحضور الطالب: ${student.name}\n\nنذكركم بأهمية الحضور المنتظم لحلقات التحفيظ.\nنسبة الحضور الحالية: ${attendanceCounts.rate}%\n\nبارك الله فيكم 🤲`,
      achievement: `السلام عليكم ورحمة الله وبركاته\n\n🎉 تهنئة بالإنجاز!\n\nيسعدنا إبلاغكم بتميز الطالب: ${student.name}\n⭐ إجمالي النقاط: ${progressData?.totalPoints || 0}\n🏅 الأوسمة: ${badgesData.length}\n\nنسأل الله له التوفيق والسداد 🤲`,
      absence_alert: `السلام عليكم ورحمة الله وبركاته\n\n⚠️ تنبيه غياب\n\nنود إبلاغكم بغياب الطالب: ${student.name}\nعدد مرات الغياب: ${attendanceCounts.absent}\n\nنرجو التواصل معنا لمعرفة السبب.\nبارك الله فيكم 🤲`,
      weekly_update: `السلام عليكم ورحمة الله وبركاته\n\n📋 تقرير أسبوعي - ${student.name}\n\n📊 الواجبات: ${completedAssignments}/${totalAssignments}\n📅 الحضور: ${attendanceCounts.rate}%\n⭐ النقاط: ${progressData?.totalPoints || 0}\n\nبارك الله فيكم 🤲`,
    };

    const message = templates[templateKey] || "";
    const url = phone ? getWhatsAppUrl(phone, message) : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const formatDate = (dateStr: string) => {
    return formatDateAr(dateStr);
  };

  const selectedStudent = getSelectedStudent();
  const assignments = progressData?.assignments || [];
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === "done" || a.grade !== null).length;
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
  const attendanceCounts = getAttendanceCounts();
  const weeklyTrend = getWeeklyTrend();
  const maxWeekly = Math.max(...weeklyTrend, 1);

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

      {selectedStudentId && selectedStudent && (
        <Card dir="rtl" data-testid="card-student-info">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              بطاقة الطالب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg" data-testid="avatar-student">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg" data-testid="text-student-name">{selectedStudent.name}</h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-student-username">@{selectedStudent.username}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getLevelColor(selectedStudent.level)}`} data-testid="badge-student-level">
                  🎓 {getLevelName(selectedStudent.level)}
                </span>

                {selectedStudent.isSpecialNeeds && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-violet-100 text-violet-700 border border-violet-300" data-testid="badge-special-needs">
                    <Heart className="w-3.5 h-3.5" />
                    احتياجات خاصة
                  </span>
                )}

                {selectedStudent.isOrphan && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-700 border border-rose-300" data-testid="badge-orphan">
                    <Heart className="w-3.5 h-3.5" />
                    يتيم
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mr-auto">
                {selectedStudent.phone && (
                  <span className="flex items-center gap-1" data-testid="text-student-phone">
                    <Phone className="w-4 h-4" />
                    {selectedStudent.phone}
                  </span>
                )}
                {selectedStudent.parentPhone && (
                  <span className="flex items-center gap-1" data-testid="text-parent-phone">
                    <Phone className="w-4 h-4 text-green-600" />
                    ولي الأمر: {selectedStudent.parentPhone}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedStudentId && (
        <Card dir="rtl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ملخص تقدم الطالب: {selectedStudent?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <div className="flex items-center justify-center py-6" data-testid="loading-progress">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="mr-2 text-muted-foreground">جاري تحميل البيانات...</span>
              </div>
            ) : progressData ? (
              <div className="space-y-6">
                <div className="space-y-2" data-testid="progress-bar-section">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">نسبة إنجاز الواجبات</span>
                    <span className="font-bold text-lg" data-testid="text-completion-rate">{completionRate}%</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" data-testid="progress-bar">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${completionRate}%`,
                        background: completionRate >= 75
                          ? "linear-gradient(90deg, #10b981, #059669)"
                          : completionRate >= 50
                            ? "linear-gradient(90deg, #f59e0b, #d97706)"
                            : "linear-gradient(90deg, #ef4444, #dc2626)",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center" data-testid="stat-total-assignments">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-muted-foreground">إجمالي الواجبات</p>
                    <p className="text-2xl font-bold text-blue-600">{totalAssignments}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-center" data-testid="stat-completed-assignments">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm text-muted-foreground">الواجبات المكتملة</p>
                    <p className="text-2xl font-bold text-green-600">{completedAssignments}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center" data-testid="stat-total-points">
                    <Star className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p className="text-sm text-muted-foreground">إجمالي النقاط</p>
                    <p className="text-2xl font-bold text-amber-600">{progressData.totalPoints}</p>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4" data-testid="weekly-trend-chart">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    اتجاه الإنجاز الأسبوعي (آخر 4 أسابيع)
                  </h4>
                  <div className="flex items-end gap-3 h-24">
                    {weeklyTrend.map((count, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-muted-foreground">{count}</span>
                        <div
                          className="w-full rounded-t-md transition-all duration-500"
                          style={{
                            height: `${Math.max((count / maxWeekly) * 80, 4)}px`,
                            background: `linear-gradient(180deg, #6366f1, #818cf8)`,
                          }}
                          data-testid={`trend-bar-${i}`}
                        />
                        <span className="text-xs text-muted-foreground">أسبوع {i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {selectedStudentId && attendanceData.length > 0 && (
        <Card dir="rtl" data-testid="card-attendance-summary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              ملخص الحضور
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200" data-testid="badge-present-count">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xs text-green-600">حاضر</p>
                  <p className="text-lg font-bold text-green-700">{attendanceCounts.present}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200" data-testid="badge-absent-count">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-xs text-red-600">غائب</p>
                  <p className="text-lg font-bold text-red-700">{attendanceCounts.absent}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200" data-testid="badge-late-count">
                <Calendar className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-xs text-amber-600">متأخر</p>
                  <p className="text-lg font-bold text-amber-700">{attendanceCounts.late}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 border mr-auto" data-testid="text-attendance-rate">
                <div>
                  <p className="text-xs text-muted-foreground">نسبة الحضور</p>
                  <p className={`text-2xl font-bold ${attendanceCounts.rate >= 80 ? "text-green-600" : attendanceCounts.rate >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {attendanceCounts.rate}%
                  </p>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${attendanceCounts.rate >= 80 ? "bg-green-500" : attendanceCounts.rate >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                  data-testid="indicator-attendance-rate"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedStudentId && selectedStudent && (
        <Card dir="rtl" data-testid="card-whatsapp-templates">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              رسائل واتساب سريعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-sm">تذكير بالحضور</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-green-600 hover:text-green-700 border-green-300"
                  onClick={() => sendWhatsAppTemplate("attendance_reminder")}
                  data-testid="button-whatsapp-attendance-reminder"
                >
                  <Send className="w-3.5 h-3.5" />
                  إرسال
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-sm">تهنئة بالإنجاز</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-amber-600 hover:text-amber-700 border-amber-300"
                  onClick={() => sendWhatsAppTemplate("achievement")}
                  data-testid="button-whatsapp-achievement"
                >
                  <Send className="w-3.5 h-3.5" />
                  إرسال
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-sm">تنبيه غياب</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-red-600 hover:text-red-700 border-red-300"
                  onClick={() => sendWhatsAppTemplate("absence_alert")}
                  data-testid="button-whatsapp-absence-alert"
                >
                  <Send className="w-3.5 h-3.5" />
                  إرسال
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-sm">تقرير أسبوعي</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-blue-600 hover:text-blue-700 border-blue-300"
                  onClick={() => sendWhatsAppTemplate("weekly_update")}
                  data-testid="button-whatsapp-weekly-update"
                >
                  <Send className="w-3.5 h-3.5" />
                  إرسال
                </Button>
              </div>
            </div>
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
