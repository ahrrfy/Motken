import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, BookOpen, Calendar, Clock, Users, FileText, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr } from "@/lib/utils";

interface QuranSurah {
  number: number;
  name: string;
  versesCount: number;
}

interface Student {
  id: string;
  name: string;
  username: string;
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

export default function ExamsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [expandedExamData, setExpandedExamData] = useState<Exam | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [gradingStudent, setGradingStudent] = useState<string | null>(null);
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  const [deletingExam, setDeletingExam] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [selectedSurah, setSelectedSurah] = useState("");
  const [fromVerse, setFromVerse] = useState("");
  const [toVerse, setToVerse] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [description, setDescription] = useState("");
  const [isForAll, setIsForAll] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isSupervisor = user?.role === "supervisor";

  const currentSurah = surahs.find(s => s.number.toString() === selectedSurah);

  const fetchExams = async () => {
    try {
      const res = await fetch("/api/exams", { credentials: "include" });
      if (res.ok) setExams(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الامتحانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const promises: Promise<void>[] = [fetchExams()];

      if (isTeacher) {
        promises.push(
          fetch("/api/quran-surahs", { credentials: "include" })
            .then(r => r.ok ? r.json() : [])
            .then(d => setSurahs(d))
            .catch(() => {}),
          fetch("/api/users?role=student", { credentials: "include" })
            .then(r => r.ok ? r.json() : [])
            .then(d => setStudents(d))
            .catch(() => {})
        );
      }

      await Promise.all(promises);
    };
    loadData();
  }, []);

  const resetForm = () => {
    setTitle("");
    setSelectedSurah("");
    setFromVerse("");
    setToVerse("");
    setExamDate("");
    setExamTime("");
    setDescription("");
    setIsForAll(true);
    setSelectedStudentIds([]);
  };

  const handleCreateExam = async () => {
    if (!title || !selectedSurah || !fromVerse || !toVerse || !examDate || !examTime) {
      toast({ title: "خطأ", description: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const surah = surahs.find(s => s.number.toString() === selectedSurah);
    if (!surah) return;

    const fv = parseInt(fromVerse);
    const tv = parseInt(toVerse);

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

    setSubmitting(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          surahName: surah.name,
          fromVerse: fv,
          toVerse: tv,
          examDate,
          examTime,
          description: description || null,
          isForAll,
          studentIds: isForAll ? [] : selectedStudentIds,
        }),
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء الامتحان بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetForm();
        fetchExams();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الامتحان", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
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

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const getStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || studentId;
  };

  const formatDate = (dateStr: string) => formatDateAr(dateStr);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">الامتحانات</h1>
          <p className="text-muted-foreground">
            {isTeacher && "إدارة الامتحانات وتقييم الطلاب"}
            {isSupervisor && "عرض جميع الامتحانات في الجامع/المركز"}
            {isStudent && "الامتحانات القادمة"}
          </p>
        </div>
        {isTeacher && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
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
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="مثال: اختبار سورة البقرة"
                  />
                </div>

                <div className="space-y-2">
                  <Label>السورة *</Label>
                  <Select value={selectedSurah} onValueChange={(val) => { setSelectedSurah(val); setFromVerse("1"); setToVerse(""); }}>
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
                      max={currentSurah?.versesCount || 1}
                      value={fromVerse}
                      onChange={e => setFromVerse(e.target.value)}
                      placeholder="1"
                    />
                    {currentSurah && (
                      <p className="text-xs text-muted-foreground" data-testid="text-max-verses-from">
                        الحد الأقصى: {currentSurah.versesCount}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>إلى آية *</Label>
                    <Input
                      data-testid="input-to-verse"
                      type="number"
                      min={parseInt(fromVerse) || 1}
                      max={currentSurah?.versesCount || 1}
                      value={toVerse}
                      onChange={e => setToVerse(e.target.value)}
                      placeholder={currentSurah?.versesCount.toString() || ""}
                    />
                    {currentSurah && (
                      <p className="text-xs text-muted-foreground" data-testid="text-max-verses-to">
                        الحد الأقصى: {currentSurah.versesCount}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>تاريخ الامتحان *</Label>
                    <Input
                      data-testid="input-exam-date"
                      type="date"
                      value={examDate}
                      onChange={e => setExamDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>وقت الامتحان *</Label>
                    <Input
                      data-testid="input-exam-time"
                      type="time"
                      value={examTime}
                      onChange={e => setExamTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    data-testid="input-description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="ملاحظات إضافية (اختياري)"
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
                  disabled={submitting}
                  className="w-full"
                  data-testid="button-submit-exam"
                >
                  {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  إنشاء الامتحان
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
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
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <span data-testid={`text-exam-date-${exam.id}`}>{formatDate(exam.examDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span data-testid={`text-exam-time-${exam.id}`}>{exam.examTime}</span>
                </div>
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
                                {getStudentName(es.studentId).charAt(0)}
                              </div>
                              <span className="text-sm truncate" data-testid={`text-student-name-${es.studentId}`}>
                                {getStudentName(es.studentId)}
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
  );
}