import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";
import { generateCertificateHtml } from "@/lib/print-utils";
import { usePrintPreview } from "@/lib/print-context";
import { generateCertificatePdf } from "@/lib/pdf-generator";
import {
  BookOpen, Plus, Trash2, Award, Loader2, Users, CalendarDays, Printer,
  GraduationCap, CheckCircle, Search, Filter, Copy, Edit, BarChart3, Shield,
  TrendingUp, Play, XCircle, UserPlus, UserMinus, RotateCcw, AlertCircle,
  Globe, Phone, Hash
} from "lucide-react";

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
  graduationGrade: string | null;
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
  notes: string | null;
  graduationGrade: string | null;
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
  category: string;
  maxStudents: number | null;
  notes: string | null;
  students?: CourseStudentData[];
  teachers?: CourseTeacherData[];
  certificates?: CertificateData[];
}

interface CourseStats {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  cancelledCourses: number;
  totalStudents: number;
  totalGraduated: number;
  totalCertificates: number;
  graduationRate: number;
}

interface VerificationResult {
  valid: boolean;
  certificateNumber?: string;
  courseName?: string;
  studentName?: string;
  issuerName?: string;
  issuedAt?: string;
  graduationGrade?: string;
  notes?: string;
  message?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  memorization: "حفظ القرآن",
  tajweed: "التجويد",
  tafseer: "التفسير",
  seerah: "السيرة النبوية",
  other: "أخرى",
};

const GRADE_LABELS: Record<string, string> = {
  excellent: "ممتاز",
  very_good: "جيد جداً",
  good: "جيد",
  acceptable: "مقبول",
};

const CATEGORY_COLORS: Record<string, string> = {
  memorization: "bg-emerald-100 text-emerald-700 border-none",
  tajweed: "bg-blue-100 text-blue-700 border-none",
  tafseer: "bg-purple-100 text-purple-700 border-none",
  seerah: "bg-amber-100 text-amber-700 border-none",
  other: "bg-gray-100 text-gray-700 border-none",
};

export default function CoursesPage({ embedded }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openPrintPreview } = usePrintPreview();
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
  const [stats, setStats] = useState<CourseStats | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetType, setTargetType] = useState("specific");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [category, setCategory] = useState("memorization");
  const [maxStudents, setMaxStudents] = useState("");
  const [notes, setNotes] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseData | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editCategory, setEditCategory] = useState("memorization");
  const [editMaxStudents, setEditMaxStudents] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [graduationGrades, setGraduationGrades] = useState<Record<string, string>>({});

  const [duplicatingCourse, setDuplicatingCourse] = useState<string | null>(null);
  const [ungraduatingId, setUngraduatingId] = useState<string | null>(null);

  const [addStudentsDialogOpen, setAddStudentsDialogOpen] = useState(false);
  const [addStudentsCourseId, setAddStudentsCourseId] = useState<string | null>(null);
  const [addStudentIds, setAddStudentIds] = useState<string[]>([]);
  const [addingStudents, setAddingStudents] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);

  const [verifyCertNumber, setVerifyCertNumber] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [mosqueData, setMosqueData] = useState<{ name?: string; image?: string | null }>({});

  // External participants
  const [extParticipants, setExtParticipants] = useState<Record<string, any[]>>({});
  const [addExtDialogOpen, setAddExtDialogOpen] = useState(false);
  const [addExtCourseId, setAddExtCourseId] = useState<string | null>(null);
  const [extName, setExtName] = useState("");
  const [extPhone, setExtPhone] = useState("");
  const [extAge, setExtAge] = useState("");
  const [extNotes, setExtNotes] = useState("");
  const [addingExt, setAddingExt] = useState(false);
  const [phoneLookupResults, setPhoneLookupResults] = useState<any[]>([]);
  const [graduatingExtId, setGraduatingExtId] = useState<string | null>(null);
  const [extGradeMap, setExtGradeMap] = useState<Record<string, string>>({});

  // Inline external participants for create form
  const [createExtList, setCreateExtList] = useState<Array<{ tempId: string; name: string; phone: string; age: string }>>([]);

  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";
  const canCreate = isTeacher || isSupervisor || isAdmin;

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/courses", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        // جلب المشاركين الخارجيين لكل الدورات للتمييز البصري
        for (const c of data) {
          fetchExtParticipants(c.id);
        }
      }
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

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/courses/stats", { credentials: "include" });
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  useEffect(() => {
    const loadData = async () => {
      const promises: Promise<void>[] = [fetchCourses(), fetchCertificates()];

      if (!isStudent) {
        promises.push(fetchStats());
      }

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

      if (user?.mosqueId) {
        promises.push(
          fetch("/api/mosques", { credentials: "include" })
            .then(r => r.ok ? r.json() : [])
            .then((mosques: any[]) => {
              const m = mosques.find((ms: any) => ms.id === user.mosqueId);
              if (m) setMosqueData({ name: m.name, image: m.image });
            })
            .catch(() => {})
        );
      }

      await Promise.all(promises);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (expandedCourseId && canCreate) {
      fetchExtParticipants(expandedCourseId);
    }
  }, [expandedCourseId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setTargetType("specific");
    setSelectedStudentIds([]);
    setSelectedTeacherIds([]);
    setCategory("memorization");
    setMaxStudents("");
    setNotes("");
    setCreateExtList([]);
  };

  const handleCreateCourse = async () => {
    if (!title || !startDate) {
      toast({ title: "خطأ", description: "يرجى تعبئة عنوان الدورة وتاريخ البداية", variant: "destructive" });
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
          category,
          maxStudents: maxStudents ? parseInt(maxStudents) : null,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        const newCourse = await res.json();
        // POST inline external participants
        for (const ext of createExtList) {
          if (ext.name.trim()) {
            await fetch(`/api/courses/${newCourse.id}/external-participants`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: ext.name.trim(),
                phone: ext.phone.trim() || undefined,
                age: ext.age ? parseInt(ext.age) : undefined,
              }),
            }).catch(() => {});
          }
        }
        toast({ title: "تم بنجاح", description: "تم إنشاء الدورة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetForm();
        fetchCourses();
        if (!isStudent) fetchStats();
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

  const handleEditCourse = async () => {
    if (!editingCourse || !editTitle || !editStartDate) {
      toast({ title: "خطأ", description: "يرجى تعبئة الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${editingCourse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || null,
          startDate: editStartDate,
          endDate: editEndDate || null,
          status: editStatus,
          category: editCategory,
          maxStudents: editMaxStudents ? parseInt(editMaxStudents) : null,
          notes: editNotes || null,
        }),
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم تحديث الدورة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setEditDialogOpen(false);
        setEditingCourse(null);
        fetchCourses();
        if (!isStudent) fetchStats();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في تحديث الدورة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setEditSubmitting(false);
    }
  };

  const openEditDialog = (course: CourseData) => {
    setEditingCourse(course);
    setEditTitle(course.title);
    setEditDescription(course.description || "");
    setEditStartDate(course.startDate ? course.startDate.split("T")[0] : "");
    setEditEndDate(course.endDate ? course.endDate.split("T")[0] : "");
    setEditStatus(course.status);
    setEditCategory(course.category || "memorization");
    setEditMaxStudents(course.maxStudents ? String(course.maxStudents) : "");
    setEditNotes(course.notes || "");
    setEditDialogOpen(true);
  };

  const handleDuplicateCourse = async (courseId: string) => {
    setDuplicatingCourse(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم نسخ الدورة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        fetchCourses();
        if (!isStudent) fetchStats();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في نسخ الدورة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setDuplicatingCourse(null);
    }
  };

  const handleGraduate = async (courseId: string, studentIds: string[], graduationGrade?: string) => {
    if (studentIds.length === 0) return;
    const isAll = studentIds.length > 1;
    if (isAll) setGraduatingAll(courseId);
    else setGraduatingIds(studentIds);

    try {
      const res = await fetch(`/api/courses/${courseId}/graduate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentIds, graduationGrade: graduationGrade != null && graduationGrade !== "" ? graduationGrade : null }),
      });

      if (res.ok) {
        toast({ title: "🎓 تم التخريج بنجاح", description: `تم تخريج ${studentIds.length} طالب بنجاح`, className: "bg-green-50 border-green-200 text-green-800" });
        fetchCourses();
        fetchCertificates();
        if (!isStudent) fetchStats();
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

  const handleUngraduate = async (courseId: string, studentId: string) => {
    setUngraduatingId(studentId);
    try {
      const res = await fetch(`/api/courses/${courseId}/ungraduate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentId }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إلغاء التخريج", className: "bg-green-50 border-green-200 text-green-800" });
        fetchCourses();
        fetchCertificates();
        if (!isStudent) fetchStats();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إلغاء التخريج", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setUngraduatingId(null);
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
        if (!isStudent) fetchStats();
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الدورة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setDeletingCourse(null);
    }
  };

  const handleAddStudents = async () => {
    if (!addStudentsCourseId || addStudentIds.length === 0) return;
    setAddingStudents(true);
    try {
      const res = await fetch(`/api/courses/${addStudentsCourseId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentIds: addStudentIds }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تمت إضافة الطلاب", className: "bg-green-50 border-green-200 text-green-800" });
        setAddStudentsDialogOpen(false);
        setAddStudentIds([]);
        setAddStudentsCourseId(null);
        fetchCourses();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة الطلاب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setAddingStudents(false);
    }
  };

  const handleRemoveStudent = async (courseId: string, studentId: string) => {
    setRemovingStudentId(studentId);
    try {
      const res = await fetch(`/api/courses/${courseId}/students/${studentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تمت إزالة الطالب", className: "bg-green-50 border-green-200 text-green-800" });
        fetchCourses();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إزالة الطالب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setRemovingStudentId(null);
    }
  };

  const handleVerifyCertificate = async () => {
    if (!verifyCertNumber.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال رقم الشهادة", variant: "destructive" });
      return;
    }
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/certificates/verify/${verifyCertNumber.trim()}`);
      if (res.ok) {
        setVerifyResult(await res.json());
      } else {
        setVerifyResult({ valid: false, message: "لم يتم العثور على الشهادة" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setVerifyLoading(false);
    }
  };

  const fetchExtParticipants = async (courseId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/external-participants`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setExtParticipants(prev => ({ ...prev, [courseId]: data }));
      }
    } catch {}
  };

  const handleAddExtParticipant = async () => {
    if (!addExtCourseId || !extName.trim()) return;
    setAddingExt(true);
    try {
      const res = await fetch(`/api/courses/${addExtCourseId}/external-participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: extName.trim(), phone: extPhone || null, age: extAge ? parseInt(extAge) : null, notes: extNotes || null }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تمت إضافة المشارك الخارجي", className: "bg-green-50 border-green-200 text-green-800" });
        setAddExtDialogOpen(false);
        setExtName(""); setExtPhone(""); setExtAge(""); setExtNotes(""); setPhoneLookupResults([]);
        fetchExtParticipants(addExtCourseId);
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setAddingExt(false);
    }
  };

  const handleDeleteExtParticipant = async (courseId: string, participantId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/external-participants/${participantId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم", description: "تمت إزالة المشارك", className: "bg-green-50 border-green-200 text-green-800" });
        fetchExtParticipants(courseId);
      }
    } catch {}
  };

  const handleGraduateExtParticipant = async (courseId: string, participantId: string, grade?: string) => {
    setGraduatingExtId(participantId);
    try {
      const res = await fetch(`/api/courses/${courseId}/external-participants/${participantId}/graduate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ graduationGrade: grade || null }),
      });
      if (res.ok) {
        toast({ title: "🎓 تم التخريج", description: "تم تخريج المشارك الخارجي", className: "bg-green-50 border-green-200 text-green-800" });
        fetchExtParticipants(courseId);
      }
    } catch {} finally {
      setGraduatingExtId(null);
    }
  };

  const handleUngraduateExtParticipant = async (courseId: string, participantId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/external-participants/${participantId}/ungraduate`, { method: "POST", credentials: "include" });
      if (res.ok) fetchExtParticipants(courseId);
    } catch {}
  };

  const lookupByPhone = async (phone: string) => {
    if (!phone || phone.length < 3) { setPhoneLookupResults([]); return; }
    try {
      const res = await fetch(`/api/external-participants/lookup?phone=${encodeURIComponent(phone)}`, { credentials: "include" });
      if (res.ok) setPhoneLookupResults(await res.json());
    } catch {}
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

  const toggleAddStudent = (studentId: string) => {
    setAddStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
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

  const categoryBadge = (cat: string) => {
    const colorClass = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
    const label = CATEGORY_LABELS[cat] || cat;
    return <Badge className={colorClass}>{label}</Badge>;
  };

  const canDeleteCourse = (course: CourseData) => {
    return isSupervisor || isAdmin || course.createdBy === user?.id;
  };

  const canEditCourse = (course: CourseData) => {
    return isSupervisor || isAdmin || course.createdBy === user?.id;
  };

  const filteredCourses = useMemo(() => {
    let filtered = [...courses];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(c => c.title.toLowerCase().includes(q));
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(c => c.category === filterCategory);
    }

    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        break;
      case "title":
        filtered.sort((a, b) => a.title.localeCompare(b.title, "ar"));
        break;
    }

    return filtered;
  }, [courses, searchQuery, filterStatus, filterCategory, sortBy]);

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

  const buildCertificateHtml = (cert: CertificateData, courseName: string, studentName: string, studentId: string) => {
    const template = detectCertificateTemplate(studentId);
    const theme = getCertificateTheme(template);
    const decorations = getTemplateDecorations(template);
    const issuedDate = formatDateAr(cert.issuedAt);

    const gradeText = cert.graduationGrade && GRADE_LABELS[cert.graduationGrade]
      ? `<br /><span class="grade-text">بتقدير: ${GRADE_LABELS[cert.graduationGrade]}</span>`
      : "";

    const extraHtml = template === "female"
      ? `<div class="floral-border-top">❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀</div><div class="floral-border-bottom">❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀</div>`
      : template === "children"
      ? `<div class="star-row star-row-top">⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐</div><div class="star-row star-row-bottom">⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐</div>`
      : "";

    const certDate = new Date(cert.issuedAt);
    const gDay = String(certDate.getDate()).padStart(2, "0");
    const gMonth = String(certDate.getMonth() + 1).padStart(2, "0");
    const gYear = certDate.getFullYear();
    const gregorianStr = `${gDay}/${gMonth}/${gYear}`;
    const hijriParts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(certDate);
    const hDay = (hijriParts.find(p => p.type === "day")?.value || "").padStart(2, "0");
    const hMonth = (hijriParts.find(p => p.type === "month")?.value || "").padStart(2, "0");
    const hYear = hijriParts.find(p => p.type === "year")?.value || "";
    const hijriDate = `${hDay}/${hMonth}/${hYear} هـ`;

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
              <div class="cert-logos">
                ${mosqueData.image ? `<div class="cert-logo"><img src="${mosqueData.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" /></div>` : ""}
                <div class="cert-logo"><img src="/logo.png" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" /></div>
              </div>
              <div class="cert-system-name">${mosqueData.name || "مُتْقِن"}</div>
              <div class="cert-subtitle">نظام إدارة حلقات القرآن الكريم</div>
            </div>
            <div class="cert-title">
              <h1>${theme.titleLabel}</h1>
              <div class="underline-decoration"></div>
            </div>
            <div class="cert-body">
              <span class="cert-intro">تشهد إدارة <strong>${mosqueData.name || "المركز"}</strong> بأن الطالب</span>
              <span class="student-name">${studentName}</span>
              <span class="cert-text">قد حضر دورة</span>
              <span class="course-name">${courseName}</span>
              ${gradeText}
              <span class="cert-text" style="display:block;margin-top:8px;font-style:italic;color:#666;">نسأل الله أن يوفقنا وإياه لخدمة دينه وكتابه</span>
            </div>
            <div class="cert-details">
              <div class="cert-detail-item">
                <div class="cert-detail-label">رقم الشهادة</div>
                <div class="cert-detail-value">${cert.certificateNumber}</div>
              </div>
              <div class="cert-detail-item">
                <div class="cert-detail-label">التاريخ الهجري</div>
                <div class="cert-detail-value">${hijriDate}</div>
              </div>
              <div class="cert-detail-item">
                <div class="cert-detail-label">التاريخ الميلادي</div>
                <div class="cert-detail-value">${gregorianStr}</div>
              </div>
            </div>
            <div class="cert-signatures">
              <div class="cert-signature">
                <div class="stamp-circle">الختم</div>
                <div class="label">ختم المؤسسة</div>
              </div>
              <div class="cert-signature">
                <div class="line"></div>
                <div class="label">توقيع المشرف</div>
              </div>
              <div class="cert-signature">
                <div class="line"></div>
                <div class="label">توقيع الأستاذ</div>
              </div>
            </div>
            <div class="cert-footer">
              <div class="cert-qr-note">النظام وقف لله تعالى • برمجة وتطوير أحمد خالد الزبيدي</div>
            </div>
          </div>
        </div>
      </div>
    `;

    return { certHtml, theme, decorations };
  };

  const getCertificateStyles = (theme: ReturnType<typeof getCertificateTheme>, decorations: ReturnType<typeof getTemplateDecorations>) => {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif; direction: rtl; background: #f0f0f0; display: flex; flex-direction: column; align-items: center; padding: 20px; }
      .actions-bar { position: fixed; top: 0; left: 0; right: 0; background: ${theme.actionBarBg}; color: white; padding: 10px 20px; display: flex; gap: 10px; justify-content: center; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
      .actions-bar button { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-family: 'Tajawal', sans-serif; font-size: 14px; font-weight: 500; }
      .btn-print { background: ${theme.btnPrint}; color: white; }
      .btn-save { background: ${theme.btnSave}; color: white; }
      .btn-close { background: #555; color: white; }
      .cert-area { margin-top: 0; }
      .cert-container { width: 29.7cm; height: 21cm; margin: 0 auto; position: relative; padding: 0; background: white; page-break-after: always; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
      @media print { .cert-area { margin: 0; } .cert-container { box-shadow: none; } }
      .cert-frame { border: 3px solid ${theme.primary}; padding: 30px 40px 25px; position: relative; background: ${theme.bg}; width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; }
      ${decorations.extraFrame}
      ${decorations.cornerStyle}
      ${decorations.watermark}
      .cert-content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; justify-content: center; }
      .cert-header { text-align: center; margin-bottom: 8px; }
      .bismillah { font-size: 26px; color: ${theme.accent}; margin-bottom: 6px; font-family: 'Scheherazade New', 'Amiri', serif; }
      .cert-logos { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 6px; }
      .cert-logo { width: 50px; height: 50px; background: ${theme.primary}; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 700; overflow: hidden; }
      .cert-system-name { font-size: 18px; font-weight: 700; color: ${theme.primary}; }
      .cert-subtitle { font-size: 11px; color: #888; margin-top: 2px; }
      .cert-title { text-align: center; margin: 6px 0 8px; }
      .cert-title h1 { font-size: 32px; font-weight: 700; color: ${theme.accent}; margin: 0; letter-spacing: 3px; text-shadow: 1px 1px 2px rgba(0,0,0,0.08); font-family: 'Scheherazade New', 'Amiri', serif; }
      .cert-title .underline-decoration { width: 180px; height: 3px; background: linear-gradient(to right, transparent, ${theme.accent}, transparent); margin: 6px auto 0; }
      .cert-body { text-align: center; margin: 8px 0; font-size: 16px; line-height: 1.8; color: #333; display: flex; flex-direction: column; align-items: center; gap: 2px; }
      .cert-body .cert-intro { font-size: 14px; color: #666; }
      .cert-body .cert-text { font-size: 14px; color: #555; }
      .cert-body .student-name { font-size: 28px; font-weight: 700; color: ${theme.primary}; border-bottom: 2px solid ${theme.accent}; padding-bottom: 3px; display: inline-block; margin: 4px 0; font-family: 'Scheherazade New', 'Amiri', serif; }
      .cert-body .course-name { font-size: 19px; font-weight: 700; color: ${theme.secondary}; display: inline-block; margin: 3px 0; }
      .cert-body .grade-text { font-size: 20px; font-weight: 700; color: ${theme.accent}; display: inline-block; margin: 3px 0; }
      .cert-details { display: flex; justify-content: center; gap: 30px; margin: 8px 0; padding: 10px 20px; background: ${theme.detailBg}; border-radius: 8px; border: 1px solid ${theme.detailBorder}; }
      .cert-detail-item { text-align: center; min-width: 100px; }
      .cert-detail-label { font-size: 10px; color: #999; margin-bottom: 3px; }
      .cert-detail-value { font-size: 12px; font-weight: 700; color: ${theme.primary}; }
      .cert-signatures { display: flex; justify-content: space-between; margin-top: auto; padding-top: 10px; }
      .cert-signature { text-align: center; min-width: 140px; }
      .cert-signature .line { width: 120px; border-top: 1px solid #999; margin: 0 auto 6px; }
      .cert-signature .stamp-circle { width: 50px; height: 50px; border: 1.5px solid #ccc; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #bbb; }
      .cert-signature .label { font-size: 11px; color: #777; }
      .cert-footer { text-align: center; margin-top: 8px; padding-top: 6px; border-top: 1px solid ${theme.detailBorder}; }
      .cert-qr-note { font-size: 9px; color: #bbb; }
      @media print {
        .actions-bar { display: none !important; }
        .cert-area { margin-top: 0; }
        body { padding: 0; background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .cert-container { max-width: none; box-shadow: none; }
        @page { size: 29.7cm 21cm landscape; margin: 0; }
      }
    `;
  };

  const printCertificate = (cert: CertificateData, courseName: string, studentName: string, studentId: string) => {
    const { certHtml, theme, decorations } = buildCertificateHtml(cert, courseName, studentName, studentId);
    const styles = getCertificateStyles(theme, decorations);
    const contentHtml = `<style>${styles}</style><div class="cert-area">${certHtml}</div>`;
    openPrintPreview({ title: `شهادة إتمام - ${studentName}`, contentHtml, orientation: "landscape", showHeader: false, showFooter: false });
  };

  const printAllCertificates = (course: CourseData) => {
    const graduatedStudents = course.students?.filter(s => s.graduated) || [];
    if (graduatedStudents.length === 0 || !course.certificates || course.certificates.length === 0) {
      toast({ title: "تنبيه", description: "لا توجد شهادات لطباعتها", variant: "destructive" });
      return;
    }

    const allCertHtmlParts: string[] = [];
    let lastTheme = getCertificateTheme("male");
    let lastDecorations = getTemplateDecorations("male");

    for (const cs of graduatedStudents) {
      const cert = course.certificates.find(c => c.studentId === cs.studentId);
      if (!cert) continue;
      const sName = cs.studentName || getStudentName(cs.studentId);
      const { certHtml, theme, decorations } = buildCertificateHtml(cert, course.title, sName, cs.studentId);
      allCertHtmlParts.push(certHtml);
      lastTheme = theme;
      lastDecorations = decorations;
    }

    if (allCertHtmlParts.length === 0) return;

    const styles = getCertificateStyles(lastTheme, lastDecorations);
    const contentHtml = `<style>${styles}</style><div class="cert-area">${allCertHtmlParts.join("")}</div>`;
    openPrintPreview({ title: `شهادات دورة - ${course.title}`, contentHtml, orientation: "landscape", showHeader: false, showFooter: false });
  };

  const handlePrint = async (cert: CertificateData) => {
    const studentName = getStudentName(cert.studentId);
    const courseName = getCourseName(cert.courseId);
    await generateCertificatePdf({
      studentName,
      courseName,
      mosqueName: mosqueData.name || "مركز التحفيظ",
      certificateNumber: cert.certificateNumber,
      graduationGrade: cert.graduationGrade ?? undefined,
      issuedAt: cert.issuedAt,
    });
  };

  const getProgressPercent = (course: CourseData) => {
    const total = course.students?.length || 0;
    if (total === 0) return 0;
    const graduated = course.students?.filter(s => s.graduated).length || 0;
    return Math.round((graduated / total) * 100);
  };

  return (
    <div className={embedded ? "space-y-4" : "p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 page-transition"}>
      <div className={embedded ? "flex justify-end" : "flex flex-col md:flex-row justify-between items-start md:items-center gap-3"}>
        {!embedded && (
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-courses">الدورات والشهادات</h1>
            <p className="text-muted-foreground text-sm">
              {isTeacher && "إدارة الدورات وتخريج الطلاب"}
              {isSupervisor && "إدارة جميع الدورات في الجامع/المركز"}
              {isStudent && "دوراتي وشهاداتي"}
              {isAdmin && "إدارة الدورات والشهادات"}
            </p>
          </div>
        </div>
        )}
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">التصنيف</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="اختر التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key} data-testid={`option-category-${key}`}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <label className="text-sm font-medium">الحد الأقصى للطلاب</label>
                  <Input
                    data-testid="input-max-students"
                    type="number"
                    value={maxStudents}
                    onChange={e => setMaxStudents(e.target.value)}
                    placeholder="اختياري"
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">ملاحظات</label>
                  <Textarea
                    data-testid="input-course-notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="ملاحظات إضافية (اختياري)"
                    rows={2}
                  />
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

                <div className="space-y-2 border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      مشاركون خارجيون
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setCreateExtList(prev => [...prev, { tempId: String(Date.now() + Math.random()), name: "", phone: "", age: "" }])}
                    >
                      <Plus className="w-3 h-3" />
                      إضافة
                    </Button>
                  </div>
                  {createExtList.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">لا يوجد مشاركون خارجيون — اضغط إضافة لإدراجهم</p>
                  ) : (
                    <div className="space-y-2">
                      {createExtList.map((ext, idx) => (
                        <div key={ext.tempId} className="flex items-center gap-1.5">
                          <Input
                            placeholder="الاسم *"
                            value={ext.name}
                            onChange={e => setCreateExtList(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                            className="h-8 text-sm flex-1"
                          />
                          <Input
                            placeholder="الجوال"
                            value={ext.phone}
                            onChange={e => setCreateExtList(prev => prev.map((p, i) => i === idx ? { ...p, phone: e.target.value } : p))}
                            className="h-8 text-sm w-24"
                          />
                          <Input
                            placeholder="العمر"
                            type="number"
                            value={ext.age}
                            onChange={e => setCreateExtList(prev => prev.map((p, i) => i === idx ? { ...p, age: e.target.value } : p))}
                            className="h-8 text-sm w-16"
                            min={1}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setCreateExtList(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">{createExtList.length} مشارك خارجي</p>
                    </div>
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

      {!embedded && !isStudent && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="stats-cards">
          <Card data-testid="stat-total-courses">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الدورات</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalCourses}</p>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-active-courses">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الدورات النشطة</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeCourses}</p>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-graduated-students">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الطلاب المتخرجون</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalGraduated}</p>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-graduation-rate">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">نسبة التخريج</p>
                <p className="text-2xl font-bold text-amber-600">{stats.graduationRate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="courses" dir="rtl">
        {!embedded && (
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="courses" data-testid="tab-courses">
            <BookOpen className="w-4 h-4 ml-1" />
            الدورات
          </TabsTrigger>
          <TabsTrigger value="certificates" data-testid="tab-certificates">
            <Award className="w-4 h-4 ml-1" />
            شهاداتي
          </TabsTrigger>
          <TabsTrigger value="verify" data-testid="tab-verify">
            <Shield className="w-4 h-4 ml-1" />
            التحقق من شهادة
          </TabsTrigger>
        </TabsList>
        )}

        <TabsContent value="courses" className={embedded ? "mt-0 space-y-4" : "mt-4 space-y-4"}>
          <div className="flex flex-col md:flex-row gap-3" data-testid="search-filter-bar">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-search-courses"
                className="pr-9"
                placeholder="بحث بعنوان الدورة..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-filter-status">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشطة</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-filter-category">
                <SelectValue placeholder="التصنيف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-filter-level">
                <SelectValue placeholder="المستوى" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">المستوى - الكل</SelectItem>
                <SelectItem value="1">المستوى الأول (الجزء 30-26)</SelectItem>
                <SelectItem value="2">المستوى الثاني (الجزء 25-21)</SelectItem>
                <SelectItem value="3">المستوى الثالث (الجزء 20-16)</SelectItem>
                <SelectItem value="4">المستوى الرابع (الجزء 15-11)</SelectItem>
                <SelectItem value="5">المستوى الخامس (الجزء 10-6)</SelectItem>
                <SelectItem value="6">المستوى السادس (الجزء 5-1)</SelectItem>
                <SelectItem value="7">حافظ (30 جزء)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-sort-by">
                <SelectValue placeholder="الترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="oldest">الأقدم</SelectItem>
                <SelectItem value="title">العنوان</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="status-loading-courses">
              <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
              <span>جاري التحميل...</span>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12" data-testid="status-empty-courses">
              <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-lg">لا توجد دورات</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredCourses.map(course => {
                const progressPercent = getProgressPercent(course);
                return (
                  <Card
                    key={course.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${expandedCourseId === course.id ? "ring-2 ring-primary" : ""} ${(extParticipants[course.id] || []).length > 0 ? "border-r-4 border-r-orange-400" : ""}`}
                    data-testid={`card-course-${course.id}`}
                    onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg leading-tight" data-testid={`text-course-title-${course.id}`}>
                            {course.title}
                          </CardTitle>
                          {(extParticipants[course.id] || []).length > 0 && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 gap-1 shrink-0 text-xs">
                              <Globe className="w-3 h-3" />
                              خارجية
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {statusBadge(course.status)}
                          {canEditCourse(course) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`button-edit-course-${course.id}`}
                              onClick={(e) => { e.stopPropagation(); openEditDialog(course); }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
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
                      <div className="flex items-center gap-2 mt-1">
                        {categoryBadge(course.category)}
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

                      {(course.students?.length || 0) > 0 && (
                        <div className="space-y-1" data-testid={`progress-bar-${course.id}`}>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>التقدم</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                      )}

                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        {(canCreate || isAdmin) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1"
                            data-testid={`button-duplicate-course-${course.id}`}
                            disabled={duplicatingCourse === course.id}
                            onClick={() => handleDuplicateCourse(course.id)}
                          >
                            {duplicatingCourse === course.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                            نسخ
                          </Button>
                        )}
                        {(canCreate || isAdmin) && course.certificates && course.certificates.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1"
                            data-testid={`button-print-all-certs-${course.id}`}
                            onClick={() => printAllCertificates(course)}
                          >
                            <Printer className="w-3 h-3" />
                            طباعة الكل
                          </Button>
                        )}
                      </div>

                      {expandedCourseId === course.id && (
                        <div className="border-t pt-3 mt-3 space-y-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              الطلاب المسجلين ({course.students?.length || 0})
                            </h4>
                            {(canCreate || isAdmin) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1"
                                data-testid={`button-add-students-${course.id}`}
                                onClick={() => {
                                  setAddStudentsCourseId(course.id);
                                  setAddStudentIds([]);
                                  setAddStudentsDialogOpen(true);
                                }}
                              >
                                <UserPlus className="w-3 h-3" />
                                إضافة طلاب
                              </Button>
                            )}
                          </div>

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
                                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                                      {cs.graduated ? (
                                        <>
                                          <Badge className="bg-green-100 text-green-700 border-none gap-1" data-testid={`status-graduated-${cs.studentId}`}>
                                            <CheckCircle className="w-3 h-3" />
                                            متخرج
                                            {cs.graduationGrade && GRADE_LABELS[cs.graduationGrade] && (
                                              <span className="mr-1">({GRADE_LABELS[cs.graduationGrade]})</span>
                                            )}
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
                                          {(canCreate || isAdmin) && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-xs gap-1 h-7 text-orange-600 hover:text-orange-700"
                                              data-testid={`button-ungraduate-${cs.studentId}`}
                                              disabled={ungraduatingId === cs.studentId}
                                              onClick={() => handleUngraduate(course.id, cs.studentId)}
                                            >
                                              {ungraduatingId === cs.studentId ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                              ) : (
                                                <RotateCcw className="w-3 h-3" />
                                              )}
                                            </Button>
                                          )}
                                        </>
                                      ) : (canCreate || isAdmin) ? (
                                        <div className="flex items-center gap-1">
                                          <Select
                                            value={graduationGrades[cs.studentId] || "excellent"}
                                            onValueChange={(val) => setGraduationGrades(prev => ({ ...prev, [cs.studentId]: val }))}
                                          >
                                            <SelectTrigger className="h-7 text-xs w-24" data-testid={`select-grade-${cs.studentId}`}>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {Object.entries(GRADE_LABELS).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs gap-1 h-7"
                                            data-testid={`button-graduate-${cs.studentId}`}
                                            disabled={graduatingIds.includes(cs.studentId)}
                                            onClick={() => handleGraduate(course.id, [cs.studentId], graduationGrades[cs.studentId] || "excellent")}
                                          >
                                            {graduatingIds.includes(cs.studentId) ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <>تخريج 👨‍🎓</>
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs h-7 text-destructive hover:text-destructive"
                                            data-testid={`button-remove-student-${cs.studentId}`}
                                            disabled={removingStudentId === cs.studentId}
                                            onClick={() => handleRemoveStudent(course.id, cs.studentId)}
                                          >
                                            {removingStudentId === cs.studentId ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <UserMinus className="w-3 h-3" />
                                            )}
                                          </Button>
                                        </div>
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
                                    handleGraduate(course.id, nonGraduated, "excellent");
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

                          {/* External Participants Section */}
                          {(canCreate || isAdmin) && (
                          <div className="border-t pt-3 mt-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm flex items-center gap-1 text-blue-700">
                                <Globe className="w-4 h-4" />
                                المشاركون الخارجيون ({(extParticipants[course.id] || []).length})
                              </h4>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => { setAddExtCourseId(course.id); setAddExtDialogOpen(true); }}
                              >
                                <UserPlus className="w-3 h-3" />
                                إضافة خارجي
                              </Button>
                            </div>
                            {(extParticipants[course.id] || []).length > 0 ? (
                              <div className="space-y-2">
                                {(extParticipants[course.id] || []).map((ep: any) => (
                                  <div key={ep.id} className="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg border border-blue-100 gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                                          {ep.name.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium truncate">{ep.name}</span>
                                        {ep.graduated && (
                                          <Badge className="bg-green-100 text-green-700 border-none text-xs gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            متخرج
                                          </Badge>
                                        )}
                                      </div>
                                      {(ep.phone || ep.age) && (
                                        <div className="flex items-center gap-3 mt-0.5 pr-8 text-xs text-muted-foreground">
                                          {ep.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{ep.phone}</span>}
                                          {ep.age && <span>{ep.age} سنة</span>}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {ep.graduated ? (
                                        <>
                                          {ep.graduation_grade && GRADE_LABELS[ep.graduation_grade] && (
                                            <Badge className="bg-amber-100 text-amber-700 border-none text-xs">{GRADE_LABELS[ep.graduation_grade]}</Badge>
                                          )}
                                          {ep.certificate_number && (
                                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                                              onClick={() => {
                                                const certHtml = generateCertificateHtml({
                                                  certificateNumber: ep.certificate_number,
                                                  graduationGrade: ep.graduation_grade,
                                                  issuedAt: ep.graduated_at,
                                                  mosqueImage: mosqueData.image || undefined,
                                                  theme: getCertificateTheme("children"),
                                                  decorations: getTemplateDecorations("children"),
                                                }, ep.name, course.title, mosqueData.name || "مركز التحفيظ");
                                                openPrintPreview({ title: "شهادة", contentHtml: certHtml, orientation: "landscape", showHeader: false, showFooter: false });
                                              }}>
                                              <Printer className="w-3 h-3" />شهادة
                                            </Button>
                                          )}
                                          <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600 hover:text-amber-700"
                                            onClick={() => handleUngraduateExtParticipant(course.id, ep.id)}>
                                            <RotateCcw className="w-3 h-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Select
                                            value={extGradeMap[ep.id] || ""}
                                            onValueChange={v => setExtGradeMap(prev => ({ ...prev, [ep.id]: v }))}
                                          >
                                            <SelectTrigger className="h-7 text-xs w-24">
                                              <SelectValue placeholder="التقدير" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {Object.entries(GRADE_LABELS).map(([k, v]) => (
                                                <SelectItem key={k} value={k}>{v}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                                            disabled={graduatingExtId === ep.id}
                                            onClick={() => handleGraduateExtParticipant(course.id, ep.id, extGradeMap[ep.id])}>
                                            {graduatingExtId === ep.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <GraduationCap className="w-3 h-3" />}
                                            تخريج
                                          </Button>
                                        </>
                                      )}
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteExtParticipant(course.id, ep.id)}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground py-1 text-blue-600/60">لا يوجد مشاركون خارجيون — يمكن إضافة أشخاص من خارج المنظومة</p>
                            )}
                          </div>
                        )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {!embedded && <TabsContent value="certificates" className="mt-4">
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
                    {cert.graduationGrade && GRADE_LABELS[cert.graduationGrade] && (
                      <div className="text-sm flex justify-between">
                        <span className="text-muted-foreground">التقدير:</span>
                        <Badge className="bg-amber-100 text-amber-700 border-none" data-testid={`text-cert-grade-${cert.id}`}>
                          {GRADE_LABELS[cert.graduationGrade]}
                        </Badge>
                      </div>
                    )}
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
        </TabsContent>}

        {!embedded && <TabsContent value="verify" className="mt-4">
          <Card data-testid="card-verify-certificate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                التحقق من شهادة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  data-testid="input-verify-cert-number"
                  placeholder="أدخل رقم الشهادة"
                  value={verifyCertNumber}
                  onChange={e => setVerifyCertNumber(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleVerifyCertificate()}
                  className="flex-1"
                />
                <Button
                  onClick={handleVerifyCertificate}
                  disabled={verifyLoading}
                  data-testid="button-verify-cert"
                >
                  {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="mr-1">تحقق</span>
                </Button>
              </div>

              {verifyResult && (
                <div data-testid="verify-result" className={`p-4 rounded-lg border ${verifyResult.valid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {verifyResult.valid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-bold ${verifyResult.valid ? "text-green-700" : "text-red-700"}`}>
                      {verifyResult.valid ? "شهادة صالحة ✓" : "شهادة غير صالحة ✗"}
                    </span>
                  </div>
                  {verifyResult.valid && (
                    <div className="space-y-2 text-sm">
                      {verifyResult.certificateNumber && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رقم الشهادة:</span>
                          <span className="font-mono" data-testid="verify-cert-number">{verifyResult.certificateNumber}</span>
                        </div>
                      )}
                      {verifyResult.studentName && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">اسم الطالب:</span>
                          <span data-testid="verify-student-name">{verifyResult.studentName}</span>
                        </div>
                      )}
                      {verifyResult.courseName && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">اسم الدورة:</span>
                          <span data-testid="verify-course-name">{verifyResult.courseName}</span>
                        </div>
                      )}
                      {verifyResult.graduationGrade && GRADE_LABELS[verifyResult.graduationGrade] && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">التقدير:</span>
                          <span data-testid="verify-grade">{GRADE_LABELS[verifyResult.graduationGrade]}</span>
                        </div>
                      )}
                      {verifyResult.issuedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">تاريخ الإصدار:</span>
                          <span data-testid="verify-issued-at">{formatDate(verifyResult.issuedAt)}</span>
                        </div>
                      )}
                      {verifyResult.issuerName && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">صدرت بواسطة:</span>
                          <span data-testid="verify-issuer">{verifyResult.issuerName}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {verifyResult.message && !verifyResult.valid && (
                    <p className="text-sm text-red-600 mt-2" data-testid="verify-message">{verifyResult.message}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>}
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingCourse(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الدورة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">عنوان الدورة *</label>
              <Input
                data-testid="input-edit-course-title"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">وصف الدورة</label>
              <Textarea
                data-testid="input-edit-course-description"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">التصنيف</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger data-testid="select-edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الحالة</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="completed">مكتملة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ البداية *</label>
                <Input
                  data-testid="input-edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={e => setEditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ النهاية</label>
                <Input
                  data-testid="input-edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={e => setEditEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الحد الأقصى للطلاب</label>
              <Input
                data-testid="input-edit-max-students"
                type="number"
                value={editMaxStudents}
                onChange={e => setEditMaxStudents(e.target.value)}
                placeholder="اختياري"
                min={1}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات</label>
              <Textarea
                data-testid="input-edit-notes"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              onClick={handleEditCourse}
              disabled={editSubmitting}
              className="w-full"
              data-testid="button-submit-edit-course"
            >
              {editSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              حفظ التعديلات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addStudentsDialogOpen} onOpenChange={(open) => { setAddStudentsDialogOpen(open); if (!open) { setAddStudentIds([]); setAddStudentsCourseId(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة طلاب للدورة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {(() => {
              const course = courses.find(c => c.id === addStudentsCourseId);
              const existingIds = course?.students?.map(s => s.studentId) || [];
              const available = allStudents.filter(s => !existingIds.includes(s.id));

              if (available.length === 0) {
                return <p className="text-sm text-muted-foreground py-4 text-center">لا يوجد طلاب إضافيين</p>;
              }

              return (
                <>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {available.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <Checkbox
                          data-testid={`checkbox-add-student-${s.id}`}
                          checked={addStudentIds.includes(s.id)}
                          onCheckedChange={() => toggleAddStudent(s.id)}
                        />
                        <span className="text-sm">{s.name}</span>
                      </div>
                    ))}
                  </div>
                  {addStudentIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      تم اختيار {addStudentIds.length} طالب
                    </p>
                  )}
                </>
              );
            })()}

            <Button
              onClick={handleAddStudents}
              disabled={addingStudents || addStudentIds.length === 0}
              className="w-full"
              data-testid="button-submit-add-students"
            >
              {addingStudents && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              إضافة الطلاب المحددين
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add External Participant Dialog */}
      <Dialog open={addExtDialogOpen} onOpenChange={(open) => { setAddExtDialogOpen(open); if (!open) { setExtName(""); setExtPhone(""); setExtAge(""); setExtNotes(""); setPhoneLookupResults([]); } }}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <Globe className="w-5 h-5" />
              إضافة مشارك خارجي
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">رقم الجوال <span className="text-muted-foreground text-xs">(للبحث التلقائي)</span></label>
              <div className="relative">
                <Input
                  placeholder="05XXXXXXXX"
                  value={extPhone}
                  onChange={e => { setExtPhone(e.target.value); lookupByPhone(e.target.value); }}
                  className="text-left"
                  dir="ltr"
                />
                {phoneLookupResults.length > 0 && (
                  <div className="absolute top-full z-50 w-full mt-1 bg-white border rounded-lg shadow-lg divide-y text-sm">
                    {phoneLookupResults.map((r: any, i: number) => (
                      <button
                        key={i}
                        className="w-full text-right px-3 py-2 hover:bg-blue-50 flex items-center justify-between"
                        onClick={() => { setExtName(r.name); setExtPhone(r.phone); if (r.age) setExtAge(String(r.age)); setPhoneLookupResults([]); }}
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground text-xs">{r.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">الاسم *</label>
              <Input placeholder="اسم المشارك" value={extName} onChange={e => setExtName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">العمر</label>
              <Input type="number" placeholder="مثال: 25" value={extAge} onChange={e => setExtAge(e.target.value)} min={1} max={120} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">ملاحظات</label>
              <Input placeholder="اختياري" value={extNotes} onChange={e => setExtNotes(e.target.value)} />
            </div>
            <Button
              onClick={handleAddExtParticipant}
              disabled={addingExt || !extName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {addingExt && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              إضافة المشارك
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
