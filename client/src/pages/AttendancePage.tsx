import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Loader2, Save, Calendar, ClipboardList, Search,
  CheckCircle, XCircle, Clock, TrendingUp, Printer,
  Phone, CalendarDays, BarChart3, Users, AlertTriangle
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  avatar?: string;
  teacherId?: string | null;
  mosqueId?: string | null;
  parentPhone?: string | null;
  phone?: string | null;
}

interface AttendanceEntry {
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
  notes: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName?: string;
  date: string;
  status: string;
  notes?: string;
}

const statusLabels: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "معذور",
};

const statusColors: Record<string, string> = {
  present: "bg-green-100 text-green-800 border-green-200",
  absent: "bg-red-100 text-red-800 border-red-200",
  late: "bg-yellow-100 text-yellow-800 border-yellow-200",
  excused: "bg-blue-100 text-blue-800 border-blue-200",
};

const absenceReasons = [
  { value: "مرض", label: "مرض" },
  { value: "ظرف عائلي", label: "ظرف عائلي" },
  { value: "سفر", label: "سفر" },
  { value: "بدون عذر", label: "بدون عذر" },
  { value: "أخرى", label: "أخرى" },
];

const DAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("mark");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceEntry>>({});
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedToday, setSavedToday] = useState(false);

  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarData, setCalendarData] = useState<AttendanceRecord[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const [allHistory, setAllHistory] = useState<AttendanceRecord[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const isTeacher = user?.role === "teacher";
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";

  const todayStats = useMemo(() => {
    const entries = Object.values(attendanceData);
    const total = entries.length;
    const present = entries.filter(e => e.status === "present").length;
    const absent = entries.filter(e => e.status === "absent").length;
    const late = entries.filter(e => e.status === "late").length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, rate };
  }, [attendanceData]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users?role=student", { credentials: "include" });
      if (res.ok) {
        const data: Student[] = await res.json();
        setStudents(data);
        const initial: Record<string, AttendanceEntry> = {};
        data.forEach((s) => {
          initial[s.id] = { studentId: s.id, status: "present", notes: "" };
        });
        setAttendanceData(initial);
      } else {
        toast({ title: "خطأ", description: "فشل في تحميل بيانات الطلاب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async (date: string) => {
    try {
      const params = new URLSearchParams({ date });
      if (isTeacher && user?.id) params.set("teacherId", user.id);
      if (isSupervisor && user?.mosqueId) params.set("mosqueId", user.mosqueId);
      const res = await fetch(`/api/attendance?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        const records: AttendanceRecord[] = await res.json();
        if (records.length > 0) {
          const updated: Record<string, AttendanceEntry> = {};
          students.forEach((s) => {
            const existing = records.find(r => r.studentId === s.id);
            if (existing) {
              updated[s.id] = {
                studentId: s.id,
                status: existing.status as AttendanceEntry["status"],
                notes: existing.notes || "",
              };
            } else {
              updated[s.id] = { studentId: s.id, status: "present", notes: "" };
            }
          });
          setAttendanceData(updated);
          toast({ title: "تم التحميل", description: "تم تحميل بيانات الحضور المسجلة لهذا التاريخ" });
        }
      }
    } catch {
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      let url = "/api/attendance";
      const params = new URLSearchParams();
      if (isTeacher && user?.id) params.set("teacherId", user.id);
      if (isSupervisor && user?.mosqueId) params.set("mosqueId", user.mosqueId);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const qs = params.toString();
      if (qs) url += "?" + qs;

      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        setHistory(await res.json());
      } else {
        toast({ title: "خطأ", description: "فشل في تحميل سجل الحضور", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    setCalendarLoading(true);
    try {
      const firstDay = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
      const lastDayStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
      const params = new URLSearchParams({ dateFrom: firstDay, dateTo: lastDayStr });
      if (isTeacher && user?.id) params.set("teacherId", user.id);
      if (isSupervisor && user?.mosqueId) params.set("mosqueId", user.mosqueId);
      const res = await fetch(`/api/attendance?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        setCalendarData(await res.json());
      }
    } catch {
    } finally {
      setCalendarLoading(false);
    }
  };

  const fetchAllHistory = async () => {
    setStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (isTeacher && user?.id) params.set("teacherId", user.id);
      if (isSupervisor && user?.mosqueId) params.set("mosqueId", user.mosqueId);
      const res = await fetch(`/api/attendance?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        setAllHistory(await res.json());
      }
    } catch {
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0 && attendanceDate) {
      fetchExistingAttendance(attendanceDate);
    }
  }, [attendanceDate, students.length]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    } else if (activeTab === "calendar") {
      fetchCalendarData();
    } else if (activeTab === "statistics") {
      fetchAllHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "calendar") {
      fetchCalendarData();
    }
  }, [calendarMonth, calendarYear]);

  const updateStatus = (studentId: string, status: "present" | "absent" | "late" | "excused") => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status, notes: (status === "absent" || status === "excused") ? prev[studentId]?.notes || "" : "" },
    }));
  };

  const updateNotes = (studentId: string, notes: string) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  };

  const markAll = (status: "present" | "absent") => {
    setAttendanceData((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status, notes: "" };
      });
      return updated;
    });
  };

  const checkConsecutiveAbsences = async () => {
    try {
      const params = new URLSearchParams();
      if (isTeacher && user?.id) params.set("teacherId", user.id);
      if (isSupervisor && user?.mosqueId) params.set("mosqueId", user.mosqueId);
      const res = await fetch(`/api/attendance?${params.toString()}`, { credentials: "include" });
      if (!res.ok) return;
      const records: AttendanceRecord[] = await res.json();

      const absentStudents: string[] = [];
      const currentAbsent = Object.values(attendanceData).filter(e => e.status === "absent");

      currentAbsent.forEach((entry) => {
        const studentRecords = records
          .filter(r => r.studentId === entry.studentId && r.status === "absent")
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let consecutive = 1;
        for (let i = 0; i < studentRecords.length - 1; i++) {
          const curr = new Date(studentRecords[i].date);
          const next = new Date(studentRecords[i + 1].date);
          const diffDays = Math.round((curr.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 2) {
            consecutive++;
          } else {
            break;
          }
        }

        if (consecutive >= 3) {
          const student = students.find(s => s.id === entry.studentId);
          if (student) absentStudents.push(student.name);
        }
      });

      if (absentStudents.length > 0) {
        toast({
          title: "⚠️ تنبيه غياب متكرر",
          description: `الطلاب التالية أسماؤهم غائبون 3 أيام متتالية أو أكثر: ${absentStudents.join("، ")}`,
          variant: "destructive",
          duration: 10000,
        });
      }
    } catch {
    }
  };

  const handleSaveAll = async () => {
    setSubmitting(true);
    try {
      const studentsPayload = Object.values(attendanceData).map((entry) => ({
        studentId: entry.studentId,
        status: entry.status,
        notes: entry.notes,
      }));

      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date: attendanceDate, students: studentsPayload }),
      });

      if (res.ok) {
        toast({
          title: "تم بنجاح",
          description: "تم حفظ سجل الحضور بنجاح",
          className: "bg-green-50 border-green-200 text-green-800",
        });
        setSavedToday(true);
        checkConsecutiveAbsences();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في حفظ سجل الحضور", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = students.map((s, i) => {
      const entry = attendanceData[s.id];
      return `<tr>
        <td style="border:1px solid #ccc;padding:8px;text-align:center">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:8px;text-align:right">${s.name}</td>
        <td style="border:1px solid #ccc;padding:8px;text-align:center">${statusLabels[entry?.status || "present"]}</td>
        <td style="border:1px solid #ccc;padding:8px;text-align:right">${entry?.notes || "—"}</td>
      </tr>`;
    }).join("");

    printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8">
      <title>كشف الحضور - ${attendanceDate}</title>
      <style>
        body { font-family: 'Arial', sans-serif; padding: 30px; direction: rtl; }
        h1 { text-align: center; color: #1a5276; margin-bottom: 5px; }
        .info { text-align: center; color: #555; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #1a5276; color: white; padding: 10px; border: 1px solid #ccc; }
        @media print { body { padding: 10px; } }
      </style>
    </head><body>
      <h1>كشف الحضور والغياب</h1>
      <div class="info">
        <p>التاريخ: ${formatDateAr(attendanceDate)} | المعلم: ${user?.name || "—"}</p>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>اسم الطالب</th><th>الحالة</th><th>ملاحظات</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>setTimeout(()=>window.print(),500)</script>
    </body></html>`);
    printWindow.document.close();
  };

  const openWhatsApp = (student: Student) => {
    const phone = student.parentPhone || student.phone;
    if (!phone) {
      toast({ title: "خطأ", description: "لا يوجد رقم هاتف لولي أمر هذا الطالب", variant: "destructive" });
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      `السلام عليكم ورحمة الله وبركاته\nنود إبلاغكم بأن الطالب/ة ${student.name} كان غائباً اليوم ${formatDateAr(attendanceDate)}.\nنرجو التواصل مع إدارة الحلقة.\nجزاكم الله خيراً`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const filteredHistory = history.filter((record) => {
    if (filterSearch && !record.studentName?.includes(filterSearch)) return false;
    return true;
  });

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
    const startDay = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  }, [calendarMonth, calendarYear]);

  const getCalendarDayData = (day: number) => {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarData.filter(r => {
      const rDate = new Date(r.date).toISOString().split("T")[0];
      return rDate === dateStr;
    });
  };

  const selectedDateRecords = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return calendarData.filter(r => {
      const rDate = new Date(r.date).toISOString().split("T")[0];
      return rDate === selectedCalendarDate;
    });
  }, [selectedCalendarDate, calendarData]);

  const statsData = useMemo(() => {
    if (allHistory.length === 0) return { rate: 0, studentStats: [], best: [], worst: [] };

    const total = allHistory.length;
    const present = allHistory.filter(r => r.status === "present").length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    const byStudent: Record<string, { name: string; total: number; present: number }> = {};
    allHistory.forEach(r => {
      const name = r.studentName || r.studentId;
      if (!byStudent[r.studentId]) {
        byStudent[r.studentId] = { name, total: 0, present: 0 };
      }
      byStudent[r.studentId].total++;
      if (r.status === "present") byStudent[r.studentId].present++;
    });

    const studentStats = Object.entries(byStudent).map(([id, s]) => ({
      id,
      name: s.name,
      rate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
      total: s.total,
      present: s.present,
    })).sort((a, b) => b.rate - a.rate);

    const best = studentStats.slice(0, 5);
    const worst = [...studentStats].sort((a, b) => a.rate - b.rate).slice(0, 5);

    return { rate, studentStats, best, worst };
  }, [allHistory]);

  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" data-testid="attendance-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
            الحضور والغياب
          </h1>
          <p className="text-muted-foreground">إدارة حضور وغياب الطلاب</p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="gap-2" data-testid="button-print-attendance">
          <Printer className="w-4 h-4" />
          طباعة
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="stats-cards">
        <Card className="border-green-200 bg-green-50/50" data-testid="stat-card-present">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الحاضرون اليوم</p>
              <p className="text-xl font-bold text-green-700" data-testid="text-present-count">{todayStats.present}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50" data-testid="stat-card-absent">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الغائبون اليوم</p>
              <p className="text-xl font-bold text-red-700" data-testid="text-absent-count">{todayStats.absent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50" data-testid="stat-card-late">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-yellow-100">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المتأخرون اليوم</p>
              <p className="text-xl font-bold text-yellow-700" data-testid="text-late-count">{todayStats.late}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50" data-testid="stat-card-rate">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">نسبة الحضور</p>
              <p className="text-xl font-bold text-blue-700" data-testid="text-rate">{todayStats.rate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl" data-testid="tabs-attendance">
          <TabsTrigger value="mark" className="gap-1 text-xs sm:text-sm" data-testid="tab-mark-attendance">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">تسجيل الحضور</span>
            <span className="sm:hidden">تسجيل</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1 text-xs sm:text-sm" data-testid="tab-attendance-history">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">سجل الحضور</span>
            <span className="sm:hidden">السجل</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1 text-xs sm:text-sm" data-testid="tab-calendar">
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">التقويم</span>
            <span className="sm:hidden">التقويم</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="gap-1 text-xs sm:text-sm" data-testid="tab-statistics">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">الإحصائيات</span>
            <span className="sm:hidden">إحصائيات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mark">
          <Card dir="rtl">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-lg" data-testid="text-mark-title">تسجيل حضور الطلاب</CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="attendance-date">التاريخ:</Label>
                  <Input
                    id="attendance-date"
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-44"
                    dir="ltr"
                    data-testid="input-attendance-date"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAll("present")}
                  className="gap-1 border-green-300 text-green-700 hover:bg-green-50"
                  data-testid="button-mark-all-present"
                >
                  <CheckCircle className="w-4 h-4" />
                  تحديد الكل حاضر
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAll("absent")}
                  className="gap-1 border-red-300 text-red-700 hover:bg-red-50"
                  data-testid="button-mark-all-absent"
                >
                  <XCircle className="w-4 h-4" />
                  تحديد الكل غائب
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10" data-testid="loading-students">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground" data-testid="text-no-students">
                  لا يوجد طلاب
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table data-testid="table-mark-attendance">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right w-12">#</TableHead>
                          <TableHead className="text-right">الطالب</TableHead>
                          <TableHead className="text-center">حاضر</TableHead>
                          <TableHead className="text-center">غائب</TableHead>
                          <TableHead className="text-center">متأخر</TableHead>
                          <TableHead className="text-center">معذور</TableHead>
                          <TableHead className="text-right">السبب/ملاحظات</TableHead>
                          <TableHead className="text-center">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student, index) => {
                          const entry = attendanceData[student.id];
                          const showReason = entry?.status === "absent" || entry?.status === "excused";
                          const isAbsent = entry?.status === "absent";
                          return (
                            <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {student.avatar ? (
                                    <img
                                      src={student.avatar}
                                      alt={student.name}
                                      className="w-8 h-8 rounded-full object-cover"
                                      data-testid={`img-avatar-${student.id}`}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                      {student.name.charAt(0)}
                                    </div>
                                  )}
                                  <span data-testid={`text-student-name-${student.id}`}>{student.name}</span>
                                </div>
                              </TableCell>
                              {(["present", "absent", "late", "excused"] as const).map((statusVal) => {
                                const colorMap = {
                                  present: "border-green-500 text-green-500 data-[state=checked]:bg-green-500",
                                  absent: "border-red-500 text-red-500 data-[state=checked]:bg-red-500",
                                  late: "border-yellow-500 text-yellow-500 data-[state=checked]:bg-yellow-500",
                                  excused: "border-blue-500 text-blue-500 data-[state=checked]:bg-blue-500",
                                };
                                const isChecked = attendanceData[student.id]?.status === statusVal;
                                return (
                                  <TableCell key={statusVal} className="text-center">
                                    <button
                                      type="button"
                                      onClick={() => updateStatus(student.id, statusVal)}
                                      className={`w-5 h-5 rounded-full border-2 transition-all ${
                                        isChecked
                                          ? `${colorMap[statusVal]} scale-110`
                                          : "border-muted-foreground/30 hover:border-muted-foreground/60"
                                      }`}
                                      data-testid={`radio-${statusVal}-${student.id}`}
                                    >
                                      {isChecked && (
                                        <div className={`w-2.5 h-2.5 rounded-full mx-auto ${
                                          statusVal === "present" ? "bg-green-500" :
                                          statusVal === "absent" ? "bg-red-500" :
                                          statusVal === "late" ? "bg-yellow-500" :
                                          "bg-blue-500"
                                        }`} />
                                      )}
                                    </button>
                                  </TableCell>
                                );
                              })}
                              <TableCell>
                                {showReason ? (
                                  <Select
                                    value={entry?.notes || ""}
                                    onValueChange={(val) => updateNotes(student.id, val)}
                                    data-testid={`select-reason-${student.id}`}
                                  >
                                    <SelectTrigger className="min-w-[120px]" data-testid={`select-reason-trigger-${student.id}`}>
                                      <SelectValue placeholder="اختر السبب..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {absenceReasons.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    placeholder="ملاحظات..."
                                    value={attendanceData[student.id]?.notes || ""}
                                    onChange={(e) => updateNotes(student.id, e.target.value)}
                                    className="min-w-[120px]"
                                    data-testid={`input-notes-${student.id}`}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isAbsent && savedToday && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openWhatsApp(student)}
                                    className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    data-testid={`button-notify-parent-${student.id}`}
                                  >
                                    <Phone className="w-4 h-4" />
                                    <span className="hidden sm:inline">إبلاغ ولي الأمر</span>
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleSaveAll}
                      disabled={submitting || students.length === 0}
                      className="bg-primary hover:bg-primary/90 text-white gap-2"
                      data-testid="button-save-attendance"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ الحضور
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card dir="rtl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg" data-testid="text-history-title">سجل الحضور</CardTitle>
              <div className="flex flex-wrap items-end gap-3 mt-3">
                <div className="relative w-full sm:w-52">
                  <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن طالب..."
                    className="pr-8"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    data-testid="input-search-history"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <Label className="text-xs text-muted-foreground">من تاريخ</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    dir="ltr"
                    data-testid="input-filter-date-from"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    dir="ltr"
                    data-testid="input-filter-date-to"
                  />
                </div>
                <div className="w-full sm:w-36">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger data-testid="select-filter-status">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="present">حاضر</SelectItem>
                      <SelectItem value="absent">غائب</SelectItem>
                      <SelectItem value="late">متأخر</SelectItem>
                      <SelectItem value="excused">معذور</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={fetchHistory} className="gap-2" data-testid="button-filter-history">
                  <Search className="w-4 h-4" />
                  بحث
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-10" data-testid="loading-history">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground" data-testid="text-no-history">
                  لا توجد سجلات حضور
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-attendance-history">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">#</TableHead>
                        <TableHead className="text-right">الطالب</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((record, index) => (
                        <TableRow key={record.id || index} data-testid={`row-history-${record.id || index}`}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell data-testid={`text-history-student-${record.id}`}>
                            {record.studentName || record.studentId}
                          </TableCell>
                          <TableCell data-testid={`text-history-date-${record.id}`}>
                            {formatDateAr(record.date)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColors[record.status] || ""}
                              data-testid={`badge-status-${record.id}`}
                            >
                              {statusLabels[record.status] || record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground" data-testid={`text-history-notes-${record.id}`}>
                            {record.notes || "—"}
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

        <TabsContent value="calendar">
          <Card dir="rtl" data-testid="calendar-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2" data-testid="text-calendar-title">
                  <CalendarDays className="w-5 h-5" />
                  التقويم الشهري
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                      else setCalendarMonth(m => m - 1);
                    }}
                    data-testid="button-prev-month"
                  >
                    ←
                  </Button>
                  <span className="font-semibold min-w-[120px] text-center" data-testid="text-calendar-month">
                    {monthNames[calendarMonth]} {calendarYear}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                      else setCalendarMonth(m => m + 1);
                    }}
                    data-testid="button-next-month"
                  >
                    →
                  </Button>
                </div>
              </div>
              <div className="flex gap-3 mt-2 text-xs flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> حاضر</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> غائب</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> متأخر</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> معذور</span>
              </div>
            </CardHeader>
            <CardContent>
              {calendarLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {DAYS_AR.map((d) => (
                      <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
                    {calendarDays.map((day, idx) => {
                      if (day === null) return <div key={`empty-${idx}`} />;
                      const dayRecords = getCalendarDayData(day);
                      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isSelected = selectedCalendarDate === dateStr;
                      const presentCount = dayRecords.filter(r => r.status === "present").length;
                      const absentCount = dayRecords.filter(r => r.status === "absent").length;
                      const lateCount = dayRecords.filter(r => r.status === "late").length;
                      const excusedCount = dayRecords.filter(r => r.status === "excused").length;
                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedCalendarDate(isSelected ? null : dateStr)}
                          className={`p-1 sm:p-2 rounded-lg border text-center min-h-[50px] sm:min-h-[70px] transition-all hover:bg-accent ${
                            isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border"
                          } ${dayRecords.length > 0 ? "" : "opacity-60"}`}
                          data-testid={`calendar-day-${day}`}
                        >
                          <div className="text-sm font-medium">{day}</div>
                          {dayRecords.length > 0 && (
                            <div className="flex justify-center gap-0.5 mt-1 flex-wrap">
                              {presentCount > 0 && <span className="w-2 h-2 rounded-full bg-green-500" title={`${presentCount} حاضر`} />}
                              {absentCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500" title={`${absentCount} غائب`} />}
                              {lateCount > 0 && <span className="w-2 h-2 rounded-full bg-yellow-500" title={`${lateCount} متأخر`} />}
                              {excusedCount > 0 && <span className="w-2 h-2 rounded-full bg-blue-500" title={`${excusedCount} معذور`} />}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedCalendarDate && (
                    <div className="mt-4 border rounded-lg p-4" data-testid="calendar-day-details">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        تفاصيل يوم {formatDateAr(selectedCalendarDate)}
                      </h3>
                      {selectedDateRecords.length === 0 ? (
                        <p className="text-muted-foreground text-sm">لا توجد سجلات لهذا اليوم</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedDateRecords.map((r, i) => (
                            <div key={r.id || i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                              <span className="text-sm">{r.studentName || r.studentId}</span>
                              <Badge variant="outline" className={statusColors[r.status] || ""}>
                                {statusLabels[r.status] || r.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <Card dir="rtl" data-testid="statistics-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2" data-testid="text-statistics-title">
                <BarChart3 className="w-5 h-5" />
                الإحصائيات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : allHistory.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground" data-testid="text-no-stats">
                  لا توجد بيانات كافية للإحصائيات
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex justify-center" data-testid="overall-rate">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
                        <circle
                          cx="60" cy="60" r="50" fill="none"
                          stroke={statsData.rate >= 70 ? "#22c55e" : statsData.rate >= 50 ? "#eab308" : "#ef4444"}
                          strokeWidth="10"
                          strokeDasharray={`${(statsData.rate / 100) * 314} 314`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold" data-testid="text-overall-rate">{statsData.rate}%</span>
                        <span className="text-xs text-muted-foreground">نسبة الحضور العامة</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div data-testid="best-students">
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        أفضل الطلاب حضوراً
                      </h3>
                      <div className="space-y-2">
                        {statsData.best.map((s, i) => (
                          <div key={s.id} className="flex items-center gap-3" data-testid={`best-student-${i}`}>
                            <span className="text-sm font-medium w-6">{i + 1}.</span>
                            <span className="text-sm flex-1">{s.name}</span>
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.rate}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-green-700 w-10 text-left">{s.rate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div data-testid="worst-students">
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-4 h-4" />
                        أكثر الطلاب غياباً
                      </h3>
                      <div className="space-y-2">
                        {statsData.worst.map((s, i) => (
                          <div key={s.id} className="flex items-center gap-3" data-testid={`worst-student-${i}`}>
                            <span className="text-sm font-medium w-6">{i + 1}.</span>
                            <span className="text-sm flex-1">{s.name}</span>
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${s.rate}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-red-700 w-10 text-left">{s.rate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div data-testid="student-rates">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      نسبة حضور كل طالب
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {statsData.studentStats.map((s) => (
                        <div key={s.id} className="flex items-center gap-3" data-testid={`student-rate-${s.id}`}>
                          <span className="text-sm flex-1 min-w-[100px]">{s.name}</span>
                          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                s.rate >= 80 ? "bg-green-500" :
                                s.rate >= 60 ? "bg-yellow-500" :
                                "bg-red-500"
                              }`}
                              style={{ width: `${s.rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-12 text-left">{s.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
