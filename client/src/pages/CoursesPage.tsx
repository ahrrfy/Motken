import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { GraduationCap, Plus, Trash2, Award, Loader2, Users, CalendarDays, Printer, BookOpen, CheckCircle } from "lucide-react";

interface StudentUser {
  id: string;
  name: string;
  username: string;
}

interface TeacherUser {
  id: string;
  name: string;
  username: string;
}

interface CourseStudentData {
  id: string;
  courseId: string;
  studentId: string;
  graduated: boolean;
  graduatedAt: string | null;
  studentName?: string;
}

interface CourseTeacherData {
  id: string;
  courseId: string;
  teacherId: string;
  teacherName?: string;
}

interface CertificateData {
  id: string;
  courseId: string;
  studentId: string;
  issuedBy: string;
  mosqueId: string | null;
  certificateNumber: string;
  issuedAt: string;
}

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  mosqueId: string | null;
  createdBy: string;
  startDate: string;
  endDate: string | null;
  status: string;
  targetType: string;
  students?: CourseStudentData[];
  teachers?: CourseTeacherData[];
  certificates?: CertificateData[];
}

export default function CoursesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [courses, setCourses] = useState<CourseData[]>([]);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [allStudents, setAllStudents] = useState<StudentUser[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [graduatingIds, setGraduatingIds] = useState<string[]>([]);
  const [graduatingAll, setGraduatingAll] = useState<string | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null);
  const [printCert, setPrintCert] = useState<CertificateData | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetType, setTargetType] = useState("specific");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";
  const canCreate = isTeacher || isSupervisor;

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/courses", { credentials: "include" });
      if (res.ok) setCourses(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الدورات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificates = async () => {
    try {
      const res = await fetch("/api/certificates", { credentials: "include" });
      if (res.ok) setCertificates(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الشهادات", variant: "destructive" });
    } finally {
      setLoadingCerts(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const promises: Promise<void>[] = [fetchCourses(), fetchCertificates()];

      if (canCreate || isAdmin) {
        promises.push(
          fetch("/api/users?role=student", { credentials: "include" })
            .then(r => r.ok ? r.json() : [])
            .then(d => setAllStudents(d))
            .catch(() => {}),
          fetch("/api/users?role=teacher", { credentials: "include" })
            .then(r => r.ok ? r.json() : [])
            .then(d => setAllTeachers(d))
            .catch(() => {})
        );
      }

      await Promise.all(promises);
    };
    loadData();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setTargetType("specific");
    setSelectedStudentIds([]);
    setSelectedTeacherIds([]);
  };

  const handleCreateCourse = async () => {
    if (!title || !startDate) {
      toast({ title: "خطأ", description: "يرجى تعبئة عنوان الدورة وتاريخ البداية", variant: "destructive" });
      return;
    }

    if (targetType === "specific" && selectedStudentIds.length === 0) {
      toast({ title: "خطأ", description: "يرجى اختيار طالب واحد على الأقل", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description: description || null,
          startDate,
          endDate: endDate || null,
          targetType,
          studentIds: targetType === "specific" ? selectedStudentIds : [],
          teacherIds: selectedTeacherIds,
        }),
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء الدورة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetForm();
        fetchCourses();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الدورة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGraduate = async (courseId: string, studentIds: string[]) => {
    if (studentIds.length === 0) return;
    const isAll = studentIds.length > 1;
    if (isAll) setGraduatingAll(courseId);
    else setGraduatingIds(studentIds);

    try {
      const res = await fetch(`/api/courses/${courseId}/graduate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentIds }),
      });

      if (res.ok) {
        toast({ title: "🎓 تم التخريج بنجاح", description: `تم تخريج ${studentIds.length} طالب بنجاح`, className: "bg-green-50 border-green-200 text-green-800" });
        fetchCourses();
        fetchCertificates();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في عملية التخريج", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setGraduatingIds([]);
      setGraduatingAll(null);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    setDeletingCourse(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف الدورة", className: "bg-green-50 border-green-200 text-green-800" });
        setCourses(prev => prev.filter(c => c.id !== courseId));
        if (expandedCourseId === courseId) setExpandedCourseId(null);
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الدورة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setDeletingCourse(null);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
    );
  };

  const getStudentName = (studentId: string) => {
    const fromUsers = allStudents.find(s => s.id === studentId);
    if (fromUsers) return fromUsers.name;
    for (const course of courses) {
      const s = course.students?.find(cs => cs.studentId === studentId);
      if (s?.studentName) return s.studentName;
    }
    return studentId;
  };

  const getTeacherName = (teacherId: string) => {
    const fromUsers = allTeachers.find(t => t.id === teacherId);
    if (fromUsers) return fromUsers.name;
    for (const course of courses) {
      const t = course.teachers?.find(ct => ct.teacherId === teacherId);
      if (t?.teacherName) return t.teacherName;
    }
    return teacherId;
  };

  const getCourseName = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || courseId;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("ar-SA");
    } catch {
      return dateStr;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 border-none">نشطة</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-700 border-none">مكتملة</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 border-none">ملغاة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canDeleteCourse = (course: CourseData) => {
    return isSupervisor || isAdmin || course.createdBy === user?.id;
  };

  const handlePrint = (cert: CertificateData) => {
    setPrintCert(cert);
    setTimeout(() => {
      const printContent = document.getElementById("certificate-print-area");
      if (!printContent) return;
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(`
        <html dir="rtl">
        <head><title>شهادة إتمام دورة</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
          body { font-family: 'Amiri', serif; margin: 0; padding: 0; }
        </style>
        </head>
        <body>${printContent.innerHTML}</body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
      win.close();
      setPrintCert(null);
    }, 300);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">الدورات والشهادات</h1>
            <p className="text-muted-foreground text-sm">
              {isTeacher && "إدارة الدورات وتخريج الطلاب"}
              {isSupervisor && "إدارة جميع الدورات في المسجد"}
              {isStudent && "دوراتي وشهاداتي"}
              {isAdmin && "إدارة الدورات والشهادات"}
            </p>
          </div>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white gap-2" data-testid="button-create-course">
                <Plus className="w-4 h-4" />
                إنشاء دورة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>إنشاء دورة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">عنوان الدورة *</label>
                  <Input
                    data-testid="input-course-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="مثال: دورة حفظ جزء عم"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">وصف الدورة</label>
                  <Textarea
                    data-testid="input-course-description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="وصف الدورة (اختياري)"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">تاريخ البداية *</label>
                    <Input
                      data-testid="input-start-date"
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">تاريخ النهاية</label>
                    <Input
                      data-testid="input-end-date"
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">نوع الاستهداف</label>
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger data-testid="select-target-type">
                      <SelectValue placeholder="اختر نوع الاستهداف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="specific" data-testid="option-target-specific">طلاب محددين</SelectItem>
                      {isTeacher && <SelectItem value="teacher_all" data-testid="option-target-teacher-all">جميع طلابي</SelectItem>}
                      {(isSupervisor || isTeacher) && <SelectItem value="mosque_all" data-testid="option-target-mosque-all">جميع طلبة المسجد</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {targetType === "specific" && (
                  <div className="space-y-2 border rounded-lg p-3">
                    <label className="text-sm font-medium">اختر الطلاب</label>
                    {allStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2" data-testid="text-no-students">لا يوجد طلاب</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {allStudents.map(s => (
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
                      <p className="text-xs text-muted-foreground" data-testid="text-selected-students-count">
                        تم اختيار {selectedStudentIds.length} طالب
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2 border rounded-lg p-3">
                  <label className="text-sm font-medium">الأساتذة المشاركين</label>
                  {allTeachers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2" data-testid="text-no-teachers">لا يوجد أساتذة</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {allTeachers.map(t => (
                        <div key={t.id} className="flex items-center gap-2">
                          <Checkbox
                            data-testid={`checkbox-teacher-${t.id}`}
                            checked={selectedTeacherIds.includes(t.id)}
                            onCheckedChange={() => toggleTeacherSelection(t.id)}
                          />
                          <span className="text-sm">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedTeacherIds.length > 0 && (
                    <p className="text-xs text-muted-foreground" data-testid="text-selected-teachers-count">
                      تم اختيار {selectedTeacherIds.length} أستاذ
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleCreateCourse}
                  disabled={submitting}
                  className="w-full"
                  data-testid="button-submit-course"
                >
                  {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  إنشاء الدورة
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="courses" dir="rtl">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="courses" data-testid="tab-courses">
            <BookOpen className="w-4 h-4 ml-1" />
            الدورات
          </TabsTrigger>
          <TabsTrigger value="certificates" data-testid="tab-certificates">
            <Award className="w-4 h-4 ml-1" />
            شهاداتي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="status-loading">
              <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
              <span>جاري التحميل...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12" data-testid="status-empty-courses">
              <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-lg">لا توجد دورات</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(course => (
                <Card
                  key={course.id}
                  className={`cursor-pointer transition-shadow hover:shadow-md ${expandedCourseId === course.id ? "ring-2 ring-primary" : ""}`}
                  data-testid={`card-course-${course.id}`}
                  onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg leading-tight" data-testid={`text-course-title-${course.id}`}>
                        {course.title}
                      </CardTitle>
                      <div className="flex items-center gap-1 shrink-0">
                        {statusBadge(course.status)}
                        {canDeleteCourse(course) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            data-testid={`button-delete-course-${course.id}`}
                            disabled={deletingCourse === course.id}
                            onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                          >
                            {deletingCourse === course.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {course.description && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-course-desc-${course.id}`}>
                        {course.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                      <span data-testid={`text-course-dates-${course.id}`}>
                        {formatDate(course.startDate)}
                        {course.endDate && ` - ${formatDate(course.endDate)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" />
                        {course.students?.length || 0} طالب
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <GraduationCap className="w-3 h-3" />
                        {course.teachers?.length || 0} أستاذ
                      </Badge>
                    </div>

                    {expandedCourseId === course.id && (
                      <div className="border-t pt-3 mt-3 space-y-3" onClick={e => e.stopPropagation()}>
                        <h4 className="font-semibold text-sm flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          الطلاب المسجلين ({course.students?.length || 0})
                        </h4>

                        {course.students && course.students.length > 0 ? (
                          <>
                            <div className="space-y-2">
                              {course.students.map(cs => (
                                <div
                                  key={cs.studentId}
                                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg gap-2"
                                  data-testid={`row-course-student-${cs.studentId}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                      {(cs.studentName || getStudentName(cs.studentId)).charAt(0)}
                                    </div>
                                    <span className="text-sm truncate" data-testid={`text-student-name-${cs.studentId}`}>
                                      {cs.studentName || getStudentName(cs.studentId)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {cs.graduated ? (
                                      <Badge className="bg-green-100 text-green-700 border-none gap-1" data-testid={`status-graduated-${cs.studentId}`}>
                                        <CheckCircle className="w-3 h-3" />
                                        متخرج
                                      </Badge>
                                    ) : (canCreate || isAdmin) ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs gap-1"
                                        data-testid={`button-graduate-${cs.studentId}`}
                                        disabled={graduatingIds.includes(cs.studentId)}
                                        onClick={() => handleGraduate(course.id, [cs.studentId])}
                                      >
                                        {graduatingIds.includes(cs.studentId) ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <>تخريج 👨‍🎓</>
                                        )}
                                      </Button>
                                    ) : (
                                      <Badge variant="outline" data-testid={`status-not-graduated-${cs.studentId}`}>
                                        لم يتخرج
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {(canCreate || isAdmin) && course.students.some(s => !s.graduated) && (
                              <Button
                                className="w-full gap-2"
                                variant="outline"
                                data-testid={`button-graduate-all-${course.id}`}
                                disabled={graduatingAll === course.id}
                                onClick={() => {
                                  const nonGraduated = course.students!.filter(s => !s.graduated).map(s => s.studentId);
                                  handleGraduate(course.id, nonGraduated);
                                }}
                              >
                                {graduatingAll === course.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>تخريج الكل 👨‍🎓</>
                                )}
                              </Button>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">لا يوجد طلاب مسجلين</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="certificates" className="mt-4">
          {loadingCerts ? (
            <div className="flex items-center justify-center py-12" data-testid="status-loading-certs">
              <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
              <span>جاري التحميل...</span>
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-12" data-testid="status-empty-certificates">
              <Award className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-lg">لا توجد شهادات</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map(cert => (
                <Card key={cert.id} className="hover:shadow-md transition-shadow" data-testid={`card-certificate-${cert.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <CardTitle className="text-base" data-testid={`text-cert-course-${cert.id}`}>
                        {getCourseName(cert.courseId)}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm flex justify-between">
                      <span className="text-muted-foreground">رقم الشهادة:</span>
                      <span className="font-mono" data-testid={`text-cert-number-${cert.id}`}>{cert.certificateNumber}</span>
                    </div>
                    <div className="text-sm flex justify-between">
                      <span className="text-muted-foreground">اسم الطالب:</span>
                      <span data-testid={`text-cert-student-${cert.id}`}>{getStudentName(cert.studentId)}</span>
                    </div>
                    <div className="text-sm flex justify-between">
                      <span className="text-muted-foreground">تاريخ الإصدار:</span>
                      <span data-testid={`text-cert-date-${cert.id}`}>{formatDate(cert.issuedAt)}</span>
                    </div>
                    <div className="text-sm flex justify-between">
                      <span className="text-muted-foreground">صدرت بواسطة:</span>
                      <span data-testid={`text-cert-issuer-${cert.id}`}>{getTeacherName(cert.issuedBy)}</span>
                    </div>
                    <Button
                      className="w-full mt-2 gap-2"
                      variant="outline"
                      data-testid={`button-print-cert-${cert.id}`}
                      onClick={() => handlePrint(cert)}
                    >
                      <Printer className="w-4 h-4" />
                      طباعة الشهادة
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {printCert && (
        <div id="certificate-print-area" className="fixed -left-[9999px] top-0" ref={printRef}>
          <div style={{
            width: "800px",
            padding: "60px",
            fontFamily: "'Amiri', serif",
            border: "8px double #b8860b",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #fffdf7 0%, #fef9e7 100%)",
            position: "relative",
            direction: "rtl",
          }}>
            <div style={{
              position: "absolute",
              top: "15px",
              left: "15px",
              right: "15px",
              bottom: "15px",
              border: "2px solid #d4a843",
              borderRadius: "8px",
              pointerEvents: "none",
            }} />

            <div style={{ textAlign: "center", marginBottom: "30px" }}>
              <p style={{ fontSize: "22px", color: "#2c5f2d", marginBottom: "10px", fontWeight: "bold" }}>
                بسم الله الرحمن الرحيم
              </p>
              <div style={{ marginBottom: "15px" }}>
                <img src="/images/logo.png" alt="مُتْقِن" style={{ width: "60px", height: "60px", margin: "0 auto", borderRadius: "8px" }} />
              </div>
              <h1 style={{ fontSize: "32px", color: "#1a5276", marginBottom: "5px", fontWeight: "bold" }}>
                مُتْقِن
              </h1>
              <h2 style={{ fontSize: "26px", color: "#b8860b", marginBottom: "20px", fontWeight: "bold" }}>
                شهادة إتمام دورة
              </h2>
              <div style={{ width: "100px", height: "2px", background: "#b8860b", margin: "0 auto 25px" }} />
            </div>

            <div style={{ textAlign: "center", fontSize: "18px", lineHeight: "2.2", color: "#333" }}>
              <p>يُشهد بأن الطالب / الطالبة</p>
              <p style={{ fontSize: "28px", color: "#1a5276", fontWeight: "bold", margin: "10px 0" }}>
                {getStudentName(printCert.studentId)}
              </p>
              <p>قد أتم / أتمت بنجاح دورة</p>
              <p style={{ fontSize: "24px", color: "#b8860b", fontWeight: "bold", margin: "10px 0" }}>
                {getCourseName(printCert.courseId)}
              </p>
              <p style={{ marginTop: "15px" }}>
                بتاريخ: {formatDate(printCert.issuedAt)}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "50px", fontSize: "14px", color: "#666" }}>
              <div>
                <p>رقم الشهادة: {printCert.certificateNumber}</p>
              </div>
              <div style={{ textAlign: "left" }}>
                <p>صدرت بواسطة: {getTeacherName(printCert.issuedBy)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
