import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/phone-utils";
import {
  Loader2, Plus, Users, Trash2, Search, Phone, UserCheck, Baby, MessageCircle, BarChart3,
  UserPlus, Eye, EyeOff, CheckCircle2,
  FileText, Copy, Link, ClipboardCheck, BookOpen, CheckCircle, Star, Calendar, TrendingUp, Award, Heart, AlertTriangle, Send,
} from "lucide-react";

// ==================== Interfaces ====================

interface FamilyLink {
  id: string;
  parentPhone: string;
  studentId: string;
  studentName?: string;
  relationship: string;
  createdAt: string;
}

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

interface FamilyDashboard {
  children: {
    studentId: string;
    studentName: string;
    relationship: string;
    attendance?: number;
    points?: number;
    assignments?: number;
  }[];
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

// ==================== Constants ====================

const relationshipMap: Record<string, string> = {
  parent: "ولي أمر",
  guardian: "وصي",
  sibling: "أخ/أخت",
};

const LEVEL_NAMES = ["المستوى الأول", "المستوى الثاني", "المستوى الثالث", "المستوى الرابع", "المستوى الخامس", "المستوى السادس", "حافظ"];
const LEVEL_COLORS = [
  "bg-gray-100 text-gray-700 border-gray-300",
  "bg-blue-100 text-blue-700 border-blue-300",
  "bg-green-100 text-green-700 border-green-300",
  "bg-purple-100 text-purple-700 border-purple-300",
  "bg-amber-100 text-amber-700 border-amber-300",
  "bg-emerald-100 text-emerald-700 border-emerald-300",
  "bg-teal-100 text-teal-700 border-teal-300",
];

// ==================== Component ====================

export default function FamilySystemPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // -------- Shared state --------
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // -------- Family Links state --------
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [parentPhone, setParentPhone] = useState("");
  const [linkStudentId, setLinkStudentId] = useState("");
  const [relationship, setRelationship] = useState("parent");

  const [searchPhone, setSearchPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [dashboard, setDashboard] = useState<FamilyDashboard | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create parent account state
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [parentAccountPhone, setParentFormPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentUsername, setParentUsername] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [parentGender, setParentGender] = useState("male");
  const [showParentPassword, setShowParentPassword] = useState(false);
  const [parentSubmitting, setParentSubmitting] = useState(false);
  const [detectedStudents, setDetectedStudents] = useState<{ id: string; name: string; gender: string | null; level: number | null; parentPhone: string | null }[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [detectingStudents, setDetectingStudents] = useState(false);
  const [manualStudentId, setManualStudentId] = useState("");
  const [createdAccountInfo, setCreatedAccountInfo] = useState<{ name: string; username: string; password: string; phone: string; studentNames: string[] } | null>(null);

  // -------- Parent Portal state --------
  const [portalStudentId, setPortalStudentId] = useState("");
  const [reports, setReports] = useState<ParentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingReport, setDeletingReport] = useState<string | null>(null);
  const [reportType, setReportType] = useState("weekly");
  const [expiresAt, setExpiresAt] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [progressData, setProgressData] = useState<{ assignments: Assignment[]; totalPoints: number } | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [badgesData, setBadgesData] = useState<BadgeRecord[]>([]);
  const [pointsData, setPointsData] = useState<PointRecord[]>([]);

  const canManage = user?.role === "admin" || user?.role === "supervisor";

  // ==================== Auto-detect families ====================
  const [suggestedFamilies, setSuggestedFamilies] = useState<Array<{
    groupKey: string;
    matchType: "shared_phone" | "teacher_parent";
    matchValue: string;
    members: Array<{ id: string; name: string; gender?: string; role: string }>;
  }>>([]);
  const [detectingFamilies, setDetectingFamilies] = useState(false);

  const fetchSuggestedFamilies = async () => {
    setDetectingFamilies(true);
    try {
      const res = await fetch("/api/family/auto-detect", { credentials: "include" });
      if (res.ok) setSuggestedFamilies(await res.json());
    } catch {} finally { setDetectingFamilies(false); }
  };

  // ==================== Shared fetch ====================

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/users?role=student", { credentials: "include" });
      if (res.ok) setStudents(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل قائمة الطلاب", variant: "destructive" });
    } finally {
      setStudentsLoading(false);
    }
  };

  // ==================== Family Links functions ====================

  const detectStudentsByPhone = async (phone: string) => {
    if (phone.length < 7) { setDetectedStudents([]); return; }
    setDetectingStudents(true);
    try {
      const res = await fetch(`/api/family/students-by-parent-phone/${encodeURIComponent(phone)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDetectedStudents(data);
        setSelectedStudentIds(data.map((s: any) => s.id));
      }
    } catch {}
    finally { setDetectingStudents(false); }
  };

  const handleParentPhoneChange = (val: string) => {
    setParentFormPhone(val);
    const timeout = setTimeout(() => detectStudentsByPhone(val), 400);
    return () => clearTimeout(timeout);
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addManualStudent = () => {
    if (manualStudentId && !selectedStudentIds.includes(manualStudentId)) {
      setSelectedStudentIds(prev => [...prev, manualStudentId]);
      if (!detectedStudents.find(s => s.id === manualStudentId)) {
        const student = students.find(s => s.id === manualStudentId);
        if (student) {
          setDetectedStudents(prev => [...prev, { id: student.id, name: student.name, gender: null, level: null, parentPhone: null }]);
        }
      }
      setManualStudentId("");
    }
  };

  const handleCreateParentAccount = async () => {
    if (!parentName || !parentUsername || !parentPassword || !parentAccountPhone) {
      toast({ title: "خطأ", description: "جميع الحقول مطلوبة", variant: "destructive" });
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast({ title: "خطأ", description: "يجب اختيار طالب واحد على الأقل", variant: "destructive" });
      return;
    }
    if (parentPassword.length < 4) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setParentSubmitting(true);
    try {
      const res = await fetch("/api/family/create-parent-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: parentAccountPhone,
          name: parentName,
          username: parentUsername,
          password: parentPassword,
          gender: parentGender,
          studentIds: selectedStudentIds,
        }),
      });
      if (res.ok) {
        const studentNames = selectedStudentIds.map(id => {
          const s = detectedStudents.find(d => d.id === id) || students.find(st => st.id === id);
          return s?.name || id;
        });
        setCreatedAccountInfo({ name: parentName, username: parentUsername, password: parentPassword, phone: parentAccountPhone, studentNames });
        setParentDialogOpen(false);
        setParentFormPhone("");
        setParentName("");
        setParentUsername("");
        setParentPassword("");
        setParentGender("male");
        setDetectedStudents([]);
        setSelectedStudentIds([]);
        fetchLinks();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الحساب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setParentSubmitting(false);
    }
  };

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/family-links", { credentials: "include" });
      if (res.ok) setLinks(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الروابط العائلية", variant: "destructive" });
    } finally {
      setLinksLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!parentPhone || !linkStudentId) {
      toast({ title: "خطأ", description: "رقم الهاتف واختيار الطالب مطلوبان", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/family-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ parentPhone, studentId: linkStudentId, relationship }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء الرابط العائلي", className: "bg-green-50 border-green-200 text-green-800" });
        setLinkDialogOpen(false);
        setParentPhone("");
        setLinkStudentId("");
        setRelationship("parent");
        fetchLinks();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الرابط", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/family-links/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف الرابط العائلي", className: "bg-green-50 border-green-200 text-green-800" });
        fetchLinks();
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الرابط", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchDashboard = async () => {
    if (!searchPhone) return;
    setSearching(true);
    setDashboard(null);
    try {
      const res = await fetch(`/api/family-dashboard/${searchPhone}`, { credentials: "include" });
      if (res.ok) {
        setDashboard(await res.json());
      } else {
        toast({ title: "خطأ", description: "لم يتم العثور على بيانات لهذا الرقم", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const getStudentName = (studentId: string, studentName?: string) => {
    if (studentName) return studentName;
    return students.find(s => s.id === studentId)?.name || studentId;
  };

  // ==================== Parent Portal functions ====================

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
      setProgressData({ assignments: Array.isArray(assignments) ? assignments : [], totalPoints: pointsTotalData.totalPoints || pointsTotalData.total || 0 });
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

  const getPortalStudent = () => students.find(s => s.id === portalStudentId);

  const getAttendanceCounts = () => {
    const present = attendanceData.filter(a => a.status === "present").length;
    const absent = attendanceData.filter(a => a.status === "absent").length;
    const late = attendanceData.filter(a => a.status === "late").length;
    const total = attendanceData.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, total, rate };
  };

  const getLevelName = (level?: number | null) => {
    if (!level || level < 1 || level > 7) return "غير محدد";
    return LEVEL_NAMES[level - 1];
  };

  const getLevelColor = (level?: number | null) => {
    if (!level || level < 1 || level > 7) return "bg-gray-100 text-gray-600 border-gray-300";
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
        if (weekIndex >= 0 && weekIndex < 4) weeks[weekIndex]++;
      }
    });
    return weeks.reverse();
  };

  const generateReportContent = () => {
    const student = getPortalStudent();
    if (!student || !progressData) return "";

    const assignments = progressData.assignments;
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === "done" || a.grade !== null).length;
    const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    const lastFive = assignments.filter(a => a.grade !== null).slice(-5)
      .map(a => `${a.surahName} (${a.fromVerse}-${a.toVerse}): ${a.grade}/100`).join("\n");

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
      badgesData.slice(-5).forEach(b => lines.push(`  - ${b.badgeName}`));
      lines.push(``);
    }

    lines.push(`📈 التقدم العام: ${progressDesc}`);
    lines.push(``);
    lines.push(`بارك الله فيكم ونفع بكم 🤲`);

    return lines.join("\n");
  };

  const handleGenerateReport = async () => {
    const student = getPortalStudent();
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
        body: JSON.stringify({ studentId: student.id, reportType, content, expiresAt: expiresAt || undefined }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء التقرير بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setReportDialogOpen(false);
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
    setDeletingReport(reportId);
    try {
      const res = await fetch(`/api/parent-reports/${reportId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف التقرير", className: "bg-green-50 border-green-200 text-green-800" });
        setReports(prev => prev.filter(r => r.id !== reportId));
      } else {
        toast({ title: "خطأ", description: "فشل في حذف التقرير", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setDeletingReport(null);
    }
  };

  const getReportLink = (token: string) => `${window.location.origin}/parent-report/${token}`;

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
    const message = `📋 تقرير تقدم الطالب: ${student?.name || ""}\n🔗 رابط التقرير: ${link}`;
    const phone = student?.parentPhone || student?.phone || "";
    const url = phone ? getWhatsAppUrl(phone, message) : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const sendWhatsAppTemplate = (templateKey: string) => {
    const student = getPortalStudent();
    if (!student) return;
    const phone = student.parentPhone || student.phone || "";
    const attendanceCounts = getAttendanceCounts();
    const portalAssignments = progressData?.assignments || [];
    const portalCompleted = portalAssignments.filter(a => a.status === "done" || a.grade !== null).length;

    const templates: Record<string, string> = {
      attendance_reminder: `السلام عليكم ورحمة الله وبركاته\n\nتذكير بحضور الطالب: ${student.name}\n\nنذكركم بأهمية الحضور المنتظم لحلقات التحفيظ.\nنسبة الحضور الحالية: ${attendanceCounts.rate}%\n\nبارك الله فيكم 🤲`,
      achievement: `السلام عليكم ورحمة الله وبركاته\n\n🎉 تهنئة بالإنجاز!\n\nيسعدنا إبلاغكم بتميز الطالب: ${student.name}\n⭐ إجمالي النقاط: ${progressData?.totalPoints || 0}\n🏅 الأوسمة: ${badgesData.length}\n\nنسأل الله له التوفيق والسداد 🤲`,
      absence_alert: `السلام عليكم ورحمة الله وبركاته\n\n⚠️ تنبيه غياب\n\nنود إبلاغكم بغياب الطالب: ${student.name}\nعدد مرات الغياب: ${attendanceCounts.absent}\n\nنرجو التواصل معنا لمعرفة السبب.\nبارك الله فيكم 🤲`,
      weekly_update: `السلام عليكم ورحمة الله وبركاته\n\n📋 تقرير أسبوعي - ${student.name}\n\n📊 الواجبات: ${portalCompleted}/${portalAssignments.length}\n📅 الحضور: ${attendanceCounts.rate}%\n⭐ النقاط: ${progressData?.totalPoints || 0}\n\nبارك الله فيكم 🤲`,
    };

    const message = templates[templateKey] || "";
    const url = phone ? getWhatsAppUrl(phone, message) : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // ==================== Effects ====================

  useEffect(() => {
    fetchLinks();
    fetchStudents();
    if (canManage) fetchSuggestedFamilies();
  }, []);

  useEffect(() => {
    if (portalStudentId) {
      fetchReports(portalStudentId);
      fetchProgress(portalStudentId);
    } else {
      setReports([]);
      setProgressData(null);
      setAttendanceData([]);
      setBadgesData([]);
      setPointsData([]);
    }
  }, [portalStudentId]);

  // ==================== Computed values ====================

  const filteredLinks = searchPhone ? links.filter(l => l.parentPhone.includes(searchPhone)) : links;
  const uniqueFamilies = new Set(links.map(l => l.parentPhone)).size;
  const totalChildren = links.length;
  const activeFamilies = new Set(links.filter(l => l.parentPhone).map(l => l.parentPhone)).size;

  const portalStudent = getPortalStudent();
  const portalAssignments = progressData?.assignments || [];
  const totalAssignments = portalAssignments.length;
  const completedAssignments = portalAssignments.filter(a => a.status === "done" || a.grade !== null).length;
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
  const attendanceCounts = getAttendanceCounts();
  const weeklyTrend = getWeeklyTrend();
  const maxWeekly = Math.max(...weeklyTrend, 1);

  // ==================== Render ====================

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-family-system">
          النظام العائلي
        </h1>
        <p className="text-muted-foreground">إدارة حسابات أولياء الأمور وتقارير الطلاب</p>
      </div>

      <Tabs defaultValue="family">
        <TabsList className="mb-4">
          <TabsTrigger value="family" className="gap-2">
            <Users className="w-4 h-4" />
            روابط الأسرة
          </TabsTrigger>
          <TabsTrigger value="portal" className="gap-2">
            <FileText className="w-4 h-4" />
            تقارير الأولياء
          </TabsTrigger>
        </TabsList>

        {/* ==================== تبويب روابط الأسرة ==================== */}
        <TabsContent value="family" className="space-y-4 md:space-y-6">
          {canManage && (
            <div className="flex gap-2 flex-wrap">
              <Dialog open={parentDialogOpen} onOpenChange={setParentDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" data-testid="button-create-parent-account">
                    <UserPlus className="w-4 h-4 ml-1" />
                    إنشاء حساب ولي أمر
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      إنشاء حساب ولي أمر جديد
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>هاتف ولي الأمر *</Label>
                      <Input
                        value={parentAccountPhone}
                        onChange={e => handleParentPhoneChange(e.target.value)}
                        placeholder="07xxxxxxxxx"
                        data-testid="input-parent-account-phone"
                      />
                      {detectingStudents && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          جاري البحث عن الطلاب...
                        </p>
                      )}
                    </div>

                    {detectedStudents.length > 0 && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          طلاب يحملون نفس الرقم ({detectedStudents.length})
                        </Label>
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto border rounded-lg p-2">
                          {detectedStudents.map(s => (
                            <label
                              key={s.id}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedStudentIds.includes(s.id)
                                  ? "bg-emerald-50 border border-emerald-200"
                                  : "bg-muted/50 hover:bg-muted"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(s.id)}
                                onChange={() => toggleStudentSelection(s.id)}
                                className="rounded"
                              />
                              <span className="text-sm font-medium">{s.name}</span>
                              {s.gender && (
                                <Badge variant="outline" className="text-[9px]">
                                  {s.gender === "male" || s.gender === "ذكر" ? "ذكر" : "أنثى"}
                                </Badge>
                              )}
                              {s.level && (
                                <Badge variant="secondary" className="text-[9px]">م{s.level}</Badge>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>إضافة طالب يدوياً</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <SearchableSelect
                            options={students.filter(s => !selectedStudentIds.includes(s.id)).map(s => ({ value: s.id, label: s.name }))}
                            value={manualStudentId}
                            onValueChange={setManualStudentId}
                            placeholder="ابحث واختر طالب..."
                            searchPlaceholder="ابحث عن طالب..."
                            emptyText="لا يوجد طالب"
                          />
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={addManualStudent} disabled={!manualStudentId}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {selectedStudentIds.length > 0 && (
                        <p className="text-xs text-emerald-600 font-medium">{selectedStudentIds.length} طالب مختار للربط</p>
                      )}
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="space-y-2">
                        <Label>الاسم الكامل *</Label>
                        <Input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="اسم ولي الأمر" data-testid="input-parent-name" />
                      </div>
                      <div className="space-y-2">
                        <Label>اسم المستخدم *</Label>
                        <Input value={parentUsername} onChange={e => setParentUsername(e.target.value)} placeholder="اسم المستخدم للدخول" data-testid="input-parent-username" />
                      </div>
                      <div className="space-y-2">
                        <Label>كلمة المرور *</Label>
                        <div className="relative">
                          <Input
                            type={showParentPassword ? "text" : "password"}
                            value={parentPassword}
                            onChange={e => setParentPassword(e.target.value)}
                            placeholder="كلمة المرور"
                            className="pl-10"
                            data-testid="input-parent-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowParentPassword(!showParentPassword)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showParentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>الجنس</Label>
                        <Select value={parentGender} onValueChange={setParentGender}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">ذكر</SelectItem>
                            <SelectItem value="female">أنثى</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateParentAccount}
                      disabled={!parentName || !parentUsername || !parentPassword || !parentAccountPhone || selectedStudentIds.length === 0 || parentSubmitting}
                      className="w-full"
                      data-testid="button-confirm-create-parent"
                    >
                      {parentSubmitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                      إنشاء حساب ولي الأمر ({selectedStudentIds.length} طالب)
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* نافذة نجاح إنشاء الحساب مع مشاركة */}
              <Dialog open={!!createdAccountInfo} onOpenChange={(open) => { if (!open) setCreatedAccountInfo(null); }}>
                <DialogContent className="sm:max-w-md" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="w-5 h-5" />
                      تم إنشاء الحساب بنجاح
                    </DialogTitle>
                  </DialogHeader>
                  {createdAccountInfo && (() => {
                    const info = createdAccountInfo;
                    const loginUrl = window.location.origin;
                    const messageText = `مرحباً ${info.name}\nتم إنشاء حسابك في نظام مُتْقِن\n\nاسم المستخدم: ${info.username}\nكلمة المرور: ${info.password}\nرابط الدخول: ${loginUrl}\n\nالطلاب المرتبطين: ${info.studentNames.join("، ")}`;
                    return (
                      <div className="space-y-3 mt-2">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">الاسم:</span><span className="font-semibold">{info.name}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">اسم المستخدم:</span><span className="font-mono font-semibold">{info.username}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">كلمة المرور:</span><span className="font-mono font-semibold">{info.password}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">الهاتف:</span><span dir="ltr" className="font-mono">{info.phone}</span></div>
                          <div className="flex justify-between items-start"><span className="text-muted-foreground shrink-0">الطلاب:</span><span className="text-left font-semibold">{info.studentNames.join("، ")}</span></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              navigator.clipboard.writeText(messageText);
                              toast({ title: "تم النسخ", description: "تم نسخ بيانات الحساب", className: "bg-green-50 border-green-200 text-green-800" });
                            }}
                          >
                            <Copy className="w-4 h-4" />
                            نسخ البيانات
                          </Button>
                          <Button
                            className="gap-2 bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              const waUrl = `https://wa.me/${info.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(messageText)}`;
                              window.open(waUrl, "_blank");
                            }}
                          >
                            <MessageCircle className="w-4 h-4" />
                            واتساب
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </DialogContent>
              </Dialog>

              <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-create-family-link">
                    <Plus className="w-4 h-4 ml-1" />
                    إنشاء رابط عائلي
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>إنشاء رابط عائلي جديد</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>هاتف ولي الأمر *</Label>
                      <Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="07xxxxxxxxx" data-testid="input-parent-phone" />
                    </div>
                    <div className="space-y-2">
                      <Label>اختر الطالب *</Label>
                      <SearchableSelect
                        options={students.map(s => ({ value: s.id, label: s.name }))}
                        value={linkStudentId}
                        onValueChange={setLinkStudentId}
                        placeholder="اختر الطالب"
                        searchPlaceholder="ابحث عن طالب..."
                        emptyText="لا يوجد طالب بهذا الاسم"
                        data-testid="select-student"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>صلة القرابة</Label>
                      <Select value={relationship} onValueChange={setRelationship}>
                        <SelectTrigger data-testid="select-relationship"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parent">ولي أمر</SelectItem>
                          <SelectItem value="guardian">وصي</SelectItem>
                          <SelectItem value="sibling">أخ/أخت</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreate} disabled={!parentPhone || !linkStudentId || submitting} className="w-full" data-testid="button-confirm-create-link">
                      {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                      إنشاء الرابط
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-t-4 border-t-blue-500" data-testid="card-stat-families">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي العائلات</p>
                    <p className="text-2xl font-bold">{uniqueFamilies}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-green-500" data-testid="card-stat-children">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الأبناء المرتبطين</p>
                    <p className="text-2xl font-bold">{totalChildren}</p>
                  </div>
                  <Baby className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-purple-500" data-testid="card-stat-active">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">العائلات النشطة</p>
                    <p className="text-2xl font-bold">{activeFamilies}</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md" data-testid="card-search-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                البحث عن عائلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={searchPhone}
                  onChange={e => setSearchPhone(e.target.value)}
                  placeholder="ابحث برقم هاتف ولي الأمر..."
                  className="flex-1"
                  data-testid="input-search-phone"
                />
                <Button onClick={handleSearchDashboard} disabled={!searchPhone || searching} data-testid="button-search-dashboard">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <BarChart3 className="w-4 h-4 ml-1" />}
                  عرض لوحة العائلة
                </Button>
              </div>
            </CardContent>
          </Card>

          {dashboard && (
            <Card className="shadow-md border-t-4 border-t-primary" data-testid="card-family-dashboard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  لوحة العائلة - {searchPhone}
                  <a href={`https://wa.me/964${searchPhone}`} target="_blank" rel="noopener noreferrer" className="mr-auto" data-testid="link-whatsapp-dashboard">
                    <Button size="sm" variant="outline" className="text-green-600 border-green-300">
                      <MessageCircle className="w-4 h-4 ml-1" />
                      واتساب
                    </Button>
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboard.children.map((child, idx) => (
                    <Card key={idx} className="border" data-testid={`card-dashboard-child-${idx}`}>
                      <CardContent className="pt-4 space-y-2">
                        <p className="font-semibold text-lg">{child.studentName}</p>
                        <Badge variant="outline">{relationshipMap[child.relationship] || child.relationship}</Badge>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm mt-3">
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-muted-foreground">الحضور</p>
                            <p className="font-bold text-blue-700">{child.attendance ?? "—"}</p>
                          </div>
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-muted-foreground">النقاط</p>
                            <p className="font-bold text-green-700">{child.points ?? "—"}</p>
                          </div>
                          <div className="bg-purple-50 rounded p-2">
                            <p className="text-muted-foreground">الواجبات</p>
                            <p className="font-bold text-purple-700">{child.assignments ?? "—"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {dashboard.children.length === 0 && (
                    <p className="text-muted-foreground col-span-full text-center py-4" data-testid="text-no-dashboard-children">
                      لا يوجد أبناء مرتبطين بهذا الرقم
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* عائلات مقترحة — اكتشاف تلقائي */}
          {canManage && suggestedFamilies.length > 0 && (
            <Card className="shadow-md border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <Star className="w-5 h-5" />
                  عائلات مقترحة ({suggestedFamilies.length})
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">اكتشاف تلقائي</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestedFamilies.map(family => (
                  <div key={family.groupKey} className="flex items-center justify-between p-3 bg-white dark:bg-stone-900 rounded-lg border">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={family.matchType === "teacher_parent" ? "default" : "secondary"} className="text-xs">
                          {family.matchType === "teacher_parent" ? "أستاذ = ولي أمر" : "رقم هاتف مشترك"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{family.matchValue}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {family.members.map(m => (
                          <span key={m.id} className="text-sm font-medium">
                            {m.name}
                            {m.role === "teacher" && <Badge variant="outline" className="text-xs mr-1">أستاذ</Badge>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                الروابط العائلية
              </CardTitle>
            </CardHeader>
            <CardContent>
              {linksLoading ? (
                <div className="flex items-center justify-center py-8" data-testid="status-loading-family-system">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
                </div>
              ) : filteredLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-links">
                  لا توجد روابط عائلية
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-family-links">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم هاتف ولي الأمر</TableHead>
                        <TableHead className="text-right">اسم الطالب</TableHead>
                        <TableHead className="text-right">صلة القرابة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLinks.map(link => (
                        <TableRow key={link.id} data-testid={`row-link-${link.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span data-testid={`text-phone-${link.id}`}>{link.parentPhone}</span>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-student-${link.id}`}>
                            {getStudentName(link.studentId, link.studentName)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" data-testid={`badge-relationship-${link.id}`}>
                              {relationshipMap[link.relationship] || link.relationship}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-date-${link.id}`}>{formatDateAr(link.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <a href={`https://wa.me/964${link.parentPhone}`} target="_blank" rel="noopener noreferrer" data-testid={`link-whatsapp-${link.id}`}>
                                <Button size="sm" variant="ghost" className="text-green-600">
                                  <MessageCircle className="w-4 h-4" />
                                </Button>
                              </a>
                              {canManage && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleDelete(link.id)}
                                  disabled={deletingId === link.id}
                                  data-testid={`button-delete-link-${link.id}`}
                                >
                                  {deletingId === link.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                              )}
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
        </TabsContent>

        {/* ==================== تبويب تقارير الأولياء ==================== */}
        <TabsContent value="portal" className="space-y-4 md:space-y-6">
          <Card dir="rtl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                اختيار الطالب
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="flex items-center justify-center py-6" data-testid="loading-students">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="mr-2 text-muted-foreground">جاري تحميل الطلاب...</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <div className="w-full sm:w-72">
                    <Label className="mb-2 block">الطالب</Label>
                    <SearchableSelect
                      options={students.map(s => ({ value: s.id, label: s.name }))}
                      value={portalStudentId}
                      onValueChange={setPortalStudentId}
                      placeholder="اختر طالباً..."
                      searchPlaceholder="ابحث عن طالب..."
                      emptyText="لا يوجد طالب بهذا الاسم"
                      data-testid="select-portal-student"
                    />
                  </div>
                  {portalStudentId && (
                    <Button onClick={() => setReportDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white gap-2" data-testid="button-generate-report">
                      <FileText className="w-4 h-4" />
                      إنشاء تقرير جديد
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {portalStudentId && portalStudent && (
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
                      {portalStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg" data-testid="text-student-name">{portalStudent.name}</h3>
                      <p className="text-sm text-muted-foreground" data-testid="text-student-username">@{portalStudent.username}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getLevelColor(portalStudent.level)}`} data-testid="badge-student-level">
                      🎓 {getLevelName(portalStudent.level)}
                    </span>
                    {portalStudent.isSpecialNeeds && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-violet-100 text-violet-700 border border-violet-300" data-testid="badge-special-needs">
                        <Heart className="w-3.5 h-3.5" />احتياجات خاصة
                      </span>
                    )}
                    {portalStudent.isOrphan && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-700 border border-rose-300" data-testid="badge-orphan">
                        <Heart className="w-3.5 h-3.5" />يتيم
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mr-auto">
                    {portalStudent.phone && (
                      <span className="flex items-center gap-1" data-testid="text-student-phone">
                        <Phone className="w-4 h-4" />{portalStudent.phone}
                      </span>
                    )}
                    {portalStudent.parentPhone && (
                      <span className="flex items-center gap-1" data-testid="text-parent-phone">
                        <Phone className="w-4 h-4 text-green-600" />ولي الأمر: {portalStudent.parentPhone}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {portalStudentId && (
            <Card dir="rtl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  ملخص تقدم الطالب: {portalStudent?.name}
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
                                background: "linear-gradient(180deg, #6366f1, #818cf8)",
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

          {portalStudentId && attendanceData.length > 0 && (
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
                    <div><p className="text-xs text-green-600">حاضر</p><p className="text-lg font-bold text-green-700">{attendanceCounts.present}</p></div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200" data-testid="badge-absent-count">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div><p className="text-xs text-red-600">غائب</p><p className="text-lg font-bold text-red-700">{attendanceCounts.absent}</p></div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200" data-testid="badge-late-count">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <div><p className="text-xs text-amber-600">متأخر</p><p className="text-lg font-bold text-amber-700">{attendanceCounts.late}</p></div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 border mr-auto" data-testid="text-attendance-rate">
                    <div>
                      <p className="text-xs text-muted-foreground">نسبة الحضور</p>
                      <p className={`text-2xl font-bold ${attendanceCounts.rate >= 80 ? "text-green-600" : attendanceCounts.rate >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {attendanceCounts.rate}%
                      </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${attendanceCounts.rate >= 80 ? "bg-green-500" : attendanceCounts.rate >= 60 ? "bg-amber-500" : "bg-red-500"}`} data-testid="indicator-attendance-rate" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {portalStudentId && portalStudent && (
            <Card dir="rtl" data-testid="card-whatsapp-templates">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  رسائل واتساب سريعة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "attendance_reminder", icon: <Calendar className="w-5 h-5 text-green-600" />, label: "تذكير بالحضور", color: "green" },
                    { key: "achievement", icon: <Star className="w-5 h-5 text-amber-600" />, label: "تهنئة بالإنجاز", color: "amber" },
                    { key: "absence_alert", icon: <AlertTriangle className="w-5 h-5 text-red-600" />, label: "تنبيه غياب", color: "red" },
                    { key: "weekly_update", icon: <FileText className="w-5 h-5 text-blue-600" />, label: "تقرير أسبوعي", color: "blue" },
                  ].map(({ key, icon, label, color }) => (
                    <div key={key} className={`flex items-center justify-between p-3 rounded-lg border bg-${color}-50/50 dark:bg-${color}-950/20 hover:bg-${color}-50 dark:hover:bg-${color}-950/30 transition-colors`}>
                      <div className="flex items-center gap-2">{icon}<span className="font-medium text-sm">{label}</span></div>
                      <Button size="sm" variant="outline" className={`gap-1 text-${color}-600 hover:text-${color}-700 border-${color}-300`} onClick={() => sendWhatsAppTemplate(key)} data-testid={`button-whatsapp-${key}`}>
                        <Send className="w-3.5 h-3.5" />إرسال
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {portalStudentId && (
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
                            <TableCell data-testid={`text-created-${report.id}`}>{formatDateAr(report.createdAt)}</TableCell>
                            <TableCell data-testid={`text-expires-${report.id}`}>
                              {report.expiresAt ? (
                                <span className={new Date(report.expiresAt) < new Date() ? "text-red-500" : ""}>
                                  {formatDateAr(report.expiresAt)}
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
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(getReportLink(report.accessToken))} className="gap-1" data-testid={`button-copy-${report.id}`}>
                                  <Copy className="w-3.5 h-3.5" />نسخ
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => shareViaWhatsApp(report)} className="gap-1 text-green-600 hover:text-green-700" data-testid={`button-whatsapp-${report.id}`}>
                                  <MessageCircle className="w-3.5 h-3.5" />واتساب
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteReport(report.id)} disabled={deletingReport === report.id} className="gap-1 text-red-500 hover:text-red-600" data-testid={`button-delete-${report.id}`}>
                                  {deletingReport === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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

          <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col" dir="rtl">
              <DialogHeader className="shrink-0">
                <DialogTitle>إنشاء تقرير جديد - {portalStudent?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2 overflow-y-auto flex-1 min-h-0 pl-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">نوع التقرير</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger data-testid="select-report-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">أسبوعي</SelectItem>
                        <SelectItem value="monthly">شهري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">تاريخ الانتهاء (اختياري)</Label>
                    <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} data-testid="input-expires-at" dir="ltr" />
                  </div>
                </div>
                {progressData && (() => {
                  const student = getPortalStudent();
                  const assignments = progressData.assignments;
                  const totalAssignments = assignments.length;
                  const completedAssignments = assignments.filter(a => a.status === "done" || a.grade !== null).length;
                  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
                  const attendanceCounts = getAttendanceCounts();
                  const categoryPoints = getPointsByCategory();
                  let progressDesc = "جيد";
                  if (completionRate >= 90) progressDesc = "ممتاز";
                  else if (completionRate >= 75) progressDesc = "جيد جداً";
                  else if (completionRate >= 60) progressDesc = "جيد";
                  else if (completionRate >= 40) progressDesc = "مقبول";
                  else progressDesc = "يحتاج تحسين";
                  const progressColor = completionRate >= 75 ? "text-green-600" : completionRate >= 40 ? "text-yellow-600" : "text-red-600";
                  return (
                    <div className="space-y-2" data-testid="text-report-preview">
                      <p className="font-semibold text-sm">معاينة محتوى التقرير:</p>
                      <div className="space-y-2 text-sm">
                        {/* المستوى */}
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          <span>🎓</span>
                          <span className="text-muted-foreground">المستوى:</span>
                          <span className="font-semibold">{student ? getLevelName(student.level) : ""}</span>
                        </div>
                        {/* الواجبات */}
                        <div className="bg-muted/50 rounded-lg px-3 py-2 space-y-1.5">
                          <div className="flex items-center gap-2 font-semibold text-xs">
                            <span>📊</span> إحصائيات الواجبات
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>الإجمالي: {totalAssignments}</span>
                            <span>المكتملة: {completedAssignments}</span>
                            <span>الإنجاز: {completionRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                          </div>
                        </div>
                        {/* الحضور */}
                        <div className="bg-muted/50 rounded-lg px-3 py-2 space-y-1.5">
                          <div className="flex items-center gap-2 font-semibold text-xs">
                            <span>📅</span> ملخص الحضور
                          </div>
                          <div className="grid grid-cols-4 gap-1 text-center text-xs">
                            <div><span className="block font-bold text-green-600">{attendanceCounts.present}</span><span className="text-muted-foreground">حاضر</span></div>
                            <div><span className="block font-bold text-red-600">{attendanceCounts.absent}</span><span className="text-muted-foreground">غائب</span></div>
                            <div><span className="block font-bold text-yellow-600">{attendanceCounts.late}</span><span className="text-muted-foreground">متأخر</span></div>
                            <div><span className="block font-bold text-primary">{attendanceCounts.rate}%</span><span className="text-muted-foreground">النسبة</span></div>
                          </div>
                        </div>
                        {/* النقاط */}
                        <div className="bg-muted/50 rounded-lg px-3 py-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-xs"><span>⭐</span> النقاط</div>
                            <span className="font-bold text-primary">{progressData.totalPoints}</span>
                          </div>
                          {Object.keys(categoryPoints).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {Object.entries(categoryPoints).map(([cat, amount]) => (
                                <span key={cat} className="inline-flex items-center gap-1 text-[10px] bg-background rounded px-1.5 py-0.5 border">
                                  {cat === "assignment" ? "واجبات" : cat === "attendance" ? "حضور" : cat === "behavior" ? "سلوك" : cat === "quran" ? "قرآن" : cat}: {amount}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* الأوسمة */}
                        {badgesData.length > 0 && (
                          <div className="bg-muted/50 rounded-lg px-3 py-2 space-y-1">
                            <div className="flex items-center gap-2 font-semibold text-xs"><span>🏅</span> الأوسمة ({badgesData.length})</div>
                            <div className="flex flex-wrap gap-1">
                              {badgesData.slice(-5).map((b, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] py-0">{b.badgeName}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* التقدم العام */}
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          <span>📈</span>
                          <span className="text-muted-foreground text-xs">التقدم العام:</span>
                          <span className={`font-bold text-sm ${progressColor}`}>{progressDesc}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="shrink-0 pt-2">
                <Button onClick={handleGenerateReport} disabled={generating} className="w-full gap-2" data-testid="button-submit-report">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                  إنشاء التقرير ومشاركته
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
