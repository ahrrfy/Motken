import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn, formatDateAr } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  CalendarIcon, Clock, CheckCircle2, User, BookOpen, Loader2,
  Plus, Calendar as CalendarLucide, Users, FileText, Trash2, Search, X
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  username?: string;
}

interface Assignment {
  id: string;
  studentId: string;
  surahName: string;
  fromVerse: number;
  toVerse: number;
  scheduledDate: string;
  status: string;
  type: string;
  seenByStudent: boolean;
  seenAt: string | null;
}

interface QuranSurah {
  number: number;
  name: string;
  versesCount: number;
}

interface ExamStudent {
  id: string;
  examId: string;
  studentId: string;
  grade: number | null;
  status: string;
}

interface Exam {
  id: string;
  teacherId: string;
  title: string;
  surahName: string;
  fromVerse: number;
  toVerse: number;
  examDate: string;
  examTime: string;
  description: string | null;
  isForAll: boolean;
  students?: ExamStudent[];
}

export default function AssignmentsExamsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [assignDate, setAssignDate] = useState<Date>();
  const [assignSelectedStudent, setAssignSelectedStudent] = useState("");
  const [assignSelectedSurah, setAssignSelectedSurah] = useState("");
  const [assignFromVerse, setAssignFromVerse] = useState("");
  const [assignToVerse, setAssignToVerse] = useState("");
  const [assignTime, setAssignTime] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const assignCurrentSurah = surahs.find(s => String(s.number) === assignSelectedSurah);

  const [exams, setExams] = useState<Exam[]>([]);
  const [examLoading, setExamLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [expandedExamData, setExpandedExamData] = useState<Exam | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [gradingStudent, setGradingStudent] = useState<string | null>(null);
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  const [deletingExam, setDeletingExam] = useState<string | null>(null);

  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [verseText, setVerseText] = useState<Record<string, any[]>>({});
  const [loadingVerses, setLoadingVerses] = useState<string | null>(null);

  const [assignSearchTerm, setAssignSearchTerm] = useState("");
  const [assignFilterStatus, setAssignFilterStatus] = useState("all");
  const [assignFilterSurah, setAssignFilterSurah] = useState("all");
  const [assignFilterDateFrom, setAssignFilterDateFrom] = useState("");
  const [assignFilterDateTo, setAssignFilterDateTo] = useState("");

  const [examTitle, setExamTitle] = useState("");
  const [examSelectedSurah, setExamSelectedSurah] = useState("");
  const [examFromVerse, setExamFromVerse] = useState("");
  const [examToVerse, setExamToVerse] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [isForAll, setIsForAll] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isSupervisor = user?.role === "supervisor";

  const examCurrentSurah = surahs.find(s => s.number.toString() === examSelectedSurah);

  const fetchExams = async () => {
    try {
      const res = await fetch("/api/exams", { credentials: "include" });
      if (res.ok) setExams(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الامتحانات", variant: "destructive" });
    } finally {
      setExamLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/users?role=student", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setStudents(data))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));

    fetch("/api/assignments", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAssignments(data))
      .catch(() => {})
      .finally(() => setLoadingAssignments(false));

    fetch("/api/quran-surahs", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setSurahs(data))
      .catch(() => {});

    fetchExams();
  }, []);

  useEffect(() => {
    if (user?.role === "student" && assignments.length > 0) {
      assignments.filter(a => !a.seenByStudent).forEach(async (a) => {
        await fetch(`/api/assignments/${a.id}/seen`, {
          method: "PATCH",
          credentials: "include",
        });
      });
    }
  }, [assignments, user]);

  const handleAssignSurahChange = (val: string) => {
    setAssignSelectedSurah(val);
    setAssignFromVerse("");
    setAssignToVerse("");
  };

  const handleAssignFromVerseChange = (val: string) => {
    const num = parseInt(val);
    if (!assignCurrentSurah) { setAssignFromVerse(val); return; }
    if (num > assignCurrentSurah.versesCount) { setAssignFromVerse(String(assignCurrentSurah.versesCount)); return; }
    if (num < 1 && val !== "") { setAssignFromVerse("1"); return; }
    setAssignFromVerse(val);
  };

  const handleAssignToVerseChange = (val: string) => {
    const num = parseInt(val);
    if (!assignCurrentSurah) { setAssignToVerse(val); return; }
    if (num > assignCurrentSurah.versesCount) { setAssignToVerse(String(assignCurrentSurah.versesCount)); return; }
    const from = parseInt(assignFromVerse) || 1;
    if (num < from && val !== "") { setAssignToVerse(String(from)); return; }
    setAssignToVerse(val);
  };

  const handleAssign = async () => {
    if (!assignSelectedStudent || !assignDate || !assignTime || !assignSelectedSurah) {
      toast({ title: "خطأ في البيانات", description: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const surah = surahs.find(s => String(s.number) === assignSelectedSurah);
    const scheduledDate = new Date(assignDate);
    const [hours, minutes] = assignTime.split(":");
    scheduledDate.setHours(parseInt(hours), parseInt(minutes));

    setAssignSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId: assignSelectedStudent,
          teacherId: user?.id,
          mosqueId: user?.mosqueId || null,
          surahName: surah?.name || "",
          fromVerse: parseInt(assignFromVerse) || 1,
          toVerse: parseInt(assignToVerse) || 10,
          type: "new",
          scheduledDate: scheduledDate.toISOString(),
          status: "pending",
        }),
      });

      if (res.ok) {
        const newAssignment = await res.json();
        setAssignments(prev => [newAssignment, ...prev]);
        toast({
          title: "تم تحديد الواجب بنجاح",
          description: `تم إرسال إشعار للطالب ${students.find(s => s.id === assignSelectedStudent)?.name} بموعد التسميع`,
          className: "bg-green-50 border-green-200 text-green-800"
        });
        setAssignSelectedStudent("");
        setAssignSelectedSurah("");
        setAssignFromVerse("");
        setAssignToVerse("");
        setAssignTime("");
        setAssignDate(undefined);
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الواجب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setAssignSubmitting(false);
    }
  };

  const getAssignStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || "—";
  };

  const resetExamForm = () => {
    setExamTitle("");
    setExamSelectedSurah("");
    setExamFromVerse("");
    setExamToVerse("");
    setExamDate("");
    setExamTime("");
    setExamDescription("");
    setIsForAll(true);
    setSelectedStudentIds([]);
  };

  const handleCreateExam = async () => {
    if (!examTitle || !examSelectedSurah || !examFromVerse || !examToVerse || !examDate) {
      toast({ title: "خطأ", description: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const surah = surahs.find(s => s.number.toString() === examSelectedSurah);
    if (!surah) return;

    const fv = parseInt(examFromVerse);
    const tv = parseInt(examToVerse);

    if (fv < 1 || fv > surah.versesCount) {
      toast({ title: "خطأ", description: `رقم آية البداية يجب أن يكون بين 1 و ${surah.versesCount}`, variant: "destructive" });
      return;
    }
    if (tv < fv || tv > surah.versesCount) {
      toast({ title: "خطأ", description: `رقم آية النهاية يجب أن يكون بين ${fv} و ${surah.versesCount}`, variant: "destructive" });
      return;
    }

    if (!isForAll && selectedStudentIds.length === 0) {
      toast({ title: "خطأ", description: "يرجى اختيار طالب واحد على الأقل", variant: "destructive" });
      return;
    }

    setExamSubmitting(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: examTitle,
          surahName: surah.name,
          fromVerse: fv,
          toVerse: tv,
          examDate,
          examTime: examTime || null,
          description: examDescription || null,
          isForAll,
          studentIds: isForAll ? [] : selectedStudentIds,
        }),
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء الامتحان بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetExamForm();
        fetchExams();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الامتحان", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setExamSubmitting(false);
    }
  };

  const toggleExpand = async (examId: string) => {
    if (expandedExamId === examId) {
      setExpandedExamId(null);
      setExpandedExamData(null);
      return;
    }

    setExpandedExamId(examId);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/exams/${examId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setExpandedExamData(data);
        const grades: Record<string, string> = {};
        data.students?.forEach((s: ExamStudent) => {
          if (s.grade !== null) grades[s.studentId] = s.grade.toString();
        });
        setGradeValues(grades);
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل تفاصيل الامتحان", variant: "destructive" });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGrade = async (examId: string, studentId: string) => {
    const grade = parseInt(gradeValues[studentId] || "0");
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast({ title: "خطأ", description: "الدرجة يجب أن تكون بين 0 و 100", variant: "destructive" });
      return;
    }

    setGradingStudent(studentId);
    try {
      const res = await fetch(`/api/exams/${examId}/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ grade, status: "done" }),
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حفظ الدرجة", className: "bg-green-50 border-green-200 text-green-800" });
        toggleExpand(examId);
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في حفظ الدرجة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setGradingStudent(null);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    setDeletingExam(examId);
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف الامتحان", className: "bg-green-50 border-green-200 text-green-800" });
        setExams(prev => prev.filter(e => e.id !== examId));
        if (expandedExamId === examId) {
          setExpandedExamId(null);
          setExpandedExamData(null);
        }
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الامتحان", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setDeletingExam(null);
    }
  };

  const fetchQuranVerses = async (assignmentId: string, surahName: string, fromVerse: number, toVerse: number) => {
    if (verseText[assignmentId]) {
      setExpandedAssignmentId(expandedAssignmentId === assignmentId ? null : assignmentId);
      return;
    }

    const surah = surahs.find(s => s.name === surahName);
    if (!surah) return;

    setLoadingVerses(assignmentId);
    setExpandedAssignmentId(assignmentId);

    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
      const data = await res.json();
      if (data.code === 200 && data.data?.ayahs) {
        const verses = data.data.ayahs
          .filter((a: any) => a.numberInSurah >= fromVerse && a.numberInSurah <= toVerse)
          .map((a: any) => ({ number: a.numberInSurah, text: a.text }));
        setVerseText(prev => ({ ...prev, [assignmentId]: verses }));
      }
    } catch {
    } finally {
      setLoadingVerses(null);
    }
  };

  useEffect(() => {
    if (isStudent) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => { document.head.removeChild(link); };
    }
  }, [isStudent]);

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const getExamStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || studentId;
  };

  const assignHasActiveFilters = assignSearchTerm || assignFilterStatus !== "all" || assignFilterSurah !== "all" || assignFilterDateFrom || assignFilterDateTo;

  const clearAssignFilters = () => {
    setAssignSearchTerm("");
    setAssignFilterStatus("all");
    setAssignFilterSurah("all");
    setAssignFilterDateFrom("");
    setAssignFilterDateTo("");
  };

  const filteredAssignments = assignments.filter(a => {
    if (assignSearchTerm) {
      const studentName = getAssignStudentName(a.studentId);
      if (!studentName.includes(assignSearchTerm) && !a.surahName.includes(assignSearchTerm)) return false;
    }
    if (assignFilterStatus !== "all" && a.status !== assignFilterStatus) return false;
    if (assignFilterSurah !== "all" && a.surahName !== assignFilterSurah) return false;
    if (assignFilterDateFrom && a.scheduledDate) {
      if (new Date(a.scheduledDate) < new Date(assignFilterDateFrom)) return false;
    }
    if (assignFilterDateTo && a.scheduledDate) {
      const toDate = new Date(assignFilterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(a.scheduledDate) > toDate) return false;
    }
    return true;
  });

  const uniqueSurahNames = [...new Set(assignments.map(a => a.surahName))];

  const formatDate = (dateStr: string) => formatDateAr(dateStr);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
          الواجبات والامتحانات
        </h1>
        <p className="text-muted-foreground">إدارة واجبات الطلاب والامتحانات في مكان واحد</p>
      </div>

      <Tabs defaultValue="assignments" dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments" className="gap-2" data-testid="tab-assignments">
            📝 الواجبات
          </TabsTrigger>
          <TabsTrigger value="exams" className="gap-2" data-testid="tab-exams">
            📋 الامتحانات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-6">
          <div className={`grid grid-cols-1 ${isTeacher ? 'lg:grid-cols-2' : ''} gap-8`}>
            {isTeacher && (<Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  تحديد واجب جديد
                </CardTitle>
                <CardDescription>اختر الطالب وحدد الآيات والموعد</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>الطالب</Label>
                  {loadingStudents ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="status-loading-students">
                      <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
                    </div>
                  ) : (
                    <Select value={assignSelectedStudent} onValueChange={setAssignSelectedStudent}>
                      <SelectTrigger className="bg-white" data-testid="select-student">
                        <SelectValue placeholder="اختر الطالب" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id} data-testid={`option-student-${s.id}`}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>السورة</Label>
                    <Select value={assignSelectedSurah} onValueChange={handleAssignSurahChange}>
                      <SelectTrigger className="bg-white" data-testid="select-surah">
                        <SelectValue placeholder="اختر السورة" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {surahs.map((s) => (
                          <SelectItem key={s.number} value={String(s.number)}>
                            {s.number}. {s.name} ({s.versesCount} آية)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>من الآية {assignCurrentSurah && <span className="text-xs text-muted-foreground">(1 - {assignCurrentSurah.versesCount})</span>}</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      min={1}
                      max={assignCurrentSurah?.versesCount}
                      value={assignFromVerse}
                      onChange={e => handleAssignFromVerseChange(e.target.value)}
                      data-testid="input-from-verse"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>إلى الآية {assignCurrentSurah && <span className="text-xs text-muted-foreground">(حتى {assignCurrentSurah.versesCount})</span>}</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      min={parseInt(assignFromVerse) || 1}
                      max={assignCurrentSurah?.versesCount}
                      value={assignToVerse}
                      onChange={e => handleAssignToVerseChange(e.target.value)}
                      data-testid="input-to-verse"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 flex flex-col">
                    <Label className="mb-2">تاريخ التسميع</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-right font-normal",
                            !assignDate && "text-muted-foreground"
                          )}
                          data-testid="button-select-date"
                        >
                          {assignDate ? format(assignDate, "PPP", { locale: ar }) : <span>اختر التاريخ</span>}
                          <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={assignDate}
                          onSelect={setAssignDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>وقت التسميع</Label>
                    <div className="relative">
                      <Input
                        type="time"
                        value={assignTime}
                        onChange={(e) => setAssignTime(e.target.value)}
                        className="w-full"
                        data-testid="input-time"
                      />
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                <Button onClick={handleAssign} disabled={assignSubmitting} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 mt-4" data-testid="button-submit-assignment">
                  {assignSubmitting ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 ml-2" />}
                  تأكيد وإرسال للطالب
                </Button>
              </CardContent>
            </Card>)}

            <div className="space-y-6">
              <Card className="bg-muted/30 border-none" dir="rtl">
                <CardHeader>
                  <CardTitle className="text-lg">الواجبات ({filteredAssignments.length})</CardTitle>
                  <div className="flex flex-wrap items-end gap-3 mt-3">
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث بالاسم أو السورة..."
                        className="pr-8"
                        value={assignSearchTerm}
                        onChange={(e) => setAssignSearchTerm(e.target.value)}
                        data-testid="input-search-assignments"
                      />
                    </div>
                    <div className="w-full sm:w-36">
                      <Select value={assignFilterStatus} onValueChange={setAssignFilterStatus}>
                        <SelectTrigger data-testid="select-filter-assign-status">
                          <SelectValue placeholder="الحالة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الحالة - الكل</SelectItem>
                          <SelectItem value="pending">انتظار</SelectItem>
                          <SelectItem value="done">تم التسميع</SelectItem>
                          <SelectItem value="cancelled">ملغي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-40">
                      <Select value={assignFilterSurah} onValueChange={setAssignFilterSurah}>
                        <SelectTrigger data-testid="select-filter-assign-surah">
                          <SelectValue placeholder="السورة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">السورة - الكل</SelectItem>
                          {uniqueSurahNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-36">
                      <Label className="text-xs text-muted-foreground mb-1 block">من تاريخ</Label>
                      <Input
                        type="date"
                        value={assignFilterDateFrom}
                        onChange={(e) => setAssignFilterDateFrom(e.target.value)}
                        data-testid="input-filter-assign-date-from"
                      />
                    </div>
                    <div className="w-full sm:w-36">
                      <Label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</Label>
                      <Input
                        type="date"
                        value={assignFilterDateTo}
                        onChange={(e) => setAssignFilterDateTo(e.target.value)}
                        data-testid="input-filter-assign-date-to"
                      />
                    </div>
                    {assignHasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearAssignFilters} className="gap-1 text-destructive hover:text-destructive" data-testid="button-clear-assign-filters">
                        <X className="w-4 h-4" />
                        مسح الفلاتر
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingAssignments ? (
                    <div className="flex items-center justify-center py-8" data-testid="status-loading-assignments">
                      <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
                      <span>جاري التحميل...</span>
                    </div>
                  ) : filteredAssignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="status-empty-assignments">
                      لا توجد واجبات
                    </div>
                  ) : (
                    (isStudent ? filteredAssignments : filteredAssignments).map((task) => (
                      <div key={task.id} className={`p-4 bg-white rounded-lg shadow-sm border border-slate-100 ${isStudent ? 'cursor-pointer hover:border-primary/30 transition-colors' : ''}`} data-testid={`card-assignment-${task.id}`} onClick={() => isStudent && fetchQuranVerses(task.id, task.surahName, task.fromVerse, task.toVerse)}>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm" data-testid={`text-assignment-student-${task.id}`}>{getAssignStudentName(task.studentId)}</p>
                            <p className="text-xs text-muted-foreground">{task.surahName} ({task.fromVerse}-{task.toVerse})</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-1 text-sm font-bold text-primary mb-1">
                            <Clock className="w-3 h-3" />
                            {task.scheduledDate ? format(new Date(task.scheduledDate), "hh:mm a", { locale: ar }) : "—"}
                          </div>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full",
                            task.status === "done" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          )} data-testid={`status-assignment-${task.id}`}>
                            {task.status === "done" ? "تم التسميع" : "انتظار"}
                          </span>
                          {!isStudent && (
                          <div className="flex items-center gap-1 mt-1" data-testid={`seen-status-${task.id}`}>
                            {task.seenByStudent ? (
                              <span className="flex items-center gap-1 text-[10px] text-blue-600">
                                <CheckCircle2 className="w-3 h-3" />
                                <CheckCircle2 className="w-3 h-3 -mr-1.5" />
                                تمت الرؤية
                                {task.seenAt && <span className="text-[9px] text-muted-foreground">({format(new Date(task.seenAt), "hh:mm a", { locale: ar })})</span>}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <CheckCircle2 className="w-3 h-3 -mr-1.5" />
                                لم يُرَ بعد
                              </span>
                            )}
                          </div>
                          )}
                        </div>
                        </div>
                        {isStudent && expandedAssignmentId === task.id && (
                          <div className="mt-3 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50" data-testid={`verses-display-${task.id}`}>
                            <div className="text-center mb-3">
                              <h4 className="text-sm font-bold text-primary flex items-center justify-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                {task.surahName} - الآيات {task.fromVerse} إلى {task.toVerse}
                              </h4>
                            </div>
                            {loadingVerses === task.id ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              </div>
                            ) : verseText[task.id] ? (
                              <div className="text-right leading-loose" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", fontSize: "20px" }} dir="rtl">
                                {verseText[task.id].map((v: any) => (
                                  <span key={v.number}>
                                    <span className="text-gray-800 dark:text-gray-200">{v.text}</span>
                                    <span className="text-amber-600 text-sm mx-1">﴿{v.number}﴾</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {!isStudent && (
              <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="p-4 flex gap-3">
                  <div className="p-2 bg-blue-100 rounded-full h-fit text-blue-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">تذكير تلقائي</h4>
                    <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                      سيقوم النظام بإرسال إشعار تلقائي للطالب قبل موعد التسميع بـ 15 دقيقة لتذكيره بالاستعداد.
                    </p>
                  </div>
                </CardContent>
              </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exams" className="mt-6">
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <p className="text-muted-foreground">
                  {isTeacher && "إدارة الامتحانات وتقييم الطلاب"}
                  {isSupervisor && "عرض جميع الامتحانات في الجامع/المركز"}
                  {isStudent && "الامتحانات القادمة"}
                </p>
              </div>
              {isTeacher && (
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetExamForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-white gap-2" data-testid="button-create-exam">
                      <Plus className="w-4 h-4" />
                      إنشاء امتحان
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>إنشاء امتحان جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>عنوان الامتحان *</Label>
                        <Input
                          data-testid="input-exam-title"
                          value={examTitle}
                          onChange={e => setExamTitle(e.target.value)}
                          placeholder="مثال: اختبار سورة البقرة"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>السورة *</Label>
                        <Select value={examSelectedSurah} onValueChange={(val) => { setExamSelectedSurah(val); setExamFromVerse("1"); setExamToVerse(""); }}>
                          <SelectTrigger data-testid="select-surah">
                            <SelectValue placeholder="اختر السورة" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {surahs.map(s => (
                              <SelectItem key={s.number} value={s.number.toString()} data-testid={`option-surah-${s.number}`}>
                                {s.number}. {s.name} ({s.versesCount} آية)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>من آية *</Label>
                          <Input
                            data-testid="input-from-verse"
                            type="number"
                            min={1}
                            max={examCurrentSurah?.versesCount || 1}
                            value={examFromVerse}
                            onChange={e => setExamFromVerse(e.target.value)}
                            placeholder="1"
                          />
                          {examCurrentSurah && (
                            <p className="text-xs text-muted-foreground" data-testid="text-max-verses-from">
                              الحد الأقصى: {examCurrentSurah.versesCount}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>إلى آية *</Label>
                          <Input
                            data-testid="input-to-verse"
                            type="number"
                            min={parseInt(examFromVerse) || 1}
                            max={examCurrentSurah?.versesCount || 1}
                            value={examToVerse}
                            onChange={e => setExamToVerse(e.target.value)}
                            placeholder={examCurrentSurah?.versesCount.toString() || ""}
                          />
                          {examCurrentSurah && (
                            <p className="text-xs text-muted-foreground" data-testid="text-max-verses-to">
                              الحد الأقصى: {examCurrentSurah.versesCount}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>تاريخ الامتحان (يوم) *</Label>
                        <Input
                          data-testid="input-exam-date"
                          type="date"
                          value={examDate}
                          onChange={e => setExamDate(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>ملاحظات</Label>
                        <Textarea
                          data-testid="input-description"
                          value={examDescription}
                          onChange={e => setExamDescription(e.target.value)}
                          placeholder="مثال: الامتحان سيكون الساعة 10:00 صباحاً بعد صلاة الضحى في قاعة الجامع/المركز"
                          rows={3}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <Label className="cursor-pointer">لجميع الطلاب</Label>
                        <Switch
                          data-testid="switch-is-for-all"
                          checked={isForAll}
                          onCheckedChange={setIsForAll}
                        />
                      </div>

                      {!isForAll && (
                        <div className="space-y-2 border rounded-lg p-3">
                          <Label>اختر الطلاب</Label>
                          {students.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2" data-testid="text-no-students">لا يوجد طلاب</p>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {students.map(s => (
                                <div key={s.id} className="flex items-center gap-2">
                                  <Checkbox
                                    data-testid={`checkbox-student-${s.id}`}
                                    checked={selectedStudentIds.includes(s.id)}
                                    onCheckedChange={() => toggleStudentSelection(s.id)}
                                  />
                                  <span className="text-sm">{s.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {selectedStudentIds.length > 0 && (
                            <p className="text-xs text-muted-foreground" data-testid="text-selected-count">
                              تم اختيار {selectedStudentIds.length} طالب
                            </p>
                          )}
                        </div>
                      )}

                      <Button
                        onClick={handleCreateExam}
                        disabled={examSubmitting}
                        className="w-full"
                        data-testid="button-submit-exam"
                      >
                        {examSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                        إنشاء الامتحان
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {examLoading ? (
              <div className="flex items-center justify-center py-12" data-testid="status-loading">
                <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
                <span>جاري التحميل...</span>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12" data-testid="status-empty">
                <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground text-lg">لا توجد امتحانات</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exams.map(exam => (
                  <Card
                    key={exam.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${expandedExamId === exam.id ? "ring-2 ring-primary" : ""}`}
                    data-testid={`card-exam-${exam.id}`}
                    onClick={() => toggleExpand(exam.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight" data-testid={`text-exam-title-${exam.id}`}>
                          {exam.title}
                        </CardTitle>
                        {isTeacher && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                            data-testid={`button-delete-exam-${exam.id}`}
                            disabled={deletingExam === exam.id}
                            onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id); }}
                          >
                            {deletingExam === exam.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        <span data-testid={`text-exam-surah-${exam.id}`}>
                          {exam.surahName} ({exam.fromVerse}-{exam.toVerse})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarLucide className="w-4 h-4 text-primary shrink-0" />
                        <span data-testid={`text-exam-date-${exam.id}`}>{formatDate(exam.examDate)}</span>
                      </div>
                      {exam.examTime && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        <span data-testid={`text-exam-time-${exam.id}`}>{exam.examTime}</span>
                      </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Users className="w-3 h-3" />
                          {exam.isForAll ? "جميع الطلاب" : "طلاب محددون"}
                        </Badge>
                      </div>
                      {exam.description && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                          <span data-testid={`text-exam-desc-${exam.id}`}>{exam.description}</span>
                        </div>
                      )}

                      {expandedExamId === exam.id && (
                        <div className="border-t pt-3 mt-3" onClick={e => e.stopPropagation()}>
                          {loadingDetails ? (
                            <div className="flex items-center justify-center py-4" data-testid="status-loading-details">
                              <Loader2 className="w-5 h-5 animate-spin text-primary ml-2" />
                              <span className="text-sm">جاري التحميل...</span>
                            </div>
                          ) : expandedExamData?.students && expandedExamData.students.length > 0 ? (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                الطلاب ({expandedExamData.students.length})
                              </h4>
                              {expandedExamData.students.map((es) => (
                                <div
                                  key={es.studentId}
                                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg gap-2"
                                  data-testid={`row-exam-student-${es.studentId}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                      {getExamStudentName(es.studentId).charAt(0)}
                                    </div>
                                    <span className="text-sm truncate" data-testid={`text-student-name-${es.studentId}`}>
                                      {getExamStudentName(es.studentId)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {es.status === "done" ? (
                                      <Badge className="bg-green-100 text-green-700 border-none" data-testid={`status-graded-${es.studentId}`}>
                                        {es.grade}/100
                                      </Badge>
                                    ) : isTeacher ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          data-testid={`input-grade-${es.studentId}`}
                                          type="number"
                                          min={0}
                                          max={100}
                                          className="w-16 h-8 text-sm"
                                          placeholder="الدرجة"
                                          value={gradeValues[es.studentId] || ""}
                                          onChange={e => setGradeValues(prev => ({ ...prev, [es.studentId]: e.target.value }))}
                                        />
                                        <Button
                                          size="sm"
                                          className="h-8 text-xs"
                                          data-testid={`button-grade-${es.studentId}`}
                                          disabled={gradingStudent === es.studentId}
                                          onClick={() => handleGrade(exam.id, es.studentId)}
                                        >
                                          {gradingStudent === es.studentId ? <Loader2 className="w-3 h-3 animate-spin" /> : "حفظ"}
                                        </Button>
                                      </div>
                                    ) : (
                                      <Badge variant="outline" data-testid={`status-pending-${es.studentId}`}>قيد الانتظار</Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-2" data-testid="text-no-exam-students">
                              لا يوجد طلاب مسجلين
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
