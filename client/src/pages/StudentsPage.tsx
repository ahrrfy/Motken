import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Search, Download, Plus, Printer, Upload, Loader2, ArrowRightLeft, GraduationCap, Camera, MessageCircle, X, Users, UserCheck, Heart, Shield, Eye, Archive, CheckSquare, BarChart3, TrendingUp, SortAsc, FileText, Star, Award, Clock, CheckCircle, XCircle, AlertTriangle, PhoneCall, Monitor, Repeat } from "lucide-react";
import { isValidPhone, getWhatsAppUrl, usePhoneValidation, phoneInputClassName } from "@/lib/phone-utils";
import { InternationalPhoneInput } from "@/components/international-phone-input";
import { useAuth } from "@/lib/auth-context";
import { openPrintWindow } from "@/lib/print-utils";
import { useToast } from "@/hooks/use-toast";
import { exportJsonToExcel, readExcelFile } from "@/lib/excel-utils";
import { formatDateAr } from "@/lib/utils";
import UsernameInput from "@/components/UsernameInput";
import CredentialsShareDialog from "@/components/CredentialsShareDialog";

interface Student {
  id: string;
  username: string;
  name: string;
  role: string;
  mosqueId?: string | null;
  teacherId?: string | null;
  phone?: string;
  address?: string;
  avatar?: string;
  gender?: string | null;
  age?: number | null;
  telegramId?: string | null;
  parentPhone?: string | null;
  educationLevel?: string | null;
  level?: number | null;
  isChild?: boolean;
  isSpecialNeeds?: boolean;
  isOrphan?: boolean;
  isActive: boolean;
  adminNotes?: string | null;
  studyMode?: string;
  createdAt?: string | null;
}

interface Teacher {
  id: string;
  name: string;
  username: string;
}

interface ProfileStats {
  attendance: { total: number; present: number; absent: number; rate: number };
  points: { total: number };
  assignments: { total: number; done: number; pending: number; completionRate: number };
  badges: { total: number; list: any[] };
}

const LEVEL_NAMES: Record<number, string> = { 1: "المستوى الأول", 2: "المستوى الثاني", 3: "المستوى الثالث", 4: "المستوى الرابع", 5: "المستوى الخامس", 6: "المستوى السادس", 7: "حافظ" };
const LEVEL_COLORS: Record<number, string> = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-emerald-100 text-emerald-700",
  4: "bg-purple-100 text-purple-700",
  5: "bg-orange-100 text-orange-700",
  6: "bg-yellow-100 text-yellow-800",
  7: "bg-green-100 text-green-800",
};
const LEVEL_RANGES: Record<number, string> = { 1: "الجزء 30-26", 2: "الجزء 25-21", 3: "الجزء 20-16", 4: "الجزء 15-11", 5: "الجزء 10-6", 6: "الجزء 5-1", 7: "حافظ (30 جزء)" };

function getStudentLevel(student: Student): { label: string; color: string; level: number } {
  const lv = student.level || 1;
  return { label: LEVEL_NAMES[lv] || "المستوى الأول", color: LEVEL_COLORS[lv] || LEVEL_COLORS[1], level: lv };
}

export default function StudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSpecialNeeds, setFilterSpecialNeeds] = useState("all");
  const [filterOrphan, setFilterOrphan] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newTeacherId, setNewTeacherId] = useState("");
  const [formData, setFormData] = useState({
    name: "", username: "", password: "", phone: "", address: "", avatar: "", gender: "male",
    age: "", telegramId: "", parentPhone: "", educationLevel: "", level: "1", isChild: false, isSpecialNeeds: false, isOrphan: false, studyMode: "in-person"
  });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [credentialsDialog, setCredentialsDialog] = useState<{ open: boolean; name: string; username: string; password: string; phone: string; role: string } | null>(null);
  const phoneValidation = usePhoneValidation(formData.phone, selectedStudent?.id);
  const parentPhoneValidation = usePhoneValidation(formData.parentPhone, selectedStudent?.id, "parent");

  const [sortBy, setSortBy] = useState("name");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [filterStudyMode, setFilterStudyMode] = useState("all");
  const [batchStudyModeLoading, setBatchStudyModeLoading] = useState(false);

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [commLogOpen, setCommLogOpen] = useState(false);
  const [commLogStudent, setCommLogStudent] = useState<Student | null>(null);
  const [commLogs, setCommLogs] = useState<any[]>([]);
  const [commLogsLoading, setCommLogsLoading] = useState(false);
  const [commLogForm, setCommLogForm] = useState({ method: "whatsapp", subject: "", notes: "", parentPhone: "" });
  const [commLogSubmitting, setCommLogSubmitting] = useState(false);

  const openCommLog = async (student: Student) => {
    setCommLogStudent(student);
    setCommLogForm({ method: "whatsapp", subject: "", notes: "", parentPhone: student.parentPhone || "" });
    setCommLogOpen(true);
    setCommLogsLoading(true);
    try {
      const res = await fetch(`/api/communication-log/${student.id}`, { credentials: "include" });
      if (res.ok) setCommLogs(await res.json());
      else setCommLogs([]);
    } catch {
      setCommLogs([]);
    } finally {
      setCommLogsLoading(false);
    }
  };

  const handleAddCommLog = async () => {
    if (!commLogStudent || !commLogForm.subject) {
      toast({ title: "خطأ", description: "الموضوع مطلوب", variant: "destructive" });
      return;
    }
    setCommLogSubmitting(true);
    try {
      const res = await fetch("/api/communication-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentId: commLogStudent.id, ...commLogForm }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم تسجيل التواصل", className: "bg-green-50 border-green-200 text-green-800" });
        setCommLogForm({ method: "whatsapp", subject: "", notes: "", parentPhone: commLogStudent.parentPhone || "" });
        const logsRes = await fetch(`/api/communication-log/${commLogStudent.id}`, { credentials: "include" });
        if (logsRes.ok) setCommLogs(await logsRes.json());
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في التسجيل", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setCommLogSubmitting(false);
    }
  };

  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectStudentId, setRejectStudentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pendingActionLoading, setPendingActionLoading] = useState<string | null>(null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى اختيار ملف صورة", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      if (base64.length > 500000) {
        toast({ title: "خطأ", description: "حجم الصورة كبير جداً (الحد الأقصى ~375KB)", variant: "destructive" });
        return;
      }
      setFormData(prev => ({ ...prev, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const isSupervisor = user?.role === "supervisor";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readExcelFile(file);
      let success = 0;
      let failed = 0;
      for (const row of rows) {
        try {
          const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: row["الاسم"] || "",
              username: row["اسم المستخدم"] || "",
              password: row["كلمة المرور"] || "",
              phone: row["الهاتف"] || "",
              address: row["العنوان"] || "",
              age: row["العمر"] ? parseInt(row["العمر"]) : null,
              parentPhone: row["هاتف ولي الأمر"] || "",
              telegramId: row["التلغرام"] || "",
              educationLevel: row["المستوى الدراسي"] || "",
              role: "student",
            }),
          });
          if (res.ok) success++;
          else failed++;
        } catch {
          failed++;
        }
      }
      toast({
        title: "نتيجة الاستيراد",
        description: `تم استيراد ${success} طالب بنجاح${failed > 0 ? `، فشل ${failed}` : ""}`,
        className: failed === 0 ? "bg-green-50 border-green-200 text-green-800" : undefined,
        variant: failed > 0 && success === 0 ? "destructive" : undefined,
      });
      if (success > 0) fetchData();
    } catch {
      toast({ title: "خطأ", description: "فشل في قراءة الملف", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fetchData = async () => {
    try {
      const [studentsRes, teachersRes] = await Promise.all([
        fetch("/api/users?role=student", { credentials: "include" }),
        isSupervisor ? fetch("/api/users?role=teacher", { credentials: "include" }) : Promise.resolve(null),
      ]);
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (teachersRes?.ok) setTeachers(await teachersRes.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingStudents = async () => {
    if (!isSupervisor) return;
    try {
      const res = await fetch("/api/users/pending-approval", { credentials: "include" });
      if (res.ok) setPendingStudents(await res.json());
    } catch {}
  };

  const handleApprove = async (id: string) => {
    setPendingActionLoading(id);
    try {
      const res = await fetch(`/api/users/${id}/approve`, { method: "POST", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تمت الموافقة على الطالب", className: "bg-green-50 border-green-200 text-green-800" });
        fetchPendingStudents();
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في الموافقة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setPendingActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectStudentId) return;
    setPendingActionLoading(rejectStudentId);
    try {
      const res = await fetch(`/api/users/${rejectStudentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم رفض الطالب", className: "bg-red-50 border-red-200 text-red-800" });
        setRejectDialogOpen(false);
        setRejectStudentId(null);
        setRejectReason("");
        fetchPendingStudents();
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في الرفض", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setPendingActionLoading(null);
    }
  };

  useEffect(() => { fetchData(); fetchPendingStudents(); }, []);

  const handleExport = () => {
    const studentsToExport = selectedStudents.size > 0
      ? filteredStudents.filter(s => selectedStudents.has(s.id))
      : filteredStudents;
    exportJsonToExcel(
      studentsToExport.map(s => {
        const level = getStudentLevel(s);
        return {
          الاسم: s.name,
          الهاتف: s.phone || "",
          العمر: s.age || "",
          "هاتف ولي الأمر": s.parentPhone || "",
          التلغرام: s.telegramId || "",
          "المستوى الدراسي": s.educationLevel || "",
          "مستوى الطالب": level.label,
          "ذوي الاحتياجات": s.isSpecialNeeds ? "نعم" : "لا",
          يتيم: s.isOrphan ? "نعم" : "لا",
          "نوع الدراسة": (s.studyMode || "in-person") === "online" ? "إلكتروني" : "حضوري",
          الأستاذ: getTeacherName(s.teacherId),
          الحالة: s.isActive ? "نشط" : "متوقف",
          "تاريخ التسجيل": formatDateAr(s.createdAt),
          ملاحظات: s.adminNotes || "",
        };
      }),
      "Students",
      "students_list.xlsx",
    );
  };

  const handleAddStudent = async () => {
    const phoneRequired = !formData.isChild;
    if (!formData.username || !formData.password || !formData.name || !formData.parentPhone || (phoneRequired && !formData.phone)) {
      toast({ title: "خطأ", description: phoneRequired ? "يرجى تعبئة الحقول المطلوبة (الاسم، اسم المستخدم، كلمة المرور، رقم الهاتف، هاتف ولي الأمر)" : "يرجى تعبئة الحقول المطلوبة (الاسم، اسم المستخدم، كلمة المرور، هاتف ولي الأمر)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          role: "student",
          age: formData.age ? parseInt(formData.age) : null,
          level: formData.level ? parseInt(formData.level) : 1,
          studyMode: formData.studyMode || "in-person",
          educationLevel: formData.educationLevel || null,
          telegramId: formData.telegramId || null,
          parentPhone: formData.parentPhone || null,
        }),
      });
      if (res.ok) {
        const savedName = formData.name;
        const savedUsername = formData.username;
        const savedPassword = formData.password;
        const savedPhone = formData.phone;
        toast({ title: "تم بنجاح", description: "تمت إضافة الطالب بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        setFormData({ name: "", username: "", password: "", phone: "", address: "", avatar: "", gender: "male", age: "", telegramId: "", parentPhone: "", educationLevel: "", level: "1", isChild: false, isSpecialNeeds: false, isOrphan: false, studyMode: "in-person" });
        fetchData();
        setCredentialsDialog({ open: true, name: savedName, username: savedUsername, password: savedPassword, phone: savedPhone, role: "student" });
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة الطالب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedStudent || !newTeacherId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedStudent.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newTeacherId }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: `تم نقل الطالب ${selectedStudent.name} بنجاح` });
        setTransferDialogOpen(false);
        setSelectedStudent(null);
        setNewTeacherId("");
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (student: Student) => {
    try {
      const res = await fetch(`/api/users/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: false }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: `تم أرشفة الطالب ${student.name}`, className: "bg-green-50 border-green-200 text-green-800" });
        fetchData();
      } else {
        toast({ title: "خطأ", description: "فشل في أرشفة الطالب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const handleRestore = async (student: Student) => {
    try {
      const res = await fetch(`/api/users/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: `تم استعادة الطالب ${student.name}`, className: "bg-green-50 border-green-200 text-green-800" });
        fetchData();
      } else {
        toast({ title: "خطأ", description: "فشل في استعادة الطالب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const handleSaveNotes = async () => {
    if (!profileStudent) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/users/${profileStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adminNotes: notesText }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حفظ الملاحظات", className: "bg-green-50 border-green-200 text-green-800" });
        setStudents(prev => prev.map(s => s.id === profileStudent.id ? { ...s, adminNotes: notesText } : s));
        setProfileStudent(prev => prev ? { ...prev, adminNotes: notesText } : null);
      } else {
        toast({ title: "خطأ", description: "فشل في حفظ الملاحظات", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setSavingNotes(false);
    }
  };

  const openProfileDialog = async (student: Student) => {
    setProfileStudent(student);
    setNotesText(student.adminNotes || "");
    setProfileDialogOpen(true);
    setProfileLoading(true);
    setProfileStats(null);
    try {
      const [attendanceRes, pointsRes, assignmentsRes, badgesRes] = await Promise.all([
        fetch(`/api/attendance?studentId=${student.id}`, { credentials: "include" }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/points?userId=${student.id}`, { credentials: "include" }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/assignments?studentId=${student.id}`, { credentials: "include" }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/badges?userId=${student.id}`, { credentials: "include" }).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      const attendanceArr = Array.isArray(attendanceRes) ? attendanceRes : [];
      const pointsArr = Array.isArray(pointsRes) ? pointsRes : [];
      const assignmentsArr = Array.isArray(assignmentsRes) ? assignmentsRes : [];
      const badgesArr = Array.isArray(badgesRes) ? badgesRes : [];
      const present = attendanceArr.filter((a: any) => a.status === "present").length;
      const absent = attendanceArr.filter((a: any) => a.status === "absent").length;
      const totalPoints = pointsArr.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const doneAssignments = assignmentsArr.filter((a: any) => a.status === "done").length;
      setProfileStats({
        attendance: {
          total: attendanceArr.length,
          present,
          absent,
          rate: attendanceArr.length > 0 ? Math.round((present / attendanceArr.length) * 100) : 0,
        },
        points: { total: totalPoints },
        assignments: {
          total: assignmentsArr.length,
          done: doneAssignments,
          pending: assignmentsArr.filter((a: any) => a.status === "pending").length,
          completionRate: assignmentsArr.length > 0 ? Math.round((doneAssignments / assignmentsArr.length) * 100) : 0,
        },
        badges: { total: badgesArr.length, list: badgesArr },
      });
    } catch {
      setProfileStats(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const getTeacherName = (teacherId?: string | null) => {
    if (!teacherId) return "غير محدد";
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher?.name || "غير محدد";
  };

  const openTransferDialog = (student: Student) => {
    setSelectedStudent(student);
    setNewTeacherId("");
    setTransferDialogOpen(true);
  };

  const hasActiveFilters = filterGender !== "all" || filterStatus !== "all" || filterSpecialNeeds !== "all" || filterOrphan !== "all" || filterLevel !== "all" || filterStudyMode !== "all" || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setSearchTerm("");
    setFilterGender("all");
    setFilterStatus("all");
    setFilterSpecialNeeds("all");
    setFilterOrphan("all");
    setFilterLevel("all");
    setFilterStudyMode("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const filteredStudents = students
    .filter(s => {
      if (searchTerm && !s.name.includes(searchTerm) && !s.username.includes(searchTerm)) return false;
      if (filterGender !== "all" && s.gender !== filterGender) return false;
      if (filterStatus !== "all") {
        if (filterStatus === "active" && !s.isActive) return false;
        if (filterStatus === "inactive" && s.isActive) return false;
      }
      if (filterSpecialNeeds !== "all") {
        if (filterSpecialNeeds === "yes" && !s.isSpecialNeeds) return false;
        if (filterSpecialNeeds === "no" && s.isSpecialNeeds) return false;
      }
      if (filterOrphan !== "all") {
        if (filterOrphan === "yes" && !s.isOrphan) return false;
        if (filterOrphan === "no" && s.isOrphan) return false;
      }
      if (filterLevel !== "all" && String(s.level || 1) !== filterLevel) return false;
      if (filterStudyMode !== "all" && (s.studyMode || "in-person") !== filterStudyMode) return false;
      if (filterDateFrom && (s as any).createdAt) {
        if (new Date((s as any).createdAt) < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo && (s as any).createdAt) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (new Date((s as any).createdAt) > toDate) return false;
      }
      if (!showArchived && !s.isActive) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name": return (a.name || "").localeCompare(b.name || "", "ar");
        case "age_asc": return (a.age || 0) - (b.age || 0);
        case "age_desc": return (b.age || 0) - (a.age || 0);
        case "status": return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
        case "recent": return new Date((b as any).createdAt || 0).getTime() - new Date((a as any).createdAt || 0).getTime();
        default: return 0;
      }
    });

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleBatchWhatsApp = () => {
    const selected = filteredStudents.filter(s => selectedStudents.has(s.id));
    for (const s of selected) {
      const phone = s.parentPhone || s.phone;
      if (phone) {
        window.open(getWhatsAppUrl(phone), "_blank");
      }
    }
  };

  const handleBatchExport = () => {
    const selected = filteredStudents.filter(s => selectedStudents.has(s.id));
    exportJsonToExcel(
      selected.map(s => {
        const level = getStudentLevel(s);
        return {
          الاسم: s.name,
          الهاتف: s.phone || "",
          العمر: s.age || "",
          "هاتف ولي الأمر": s.parentPhone || "",
          "مستوى الطالب": level.label,
          "نوع الدراسة": (s.studyMode || "in-person") === "online" ? "إلكتروني" : "حضوري",
          الأستاذ: getTeacherName(s.teacherId),
          الحالة: s.isActive ? "نشط" : "متوقف",
        };
      }),
      "Selected_Students",
      "selected_students.xlsx",
    );
  };

  const handleBatchStudyMode = async (mode: string) => {
    const ids = Array.from(selectedStudents);
    if (ids.length === 0) return;
    setBatchStudyModeLoading(true);
    try {
      const res = await fetch("/api/users/batch-study-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentIds: ids, studyMode: mode }),
      });
      if (res.ok) {
        const label = mode === "online" ? "إلكتروني" : "حضوري";
        toast({ title: "تم بنجاح", description: `تم تحويل ${ids.length} طالب إلى ${label}`, className: "bg-green-50 border-green-200 text-green-800" });
        setSelectedStudents(new Set());
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في التحويل", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setBatchStudyModeLoading(false);
    }
  };

  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.isActive).length;
  const specialNeedsStudents = students.filter(s => s.isSpecialNeeds).length;
  const orphanStudents = students.filter(s => s.isOrphan).length;
  const onlineStudents = students.filter(s => s.studyMode === "online").length;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-students">الطلاب</h1>
          <p className="text-muted-foreground">إدارة بيانات الطلاب ومتابعة تقدمهم</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImport}
            data-testid="input-file-import"
          />
          {user?.role !== "student" && (
            <>
              <Button variant="outline" onClick={() => {
                const tableHtml = `
                  <h3 class="section-title">قائمة الطلاب (${filteredStudents.length})</h3>
                  <table>
                    <thead>
                      <tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>العمر</th><th>المستوى الدراسي</th><th>الحالة</th></tr>
                    </thead>
                    <tbody>
                      ${filteredStudents.map((s, i) => `
                        <tr>
                          <td>${i + 1}</td>
                          <td>${s.name}</td>
                          <td>${s.phone || "—"}</td>
                          <td>${s.age || "—"}</td>
                          <td>${s.educationLevel || "—"}</td>
                          <td>${s.isActive ? "نشط" : "متوقف"}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                `;
                openPrintWindow("قائمة الطلاب", tableHtml);
              }} className="gap-2" data-testid="button-print">
                <Printer className="w-4 h-4" />
                طباعة
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2" data-testid="button-import">
                <Upload className="w-4 h-4" />
                استيراد
              </Button>
              <Button variant="outline" onClick={handleExport} className="gap-2" data-testid="button-export">
                <Download className="w-4 h-4" />
                تصدير
              </Button>
            </>
          )}
          {isTeacher && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white gap-2" data-testid="button-add-student">
                  <Plus className="w-4 h-4" />
                  إضافة طالب
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة طالب جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden shrink-0">
                      {formData.avatar ? (
                        <img src={formData.avatar} alt="صورة" className="w-full h-full object-cover" data-testid="img-student-avatar-preview" />
                      ) : (
                        <Camera className="w-6 h-6 text-muted-foreground/40" />
                      )}
                    </div>
                    <div>
                      <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarSelect} data-testid="input-student-avatar" />
                      <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} className="gap-1" data-testid="button-student-avatar">
                        <Camera className="w-3.5 h-3.5" />
                        صورة شخصية
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input data-testid="input-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <UsernameInput
                    value={formData.username}
                    onChange={(v) => setFormData({...formData, username: v})}
                    editingUserId={selectedStudent?.id}
                  />
                  <div className="space-y-2">
                    <Label>كلمة المرور *</Label>
                    <Input data-testid="input-password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>الجنس</Label>
                    <Select value={formData.gender} onValueChange={(v) => setFormData(prev => ({...prev, gender: v}))}>
                      <SelectTrigger data-testid="select-gender">
                        <SelectValue placeholder="اختر الجنس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>العمر</Label>
                    <Input data-testid="input-age" type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <Checkbox
                      id="is-child"
                      checked={formData.isChild}
                      onCheckedChange={(v) => setFormData(prev => ({...prev, isChild: !!v, phone: !!v ? "" : prev.phone}))}
                      data-testid="checkbox-is-child"
                    />
                    <Label htmlFor="is-child" className="text-sm cursor-pointer">طالب طفل <span className="text-xs text-muted-foreground">(لا يملك هاتف شخصي)</span></Label>
                  </div>
                  {!formData.isChild && (
                    <div className="space-y-2">
                      <Label>الهاتف <span className="text-red-500">*</span></Label>
                      <InternationalPhoneInput
                        value={formData.phone}
                        onChange={(full) => setFormData(prev => ({ ...prev, phone: full }))}
                        error={phoneValidation.message && !phoneValidation.valid ? phoneValidation.message : undefined}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>هاتف ولي الأمر <span className="text-red-500">*</span></Label>
                    <InternationalPhoneInput
                      value={formData.parentPhone}
                      onChange={(full) => setFormData(prev => ({ ...prev, parentPhone: full }))}
                      error={parentPhoneValidation.message && !parentPhoneValidation.valid ? parentPhoneValidation.message : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>معرف التلغرام</Label>
                    <Input data-testid="input-telegram-id" value={formData.telegramId} onChange={e => setFormData({...formData, telegramId: e.target.value})} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>العنوان</Label>
                    <Input data-testid="input-address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>المستوى الدراسي</Label>
                    <Select value={formData.educationLevel} onValueChange={(v) => setFormData(prev => ({...prev, educationLevel: v}))}>
                      <SelectTrigger data-testid="select-education-level">
                        <SelectValue placeholder="اختر المستوى الدراسي" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school">مدرسة</SelectItem>
                        <SelectItem value="university">جامعة</SelectItem>
                        <SelectItem value="postgraduate">دراسات عليا</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>مستوى الحفظ</Label>
                    <Select value={formData.level} onValueChange={(v) => setFormData(prev => ({...prev, level: v}))}>
                      <SelectTrigger data-testid="select-level">
                        <SelectValue placeholder="اختر مستوى الحفظ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">المستوى الأول (الجزء 30-26)</SelectItem>
                        <SelectItem value="2">المستوى الثاني (الجزء 25-21)</SelectItem>
                        <SelectItem value="3">المستوى الثالث (الجزء 20-16)</SelectItem>
                        <SelectItem value="4">المستوى الرابع (الجزء 15-11)</SelectItem>
                        <SelectItem value="5">المستوى الخامس (الجزء 10-6)</SelectItem>
                        <SelectItem value="6">المستوى السادس (الجزء 5-1)</SelectItem>
                        <SelectItem value="7">حافظ (30 جزء)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">يحدد المستوى أي الأساتذة يمكنهم التعامل مع هذا الطالب</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">نوع الدراسة</Label>
                    <div className="grid grid-cols-2 gap-3" data-testid="select-study-mode">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, studyMode: "in-person"}))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          formData.studyMode === "in-person"
                            ? "border-green-500 bg-green-50 dark:bg-green-950/30 shadow-md ring-2 ring-green-200"
                            : "border-muted hover:border-green-300 hover:bg-green-50/50"
                        }`}
                        data-testid="button-study-mode-in-person"
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.studyMode === "in-person" ? "bg-green-500 text-white" : "bg-green-100 text-green-600"}`}>
                          <Users className="w-6 h-6" />
                        </div>
                        <span className={`text-sm font-bold ${formData.studyMode === "in-person" ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>حضوري</span>
                        <span className="text-[10px] text-muted-foreground">حضور مباشر في المسجد</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, studyMode: "online"}))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          formData.studyMode === "online"
                            ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 shadow-md ring-2 ring-cyan-200"
                            : "border-muted hover:border-cyan-300 hover:bg-cyan-50/50"
                        }`}
                        data-testid="button-study-mode-online"
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.studyMode === "online" ? "bg-cyan-500 text-white" : "bg-cyan-100 text-cyan-600"}`}>
                          <Monitor className="w-6 h-6" />
                        </div>
                        <span className={`text-sm font-bold ${formData.studyMode === "online" ? "text-cyan-700 dark:text-cyan-400" : "text-muted-foreground"}`}>إلكتروني</span>
                        <span className="text-[10px] text-muted-foreground">دراسة عن بُعد</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="special-needs"
                      checked={formData.isSpecialNeeds}
                      onCheckedChange={(v) => setFormData(prev => ({...prev, isSpecialNeeds: !!v}))}
                      data-testid="checkbox-special-needs"
                    />
                    <Label htmlFor="special-needs">من ذوي الاحتياجات الخاصة</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="orphan"
                      checked={formData.isOrphan}
                      onCheckedChange={(v) => setFormData(prev => ({...prev, isOrphan: !!v}))}
                      data-testid="checkbox-orphan"
                    />
                    <Label htmlFor="orphan">يتيم</Label>
                  </div>
                  <Button onClick={handleAddStudent} disabled={submitting} className="w-full" data-testid="button-submit-student">
                    {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                    إضافة الطالب
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!isStudent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children" data-testid="stats-cards">
          <Card className="border-blue-200 bg-blue-50/50 card-hover" data-testid="stat-total-students">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{totalStudents}</p>
                <p className="text-xs text-blue-600/80">إجمالي الطلاب</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50 card-hover" data-testid="stat-active-students">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{activeStudents}</p>
                <p className="text-xs text-green-600/80">الطلاب النشطين</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50/50 card-hover" data-testid="stat-special-needs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">{specialNeedsStudents}</p>
                <p className="text-xs text-purple-600/80">ذوي الاحتياجات</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50 card-hover" data-testid="stat-orphan-students">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{orphanStudents}</p>
                <p className="text-xs text-amber-600/80">الأيتام</p>
              </div>
            </CardContent>
          </Card>
          {onlineStudents > 0 && (
            <Card className="border-cyan-200 bg-cyan-50/50 card-hover" data-testid="stat-online-students">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-700">{onlineStudents}</p>
                  <p className="text-xs text-cyan-600/80">إلكتروني</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isSupervisor && pendingStudents.length > 0 && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-md" data-testid="pending-students-section">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-amber-800" data-testid="text-pending-count">
                  طلاب بانتظار الموافقة ({pendingStudents.length})
                </CardTitle>
                <p className="text-sm text-amber-600">يرجى مراجعة الطلبات والموافقة عليها أو رفضها</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingStudents.map((ps) => (
                <div key={ps.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white/80 border border-amber-200 rounded-lg" data-testid={`pending-student-${ps.id}`}>
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-amber-900" data-testid={`pending-name-${ps.id}`}>{ps.name}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-amber-700">
                      {ps.phone && <span>📱 {ps.phone}</span>}
                      {ps.parentPhone && <span>👨‍👩‍👦 {ps.parentPhone}</span>}
                      {ps.teacherId && <span>👨‍🏫 {teachers.find(t => t.id === ps.teacherId)?.name || "غير محدد"}</span>}
                      <Badge className={LEVEL_COLORS[ps.level || 1] || LEVEL_COLORS[1]}>
                        {LEVEL_NAMES[ps.level || 1] || "المستوى الأول"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApprove(ps.id)}
                      disabled={pendingActionLoading === ps.id}
                      data-testid={`button-approve-${ps.id}`}
                    >
                      {pendingActionLoading === ps.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      موافقة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => { setRejectStudentId(ps.id); setRejectReason(""); setRejectDialogOpen(true); }}
                      disabled={pendingActionLoading === ps.id}
                      data-testid={`button-reject-${ps.id}`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      رفض
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>سبب الرفض</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>يرجى كتابة سبب رفض الطالب</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="سبب الرفض..."
                data-testid="input-reject-reason"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">إلغاء</Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={pendingActionLoading !== null}
                data-testid="button-confirm-reject"
              >
                {pendingActionLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تأكيد الرفض
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedStudents.size > 0 && !isStudent && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg" data-testid="batch-actions-bar">
          <CheckSquare className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">تم تحديد {selectedStudents.size} طالب</span>
          <div className="flex gap-2 mr-auto">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleBatchWhatsApp} data-testid="button-batch-whatsapp">
              <MessageCircle className="w-3.5 h-3.5 text-green-600" />
              واتساب جماعي
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleBatchExport} data-testid="button-batch-export">
              <Download className="w-3.5 h-3.5" />
              تصدير المحدد
            </Button>
            {(isSupervisor || user?.role === "admin") && (
              <>
                <Button variant="outline" size="sm" className="gap-1 border-cyan-300 text-cyan-700 hover:bg-cyan-50" onClick={() => handleBatchStudyMode("online")} disabled={batchStudyModeLoading} data-testid="button-batch-online">
                  {batchStudyModeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Monitor className="w-3.5 h-3.5" />}
                  تحويل إلى إلكتروني
                </Button>
                <Button variant="outline" size="sm" className="gap-1 border-green-300 text-green-700 hover:bg-green-50" onClick={() => handleBatchStudyMode("in-person")} disabled={batchStudyModeLoading} data-testid="button-batch-in-person">
                  {batchStudyModeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Repeat className="w-3.5 h-3.5" />}
                  تحويل إلى حضوري
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelectedStudents(new Set())} data-testid="button-clear-selection">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Card dir="rtl">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">قائمة الطلاب ({filteredStudents.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={(v) => setShowArchived(!!v)}
                  data-testid="checkbox-show-archived"
                />
                <Label htmlFor="show-archived" className="text-xs text-muted-foreground cursor-pointer">عرض المؤرشفين</Label>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-sort">
                  <SortAsc className="w-3.5 h-3.5 ml-1" />
                  <SelectValue placeholder="الترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">الاسم (أبجدي)</SelectItem>
                  <SelectItem value="age_asc">العمر (تصاعدي)</SelectItem>
                  <SelectItem value="age_desc">العمر (تنازلي)</SelectItem>
                  <SelectItem value="status">الحالة (النشط أولاً)</SelectItem>
                  <SelectItem value="recent">الأحدث أولاً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3 mt-3">
            <div className="relative w-full sm:w-52">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن طالب..."
                className="pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-students"
              />
            </div>
            <div className="w-full sm:w-36">
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger data-testid="select-filter-gender">
                  <SelectValue placeholder="الجنس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الجنس - الكل</SelectItem>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الحالة - الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">متوقف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Select value={filterSpecialNeeds} onValueChange={setFilterSpecialNeeds}>
                <SelectTrigger data-testid="select-filter-special-needs">
                  <SelectValue placeholder="ذوي الاحتياجات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ذوي الاحتياجات - الكل</SelectItem>
                  <SelectItem value="yes">نعم</SelectItem>
                  <SelectItem value="no">لا</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Select value={filterOrphan} onValueChange={setFilterOrphan}>
                <SelectTrigger data-testid="select-filter-orphan">
                  <SelectValue placeholder="يتيم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">يتيم - الكل</SelectItem>
                  <SelectItem value="yes">نعم</SelectItem>
                  <SelectItem value="no">لا</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger data-testid="select-filter-level">
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
            </div>
            <div className="w-full sm:w-36">
              <Select value={filterStudyMode} onValueChange={setFilterStudyMode}>
                <SelectTrigger data-testid="select-filter-study-mode">
                  <SelectValue placeholder="نوع الدراسة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">نوع الدراسة - الكل</SelectItem>
                  <SelectItem value="in-person">حضوري</SelectItem>
                  <SelectItem value="online">إلكتروني</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs text-muted-foreground mb-1 block">من تاريخ</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                data-testid="input-filter-date-from"
              />
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                data-testid="input-filter-date-to"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-destructive hover:text-destructive" data-testid="button-clear-filters">
                <X className="w-4 h-4" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="status-loading-students">
              <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
              <span>جاري التحميل...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="status-empty">
              لا توجد بيانات
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!isStudent && (
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                    )}
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">الجنس</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">الهاتف</TableHead>
                    <TableHead className="text-right hidden md:table-cell">المستوى</TableHead>
                    {isSupervisor && <TableHead className="text-right hidden md:table-cell">الأستاذ</TableHead>}
                    <TableHead className="text-right">الحالة</TableHead>
                    {!isStudent && <TableHead className="text-center">إجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const level = getStudentLevel(student);
                    return (
                      <TableRow key={student.id} data-testid={`row-student-${student.id}`} className={`cursor-pointer hover:bg-muted/50 ${student.studyMode === "online" ? "bg-cyan-50/60 dark:bg-cyan-950/20 border-r-[3px] border-r-cyan-500" : ""}`} onClick={() => openProfileDialog(student)}>
                        {!isStudent && (
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedStudents.has(student.id)}
                              onCheckedChange={() => toggleSelectStudent(student.id)}
                              data-testid={`checkbox-student-${student.id}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium" data-testid={`text-name-${student.id}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 relative ${student.studyMode === "online" ? "ring-2 ring-cyan-400 ring-offset-1" : "bg-primary/10 text-primary"}`}>
                              {student.avatar ? (
                                <img src={student.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : student.studyMode === "online" ? (
                                <div className="w-full h-full rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700">
                                  {student.name?.charAt(0)}
                                </div>
                              ) : (
                                student.name?.charAt(0)
                              )}
                              {student.studyMode === "online" && (
                                <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-cyan-500 flex items-center justify-center">
                                  <Monitor className="w-2 h-2 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={student.studyMode === "online" ? "text-cyan-700 dark:text-cyan-400 font-bold" : ""}>{student.name}</span>
                              {student.studyMode === "online" && (
                                <Badge variant="secondary" className="bg-cyan-500 text-white border-cyan-600 text-[10px] px-2 py-0 h-[18px] gap-0.5 font-bold shadow-sm">
                                  <Monitor className="w-2.5 h-2.5" />
                                  إلكتروني
                                </Badge>
                              )}
                              {student.isSpecialNeeds && <Heart className="w-3 h-3 text-purple-500 inline" />}
                              {student.isOrphan && <Shield className="w-3 h-3 text-amber-500 inline" />}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell" data-testid={`text-gender-${student.id}`}>{student.gender === "female" ? "أنثى" : "ذكر"}</TableCell>
                        <TableCell className="hidden sm:table-cell" dir="ltr" data-testid={`text-phone-${student.id}`} onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <span>{student.phone || "—"}</span>
                            {student.phone && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => window.open(getWhatsAppUrl(student.phone!), "_blank")}
                                title="واتساب"
                                data-testid={`button-whatsapp-${student.id}`}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {student.parentPhone && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => window.open(getWhatsAppUrl(student.parentPhone!), "_blank")}
                                title="واتساب ولي الأمر"
                                data-testid={`button-whatsapp-parent-${student.id}`}
                              >
                                <MessageCircle className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className={`text-xs ${level.color}`} data-testid={`badge-level-${student.id}`}>
                            {level.label} ({level.level})
                          </Badge>
                        </TableCell>
                        {isSupervisor && (
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <GraduationCap className="w-3.5 h-3.5" />
                              {getTeacherName(student.teacherId)}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge
                            variant={student.isActive ? "default" : "destructive"}
                            className={student.isActive ? "bg-green-100 text-green-700 hover:bg-green-200 border-none" : ""}
                            data-testid={`status-active-${student.id}`}
                          >
                            {student.isActive ? "نشط" : "متوقف"}
                          </Badge>
                        </TableCell>
                        {!isStudent && (
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openProfileDialog(student)}
                                title="عرض الملف"
                                data-testid={`button-view-${student.id}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {(isTeacher || isSupervisor) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => openCommLog(student)}
                                  title="سجل التواصل"
                                  data-testid={`button-comm-log-${student.id}`}
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {isSupervisor && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs h-7"
                                  onClick={() => openTransferDialog(student)}
                                  data-testid={`button-transfer-${student.id}`}
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  نقل
                                </Button>
                              )}
                              {student.isActive ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => handleArchive(student)}
                                  title="أرشفة"
                                  data-testid={`button-archive-${student.id}`}
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleRestore(student)}
                                  title="استعادة"
                                  data-testid={`button-restore-${student.id}`}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>نقل طالب إلى أستاذ آخر</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 mt-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">الطالب:</p>
                <p className="font-bold text-lg">{selectedStudent.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  الأستاذ الحالي: <span className="font-medium text-foreground">{getTeacherName(selectedStudent.teacherId)}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>الأستاذ الجديد *</Label>
                <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                  <SelectTrigger data-testid="select-new-teacher">
                    <SelectValue placeholder="اختر الأستاذ الجديد" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers
                      .filter(t => t.id !== selectedStudent.teacherId)
                      .map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">سيتم نقل جميع واجبات الطالب إلى الأستاذ الجديد أيضاً.</p>
              <Button onClick={handleTransfer} disabled={submitting || !newTeacherId} className="w-full" data-testid="button-confirm-transfer">
                {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                تأكيد النقل
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              الملف الشخصي للطالب
            </DialogTitle>
          </DialogHeader>
          {profileStudent && (
            <div className="space-y-4 mt-2">
              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0 overflow-hidden">
                  {profileStudent.avatar ? (
                    <img src={profileStudent.avatar} alt="" className="w-full h-full object-cover" data-testid="img-profile-avatar" />
                  ) : (
                    profileStudent.name?.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold" data-testid="text-profile-name">{profileStudent.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="secondary" className={getStudentLevel(profileStudent).color} data-testid="badge-profile-level">
                      المستوى {getStudentLevel(profileStudent).level}: {getStudentLevel(profileStudent).label}
                    </Badge>
                    <Badge variant={profileStudent.isActive ? "default" : "destructive"} className={profileStudent.isActive ? "bg-green-100 text-green-700 border-none" : ""}>
                      {profileStudent.isActive ? "نشط" : "متوقف"}
                    </Badge>
                    {(profileStudent.studyMode || "in-person") === "online" && <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 border-cyan-200">إلكتروني</Badge>}
                    {profileStudent.isChild && <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">طفل</Badge>}
                    {profileStudent.isSpecialNeeds && <Badge variant="secondary" className="bg-purple-100 text-purple-700">ذوي احتياجات</Badge>}
                    {profileStudent.isOrphan && <Badge variant="secondary" className="bg-amber-100 text-amber-700">يتيم</Badge>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">العمر</span>
                  <p className="font-medium" data-testid="text-profile-age">{profileStudent.age || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">الجنس</span>
                  <p className="font-medium" data-testid="text-profile-gender">{profileStudent.gender === "female" ? "أنثى" : "ذكر"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">الهاتف</span>
                  <p className="font-medium" dir="ltr" data-testid="text-profile-phone">{profileStudent.phone || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">هاتف ولي الأمر</span>
                  <div className="flex items-center gap-1">
                    <p className="font-medium" dir="ltr" data-testid="text-profile-parent-phone">{profileStudent.parentPhone || "—"}</p>
                    {profileStudent.parentPhone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-green-600"
                        onClick={() => window.open(getWhatsAppUrl(profileStudent.parentPhone!), "_blank")}
                        data-testid="button-profile-whatsapp-parent"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">نوع الدراسة</span>
                  <p className="font-medium" data-testid="text-profile-study-mode">
                    <Badge variant="secondary" className={(profileStudent.studyMode || "in-person") === "online" ? "bg-cyan-100 text-cyan-700 border-cyan-200" : "bg-green-100 text-green-700 border-green-200"}>
                      {(profileStudent.studyMode || "in-person") === "online" ? "إلكتروني" : "حضوري"}
                    </Badge>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">المستوى الدراسي</span>
                  <p className="font-medium" data-testid="text-profile-education">{profileStudent.educationLevel || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">مستوى الحفظ</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={getStudentLevel(profileStudent).color}>
                      {getStudentLevel(profileStudent).label} - {LEVEL_RANGES[profileStudent.level || 1]}
                    </Badge>
                    {!isStudent && (
                      <Select
                        value={String(profileStudent.level || 1)}
                        onValueChange={async (val) => {
                          try {
                            const res = await fetch(`/api/levels/student/${profileStudent.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({ level: Number(val) }),
                            });
                            if (res.ok) {
                              toast({ title: "تم بنجاح", description: `تم تغيير المستوى إلى ${LEVEL_NAMES[Number(val)]}`, className: "bg-green-50 border-green-200 text-green-800" });
                              setProfileStudent(prev => prev ? { ...prev, level: Number(val) } : null);
                              setStudents(prev => prev.map(s => s.id === profileStudent.id ? { ...s, level: Number(val) } : s));
                            } else {
                              const err = await res.json();
                              toast({ title: "خطأ", description: err.message, variant: "destructive" });
                            }
                          } catch {
                            toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
                          }
                        }}
                        data-testid="select-change-level"
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">المستوى الأول</SelectItem>
                          <SelectItem value="2">المستوى الثاني</SelectItem>
                          <SelectItem value="3">المستوى الثالث</SelectItem>
                          <SelectItem value="4">المستوى الرابع</SelectItem>
                          <SelectItem value="5">المستوى الخامس</SelectItem>
                          <SelectItem value="6">المستوى السادس</SelectItem>
                          <SelectItem value="7">حافظ</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">الأستاذ</span>
                  <p className="font-medium" data-testid="text-profile-teacher">
                    <GraduationCap className="w-3.5 h-3.5 inline ml-1" />
                    {getTeacherName(profileStudent.teacherId)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">العنوان</span>
                  <p className="font-medium" data-testid="text-profile-address">{profileStudent.address || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">تاريخ التسجيل</span>
                  <p className="font-medium" data-testid="text-profile-created">{formatDateAr(profileStudent.createdAt)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  إحصائيات الطالب
                </h4>
                {profileLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary ml-2" />
                    <span className="text-sm text-muted-foreground">جاري تحميل الإحصائيات...</span>
                  </div>
                ) : profileStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-center" data-testid="stat-profile-attendance">
                      <TrendingUp className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-blue-700">{profileStats.attendance.rate}%</p>
                      <p className="text-xs text-blue-600">نسبة الحضور</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{profileStats.attendance.present}/{profileStats.attendance.total}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center" data-testid="stat-profile-points">
                      <Star className="w-4 h-4 text-green-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-green-700">{profileStats.points.total}</p>
                      <p className="text-xs text-green-600">النقاط</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 text-center" data-testid="stat-profile-assignments">
                      <FileText className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-purple-700">{profileStats.assignments.completionRate}%</p>
                      <p className="text-xs text-purple-600">إنجاز الواجبات</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{profileStats.assignments.done}/{profileStats.assignments.total}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-center" data-testid="stat-profile-badges">
                      <Award className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-amber-700">{profileStats.badges.total}</p>
                      <p className="text-xs text-amber-600">الأوسمة</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لا تتوفر إحصائيات</p>
                )}
              </div>

              {!isStudent && (
                <div className="border-t pt-4">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    ملاحظات المشرف
                  </h4>
                  <Textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="أضف ملاحظات حول الطالب..."
                    className="min-h-[80px]"
                    data-testid="textarea-admin-notes"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    data-testid="button-save-notes"
                  >
                    {savingNotes && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    حفظ الملاحظات
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={commLogOpen} onOpenChange={setCommLogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5" />
              سجل التواصل مع ولي الأمر
            </DialogTitle>
          </DialogHeader>
          {commLogStudent && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-bold">{commLogStudent.name}</p>
                <p className="text-sm text-muted-foreground">هاتف ولي الأمر: {commLogStudent.parentPhone || "غير محدد"}</p>
              </div>

              <div className="space-y-3 border rounded-lg p-4 bg-blue-50/30">
                <h4 className="text-sm font-bold">تسجيل تواصل جديد</h4>
                <div className="space-y-2">
                  <Label>وسيلة التواصل</Label>
                  <Select value={commLogForm.method} onValueChange={(v) => setCommLogForm(prev => ({ ...prev, method: v }))}>
                    <SelectTrigger data-testid="select-comm-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">واتساب</SelectItem>
                      <SelectItem value="phone">اتصال هاتفي</SelectItem>
                      <SelectItem value="sms">رسالة نصية</SelectItem>
                      <SelectItem value="in_person">شخصياً</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الموضوع *</Label>
                  <Input
                    value={commLogForm.subject}
                    onChange={(e) => setCommLogForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="مثال: متابعة غياب الطالب"
                    data-testid="input-comm-subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={commLogForm.notes}
                    onChange={(e) => setCommLogForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="تفاصيل إضافية..."
                    className="min-h-[60px]"
                    data-testid="input-comm-notes"
                  />
                </div>
                <Button
                  onClick={handleAddCommLog}
                  disabled={commLogSubmitting}
                  className="w-full gap-2"
                  data-testid="button-save-comm-log"
                >
                  {commLogSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  تسجيل التواصل
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold">السجلات السابقة ({commLogs.length})</h4>
                {commLogsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : commLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد سجلات تواصل سابقة</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {commLogs.map((log: any) => {
                      const methodLabels: Record<string, string> = { whatsapp: "واتساب", phone: "اتصال", sms: "رسالة نصية", in_person: "شخصياً", other: "أخرى" };
                      return (
                        <div key={log.id} className="p-3 border rounded-lg text-sm" data-testid={`comm-log-${log.id}`}>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="text-xs">{methodLabels[log.method] || log.method}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDateAr(log.createdAt)}</span>
                          </div>
                          <p className="font-medium mt-1">{log.subject}</p>
                          {log.notes && <p className="text-muted-foreground text-xs mt-1">{log.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {credentialsDialog && (
        <CredentialsShareDialog
          open={credentialsDialog.open}
          onClose={() => setCredentialsDialog(null)}
          name={credentialsDialog.name}
          username={credentialsDialog.username}
          password={credentialsDialog.password}
          phone={credentialsDialog.phone}
          role={credentialsDialog.role}
          mosqueName={user?.mosqueName || undefined}
        />
      )}
    </div>
  );
}