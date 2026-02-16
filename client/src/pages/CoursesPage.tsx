import { useState, useEffect } from "react";
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
import { formatDateAr } from "@/lib/utils";
import { GraduationCap, Plus, Trash2, Award, Loader2, Users, CalendarDays, Printer, BookOpen, CheckCircle } from "lucide-react";

interface StudentUser {
  id: string;
  name: string;
  username: string;
  gender?: string | null;
  age?: number | null;
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

  const formatDate = (dateStr: string) => formatDateAr(dateStr);

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

  type CertTemplateType = "male" | "female" | "children";

  const detectCertificateTemplate = (studentId: string): CertTemplateType => {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return "male";

    const gender = student.gender;
    const age = student.age;

    if (age !== null && age !== undefined && age <= 12) return "children";
    if (!age && !gender) return "children";

    if (gender === "male" || gender === "ذكر") return "male";
    if (gender === "female" || gender === "أنثى") return "female";

    return "male";
  };

  const getCertificateTheme = (template: CertTemplateType) => {
    switch (template) {
      case "male":
        return {
          primary: "#16213e",
          accent: "#c9a84c",
          secondary: "#0f3460",
          bg: "linear-gradient(135deg, #fefefe 0%, #f8f4e8 100%)",
          detailBg: "#f8f4e8",
          detailBorder: "#e0d5b8",
          titleLabel: "شهادة إتمام",
          completionText: "قد أتمّ بنجاح وتفوّق الدورة التعليمية",
          actionBarBg: "#16213e",
          btnPrint: "#e94560",
          btnSave: "#0f3460",
        };
      case "female":
        return {
          primary: "#4a1942",
          accent: "#b76e79",
          secondary: "#6b2d5b",
          bg: "linear-gradient(135deg, #fefefe 0%, #faf0f2 100%)",
          detailBg: "#faf0f2",
          detailBorder: "#e8cdd2",
          titleLabel: "شهادة إتمام",
          completionText: "قد أتمّت بنجاح وتفوّق الدورة التعليمية",
          actionBarBg: "#4a1942",
          btnPrint: "#b76e79",
          btnSave: "#6b2d5b",
        };
      case "children":
        return {
          primary: "#0d9488",
          accent: "#f59e0b",
          secondary: "#0f766e",
          bg: "linear-gradient(135deg, #fefefe 0%, #f0fdfa 100%)",
          detailBg: "#f0fdfa",
          detailBorder: "#99f6e4",
          titleLabel: "شهادة تقدير",
          completionText: "قد أتمّ بنجاح الدورة التعليمية",
          actionBarBg: "#0d9488",
          btnPrint: "#f59e0b",
          btnSave: "#0f766e",
        };
    }
  };

  const getTemplateDecorations = (template: CertTemplateType) => {
    switch (template) {
      case "male":
        return {
          cornerStyle: `
            .corner-decoration { position: absolute; width: 70px; height: 70px; }
            .corner-tl, .corner-tr, .corner-bl, .corner-br {
              border: none;
              background: none;
            }
            .corner-tl::before, .corner-tr::before, .corner-bl::before, .corner-br::before {
              content: '';
              position: absolute;
              width: 50px;
              height: 50px;
              border: 2px solid #c9a84c;
            }
            .corner-tl::after, .corner-tr::after, .corner-bl::after, .corner-br::after {
              content: '';
              position: absolute;
              width: 30px;
              height: 30px;
              border: 1px solid #16213e;
            }
            .corner-tl { top: 20px; left: 20px; }
            .corner-tl::before { top: 0; left: 0; border-right: none; border-bottom: none; }
            .corner-tl::after { top: 5px; left: 5px; border-right: none; border-bottom: none; }
            .corner-tr { top: 20px; right: 20px; }
            .corner-tr::before { top: 0; right: 0; border-left: none; border-bottom: none; }
            .corner-tr::after { top: 5px; right: 5px; border-left: none; border-bottom: none; }
            .corner-bl { bottom: 20px; left: 20px; }
            .corner-bl::before { bottom: 0; left: 0; border-right: none; border-top: none; }
            .corner-bl::after { bottom: 5px; left: 5px; border-right: none; border-top: none; }
            .corner-br { bottom: 20px; right: 20px; }
            .corner-br::before { bottom: 0; right: 0; border-left: none; border-top: none; }
            .corner-br::after { bottom: 5px; right: 5px; border-left: none; border-top: none; }
          `,
          watermark: `
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.04;
              font-size: 200px;
              color: #16213e;
              pointer-events: none;
              z-index: 0;
            }
          `,
          watermarkHtml: `<div class="watermark">🕌</div>`,
          extraFrame: `
            .cert-frame::before { content: ''; position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px; border: 2px solid #c9a84c; pointer-events: none; }
            .cert-frame::after { content: ''; position: absolute; top: 14px; left: 14px; right: 14px; bottom: 14px; border: 1px solid #16213e; pointer-events: none; }
          `,
        };
      case "female":
        return {
          cornerStyle: `
            .corner-decoration { position: absolute; width: 80px; height: 80px; opacity: 0.6; }
            .corner-tl { top: 15px; left: 15px; }
            .corner-tr { top: 15px; right: 15px; transform: scaleX(-1); }
            .corner-bl { bottom: 15px; left: 15px; transform: scaleY(-1); }
            .corner-br { bottom: 15px; right: 15px; transform: scale(-1, -1); }
            .corner-decoration::before {
              content: '❀';
              position: absolute;
              font-size: 40px;
              color: #b76e79;
            }
            .corner-decoration::after {
              content: '';
              position: absolute;
              width: 60px;
              height: 60px;
              border-top: 2px solid #b76e79;
              border-left: 2px solid #b76e79;
              border-radius: 5px 0 0 0;
              top: 5px;
              left: 5px;
            }
          `,
          watermark: `
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.03;
              font-size: 300px;
              color: #4a1942;
              pointer-events: none;
              z-index: 0;
            }
          `,
          watermarkHtml: `<div class="watermark">❀</div>`,
          extraFrame: `
            .cert-frame::before { content: ''; position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px; border: 2px solid #b76e79; pointer-events: none; border-radius: 4px; }
            .cert-frame::after { content: ''; position: absolute; top: 14px; left: 14px; right: 14px; bottom: 14px; border: 1px solid #4a1942; pointer-events: none; border-radius: 2px; }
            .floral-border-top, .floral-border-bottom {
              position: absolute;
              left: 50%;
              transform: translateX(-50%);
              font-size: 16px;
              letter-spacing: 8px;
              color: #b76e79;
              opacity: 0.5;
            }
            .floral-border-top { top: 22px; }
            .floral-border-bottom { bottom: 22px; }
          `,
        };
      case "children":
        return {
          cornerStyle: `
            .corner-decoration { position: absolute; width: 60px; height: 60px; }
            .corner-tl { top: 15px; left: 15px; }
            .corner-tr { top: 15px; right: 15px; }
            .corner-bl { bottom: 15px; left: 15px; }
            .corner-br { bottom: 15px; right: 15px; }
            .corner-decoration::before {
              content: '⭐';
              position: absolute;
              font-size: 30px;
            }
            .corner-decoration::after {
              content: '✨';
              position: absolute;
              font-size: 18px;
              top: 35px;
              left: 35px;
            }
            .star-row {
              position: absolute;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 14px;
              letter-spacing: 12px;
              opacity: 0.4;
            }
            .star-row-top { top: 25px; }
            .star-row-bottom { bottom: 25px; }
          `,
          watermark: `
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.04;
              font-size: 200px;
              pointer-events: none;
              z-index: 0;
            }
          `,
          watermarkHtml: `<div class="watermark">🌟</div>`,
          extraFrame: `
            .cert-frame::before { content: ''; position: absolute; top: 6px; left: 6px; right: 6px; bottom: 6px; border: 3px dashed #f59e0b; pointer-events: none; border-radius: 12px; opacity: 0.5; }
            .cert-frame::after { content: ''; position: absolute; top: 14px; left: 14px; right: 14px; bottom: 14px; border: 2px solid #0d9488; pointer-events: none; border-radius: 8px; opacity: 0.4; }
          `,
        };
    }
  };

  const printCertificate = (cert: CertificateData, courseName: string, studentName: string, studentId: string) => {
    const template = detectCertificateTemplate(studentId);
    const theme = getCertificateTheme(template);
    const decorations = getTemplateDecorations(template);
    const issuedDate = new Date(cert.issuedAt).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" });

    const extraHtml = template === "female"
      ? `<div class="floral-border-top">❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀</div><div class="floral-border-bottom">❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀</div>`
      : template === "children"
      ? `<div class="star-row star-row-top">⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐</div><div class="star-row star-row-bottom">⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐</div>`
      : "";

    const certHtml = `
      <div class="cert-container">
        <div class="cert-frame">
          ${decorations.watermarkHtml}
          <div class="corner-decoration corner-tl"></div>
          <div class="corner-decoration corner-tr"></div>
          <div class="corner-decoration corner-bl"></div>
          <div class="corner-decoration corner-br"></div>
          ${extraHtml}
          <div class="cert-content">
            <div class="cert-header">
              <div class="bismillah">﷽</div>
              <div class="cert-logo"><img src="/logo.png" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" /></div>
              <div class="cert-system-name">مُتْقِن</div>
              <div class="cert-subtitle">نظام إدارة حلقات القرآن الكريم</div>
            </div>
            <div class="cert-title">
              <h1>${theme.titleLabel}</h1>
              <div class="underline-decoration"></div>
            </div>
            <div class="cert-body">
              يشهد نظام مُتْقِن لإدارة حلقات القرآن الكريم بأن
              <br />
              <span class="student-name">${studentName}</span>
              <br />
              ${theme.completionText}
              <br />
              <span class="course-name">${courseName}</span>
              <br />
              وقد استوفى جميع المتطلبات والشروط المقررة
            </div>
            <div class="cert-details">
              <div class="cert-detail-item">
                <div class="cert-detail-label">رقم الشهادة</div>
                <div class="cert-detail-value">${cert.certificateNumber}</div>
              </div>
              <div class="cert-detail-item">
                <div class="cert-detail-label">تاريخ الإصدار</div>
                <div class="cert-detail-value">${issuedDate}</div>
              </div>
            </div>
            <div class="cert-signatures">
              <div class="cert-signature">
                <div class="line"></div>
                <div class="label">توقيع المشرف</div>
              </div>
              <div class="cert-signature">
                <div class="line"></div>
                <div class="label">ختم المؤسسة</div>
              </div>
              <div class="cert-signature">
                <div class="line"></div>
                <div class="label">توقيع الأستاذ</div>
              </div>
            </div>
            <div class="cert-footer">
              <div class="cert-number">${cert.certificateNumber}</div>
              <div class="cert-qr-note">النظام وقف لله تعالى • برمجة وتطوير أحمد خالد الزبيدي</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>شهادة إتمام - ${studentName}</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif; direction: rtl; background: white; display: flex; flex-direction: column; align-items: center; padding: 20px; }
      .actions-bar { position: fixed; top: 0; left: 0; right: 0; background: ${theme.actionBarBg}; color: white; padding: 10px 20px; display: flex; gap: 10px; justify-content: center; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
      .actions-bar button { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-family: 'Tajawal', sans-serif; font-size: 14px; font-weight: 500; }
      .btn-print { background: ${theme.btnPrint}; color: white; }
      .btn-save { background: ${theme.btnSave}; color: white; }
      .btn-close { background: #555; color: white; }
      .cert-area { margin-top: 60px; }
      .cert-container { width: 29.7cm; height: 21cm; margin: 0 auto; position: relative; padding: 0; background: white; }
      .cert-frame { border: 3px solid ${theme.primary}; padding: 40px; position: relative; background: ${theme.bg}; width: 100%; height: 100%; overflow: hidden; }
      ${decorations.extraFrame}
      ${decorations.cornerStyle}
      ${decorations.watermark}
      .cert-content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
      .cert-header { text-align: center; margin-bottom: 10px; }
      .bismillah { font-size: 28px; color: ${theme.accent}; margin-bottom: 10px; font-family: 'Tajawal', serif; }
      .cert-logo { width: 60px; height: 60px; margin: 0 auto 8px; background: ${theme.primary}; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: 700; overflow: hidden; }
      .cert-system-name { font-size: 20px; font-weight: 700; color: ${theme.primary}; }
      .cert-subtitle { font-size: 12px; color: #666; margin-top: 2px; }
      .cert-title { text-align: center; margin: 10px 0; }
      .cert-title h1 { font-size: 34px; font-weight: 700; color: ${theme.accent}; margin: 0; letter-spacing: 3px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); }
      .cert-title .underline-decoration { width: 200px; height: 3px; background: linear-gradient(to right, transparent, ${theme.accent}, transparent); margin: 8px auto; }
      .cert-body { text-align: center; margin: 10px 0; font-size: 17px; line-height: 2; color: #333; }
      .cert-body .student-name { font-size: 26px; font-weight: 700; color: ${theme.primary}; border-bottom: 2px solid ${theme.accent}; padding-bottom: 4px; display: inline-block; margin: 4px 0; }
      .cert-body .course-name { font-size: 20px; font-weight: 700; color: ${theme.secondary}; display: inline-block; margin: 4px 0; }
      .cert-details { display: flex; justify-content: space-around; margin: 10px 0; padding: 12px; background: ${theme.detailBg}; border-radius: 8px; border: 1px solid ${theme.detailBorder}; }
      .cert-detail-item { text-align: center; }
      .cert-detail-label { font-size: 11px; color: #888; margin-bottom: 3px; }
      .cert-detail-value { font-size: 14px; font-weight: 700; color: ${theme.primary}; }
      .cert-signatures { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; }
      .cert-signature { text-align: center; width: 200px; }
      .cert-signature .line { width: 150px; border-top: 1px solid #333; margin: 0 auto 5px; }
      .cert-signature .label { font-size: 12px; color: #666; }
      .cert-footer { text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid ${theme.detailBorder}; }
      .cert-number { font-size: 11px; color: #999; font-family: monospace; }
      .cert-qr-note { font-size: 10px; color: #aaa; margin-top: 3px; }
      @media print { .actions-bar { display: none !important; } .cert-area { margin-top: 0; } body { padding: 0; } .cert-container { max-width: none; } @page { size: 29.7cm 21cm landscape; margin: 0; } }
    </style></head><body>
    <div class="actions-bar">
      <button class="btn-print" onclick="window.print()">🖨️ طباعة مباشرة</button>
      <button class="btn-save" onclick="window.print()">📥 حفظ كـ PDF</button>
      <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
    </div>
    <div class="cert-area">${certHtml}</div></body></html>`);
    win.document.close();
  };

  const handlePrint = (cert: CertificateData) => {
    const studentName = getStudentName(cert.studentId);
    const courseName = getCourseName(cert.courseId);
    printCertificate(cert, courseName, studentName, cert.studentId);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">الدورات والشهادات</h1>
            <p className="text-muted-foreground text-sm">
              {isTeacher && "إدارة الدورات وتخريج الطلاب"}
              {isSupervisor && "إدارة جميع الدورات في الجامع/المركز"}
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
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                      {(isSupervisor || isTeacher) && <SelectItem value="mosque_all" data-testid="option-target-mosque-all">جميع طلبة الجامع/المركز</SelectItem>}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                                      <>
                                        <Badge className="bg-green-100 text-green-700 border-none gap-1" data-testid={`status-graduated-${cs.studentId}`}>
                                          <CheckCircle className="w-3 h-3" />
                                          متخرج
                                        </Badge>
                                        {(() => {
                                          const cert = course.certificates?.find(c => c.studentId === cs.studentId);
                                          if (cert) {
                                            return (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs gap-1 h-7"
                                                data-testid={`button-print-grad-cert-${cs.studentId}`}
                                                onClick={() => printCertificate(cert, course.title, cs.studentName || getStudentName(cs.studentId), cs.studentId)}
                                              >
                                                <Printer className="w-3 h-3" />
                                                الشهادة
                                              </Button>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

    </div>
  );
}
