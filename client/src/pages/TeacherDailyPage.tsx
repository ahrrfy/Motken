import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, CalendarDays, BookOpen, CheckCircle, Clock,
  AlertCircle, Users, MessageCircle, UserCheck, UserX,
  ChevronDown, ChevronUp, Send, Search, Filter, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getWhatsAppUrl } from "@/lib/phone-utils";

interface Student {
  id: string; name: string; avatar?: string;
  phone?: string; parentPhone?: string;
}
interface Assignment {
  id: string; studentId: string; surahName: string;
  fromVerse: number; toVerse: number; scheduledDate: string;
  status: string; type: string; grade?: number | null;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr), t = new Date();
  return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate();
}

export default function TeacherDailyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "present"|"absent"|"late">>({});
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [weeklyReports, setWeeklyReports] = useState<Record<string, any>>({});
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all"|"pending"|"done"|"cancelled">("all");
  const [filterType, setFilterType] = useState<"all"|"new"|"review">("all");
  const [filterAttendance, setFilterAttendance] = useState<"all"|"present"|"absent"|"late"|"unmarked">("all");

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [assignRes, studentRes, attendRes] = await Promise.all([
        fetch("/api/assignments", { credentials: "include" }),
        fetch("/api/users?role=student", { credentials: "include" }),
        fetch(`/api/attendance?date=${today}`, { credentials: "include" }),
      ]);
      if (assignRes.ok) setAssignments(await assignRes.json());
      if (studentRes.ok) setStudents(await studentRes.json());
      if (attendRes.ok) {
        const data = await attendRes.json();
        const map: Record<string, "present"|"absent"|"late"> = {};
        (data as any[]).forEach((a: any) => {
          if (["present","حاضر"].includes(a.status)) map[a.studentId] = "present";
          else if (["absent","غائب"].includes(a.status)) map[a.studentId] = "absent";
          else if (["late","متأخر"].includes(a.status)) map[a.studentId] = "late";
        });
        setAttendanceMap(map);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const todayAssignments = assignments.filter(a => isToday(a.scheduledDate));
  const studentMap = new Map<string, Student>();
  students.forEach(s => studentMap.set(s.id, s));

  const filteredGrouped = useMemo(() => {
    let filtered = todayAssignments;

    if (filterStatus !== "all") {
      filtered = filtered.filter(a => a.status === filterStatus);
    }
    if (filterType !== "all") {
      filtered = filtered.filter(a => filterType === "review" ? a.type === "review" : a.type !== "review");
    }

    const grouped = new Map<string, Assignment[]>();
    filtered.forEach(a => {
      grouped.set(a.studentId, [...(grouped.get(a.studentId) || []), a]);
    });

    if (searchTerm) {
      const term = searchTerm.trim();
      const result = new Map<string, Assignment[]>();
      grouped.forEach((assignments, studentId) => {
        const student = studentMap.get(studentId);
        const nameMatch = student?.name?.includes(term);
        const surahMatch = assignments.some(a => a.surahName.includes(term));
        if (nameMatch || surahMatch) result.set(studentId, assignments);
      });
      return result;
    }

    if (filterAttendance !== "all") {
      const result = new Map<string, Assignment[]>();
      grouped.forEach((assignments, studentId) => {
        const att = attendanceMap[studentId];
        if (filterAttendance === "unmarked" && !att) result.set(studentId, assignments);
        else if (att === filterAttendance) result.set(studentId, assignments);
      });
      return result;
    }

    return grouped;
  }, [todayAssignments, filterStatus, filterType, searchTerm, filterAttendance, attendanceMap, studentMap]);

  const handleComplete = async (assignmentId: string) => {
    const gradeStr = gradeInputs[assignmentId];
    const grade = gradeStr ? Number(gradeStr) : undefined;
    if (gradeStr && (isNaN(grade!) || grade! < 0 || grade! > 100)) {
      toast({ title: "الدرجة يجب أن تكون بين 0 و 100", variant: "destructive" });
      return;
    }
    setCompletingId(assignmentId);
    try {
      const body: any = { status: "done" };
      if (grade !== undefined) body.grade = grade;
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setAssignments(prev => prev.map(a => a.id===assignmentId ? {...a, status:"done", grade: grade ?? a.grade} : a));
        setGradeInputs(prev => { const n = {...prev}; delete n[assignmentId]; return n; });
        toast({ title: "تم الإتمام", description: grade !== undefined ? `الدرجة: ${grade}` : "تم منح النقاط تلقائياً" });
      }
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
    finally { setCompletingId(null); }
  };

  const handleAttendance = async (studentId: string, status: "present"|"absent"|"late") => {
    setSavingAttendance(studentId);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, status, date: new Date().toISOString(), teacherId: user?.id, mosqueId: user?.mosqueId }),
      });
      if (res.ok) {
        setAttendanceMap(prev => ({...prev, [studentId]: status}));
        const label = status==="present"?"حاضر":status==="absent"?"غائب":"متأخر";
        toast({ title: "تم التسجيل", description: `${studentMap.get(studentId)?.name}: ${label}` });
      }
    } catch { toast({ title: "خطأ في تسجيل الحضور", variant: "destructive" }); }
    finally { setSavingAttendance(null); }
  };

  const handleWeeklyReport = async (studentId: string) => {
    if (weeklyReports[studentId]) {
      setExpandedStudents(p => { const n=new Set(p); n.has(studentId)?n.delete(studentId):n.add(studentId); return n; });
      return;
    }
    setLoadingReport(studentId);
    try {
      const res = await fetch(`/api/weekly-report/${studentId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWeeklyReports(prev => ({...prev, [studentId]: data}));
        setExpandedStudents(prev => new Set([...prev, studentId]));
      }
    } catch { toast({ title: "خطأ في جلب التقرير", variant: "destructive" }); }
    finally { setLoadingReport(null); }
  };

  const totalAssignments = todayAssignments.length;
  const completedCount = todayAssignments.filter(a => a.status==="done").length;
  const pendingCount = todayAssignments.filter(a => a.status==="pending").length;
  const allStudentIds = new Set(todayAssignments.map(a => a.studentId));

  const hasActiveFilters = searchTerm || filterStatus !== "all" || filterType !== "all" || filterAttendance !== "all";
  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterType("all");
    setFilterAttendance("all");
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" data-testid="status-loading-teacher-daily">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-5xl mx-auto" dir="rtl">
      <div className="flex flex-wrap items-center gap-3">
        <CalendarDays className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold font-serif text-primary" data-testid="text-page-title-teacher-daily">واجبات اليوم</h1>
        <span className="text-sm text-muted-foreground mr-auto">
          {new Date().toLocaleDateString("ar-IQ", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="stats-summary">
        {[
          { icon:<Users className="w-5 h-5"/>, color:"blue", value:allStudentIds.size, label:"طلاب اليوم" },
          { icon:<BookOpen className="w-5 h-5"/>, color:"purple", value:totalAssignments, label:"إجمالي الواجبات" },
          { icon:<CheckCircle className="w-5 h-5"/>, color:"green", value:completedCount, label:"مكتملة" },
          { icon:<Clock className="w-5 h-5"/>, color:"yellow", value:pendingCount, label:"قيد الانتظار" },
        ].map(({icon,color,value,label},i) => (
          <Card key={i}><CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className={`p-2 bg-${color}-100 rounded-full text-${color}-600`}>{icon}</div>
            <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <Card className="bg-muted/30 border-dashed" data-testid="filters-section">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">تصفية</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-red-500 mr-auto" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="w-3 h-3" />
                مسح الفلاتر
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-44">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو السورة..."
                className="pr-8 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-daily"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-32 h-9 text-xs" data-testid="select-filter-status">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="done">مكتملة</SelectItem>
                <SelectItem value="cancelled">ملغية</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <SelectTrigger className="w-28 h-9 text-xs" data-testid="select-filter-type">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="new">جديد</SelectItem>
                <SelectItem value="review">مراجعة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAttendance} onValueChange={(v: any) => setFilterAttendance(v)}>
              <SelectTrigger className="w-32 h-9 text-xs" data-testid="select-filter-attendance">
                <SelectValue placeholder="الحضور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الطلاب</SelectItem>
                <SelectItem value="present">حاضر</SelectItem>
                <SelectItem value="absent">غائب</SelectItem>
                <SelectItem value="late">متأخر</SelectItem>
                <SelectItem value="unmarked">لم يُسجل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {todayAssignments.length === 0 ? (
        <Card><CardContent className="p-12 text-center" data-testid="status-empty">
          <AlertCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">لا توجد واجبات لهذا اليوم</p>
        </CardContent></Card>
      ) : filteredGrouped.size === 0 ? (
        <Card><CardContent className="p-8 text-center" data-testid="status-no-results">
          <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد نتائج مطابقة للفلاتر</p>
          <Button variant="link" className="text-sm mt-1" onClick={clearFilters}>مسح الفلاتر</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground" data-testid="text-filter-count">
              عرض {filteredGrouped.size} طالب من أصل {allStudentIds.size}
            </p>
          )}
          {Array.from(filteredGrouped.entries()).map(([studentId, studentAssignments]) => {
            const student = studentMap.get(studentId);
            const name = student?.name || "—";
            const att = attendanceMap[studentId];
            const isExp = expandedStudents.has(studentId);
            const report = weeklyReports[studentId];

            return (
              <Card key={studentId}
                className={`transition-colors ${att==="absent"?"border-red-200 bg-red-50/20":att==="present"?"border-green-200":""}`}
                data-testid={`card-student-${studentId}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {student?.avatar
                      ? <img src={student.avatar} alt={name} className="w-9 h-9 rounded-full border" />
                      : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border">{name.charAt(0)}</div>
                    }
                    <span data-testid={`text-student-name-${studentId}`}>{name}</span>
                    <Badge variant="secondary" className="mr-auto">{studentAssignments.length} واجب</Badge>
                    {att && (
                      <Badge variant="outline" className={att==="present"?"bg-green-100 text-green-700":att==="absent"?"bg-red-100 text-red-700":"bg-orange-100 text-orange-700"}>
                        {att==="present"?"حاضر":att==="absent"?"غائب":"متأخر"}
                      </Badge>
                    )}
                  </CardTitle>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {!att && <>
                      <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50 text-xs h-8"
                        disabled={savingAttendance===studentId} onClick={()=>handleAttendance(studentId,"present")} data-testid={`btn-present-${studentId}`}>
                        {savingAttendance===studentId ? <Loader2 className="w-3 h-3 animate-spin ml-1"/> : <UserCheck className="w-3 h-3 ml-1"/>} حاضر
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50 text-xs h-8"
                        disabled={savingAttendance===studentId} onClick={()=>handleAttendance(studentId,"absent")} data-testid={`btn-absent-${studentId}`}>
                        <UserX className="w-3 h-3 ml-1"/> غائب
                      </Button>
                      <Button size="sm" variant="outline" className="text-orange-700 border-orange-300 hover:bg-orange-50 text-xs h-8"
                        disabled={savingAttendance===studentId} onClick={()=>handleAttendance(studentId,"late")}>
                        <Clock className="w-3 h-3 ml-1"/> متأخر
                      </Button>
                    </>}
                    {student?.parentPhone && (
                      <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs h-8"
                        onClick={()=>window.open(getWhatsAppUrl(student.parentPhone!),"_blank")} data-testid={`btn-whatsapp-${studentId}`}>
                        <MessageCircle className="w-3 h-3 ml-1"/> واتساب ولي الأمر
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50 text-xs h-8"
                      disabled={loadingReport===studentId} onClick={()=>handleWeeklyReport(studentId)} data-testid={`btn-weekly-${studentId}`}>
                      {loadingReport===studentId ? <Loader2 className="w-3 h-3 animate-spin ml-1"/> : isExp ? <ChevronUp className="w-3 h-3 ml-1"/> : <ChevronDown className="w-3 h-3 ml-1"/>}
                      التقرير الأسبوعي
                    </Button>
                  </div>

                  {isExp && report && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100 space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-white rounded p-2">
                          <p className="font-bold text-green-700">{report.stats?.present}/{(report.stats?.present||0)+(report.stats?.absent||0)}</p>
                          <p className="text-xs text-muted-foreground">الحضور</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="font-bold text-blue-700">{report.stats?.done}/{(report.stats?.done||0)+(report.stats?.pending||0)}</p>
                          <p className="text-xs text-muted-foreground">الواجبات</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="font-bold text-amber-700">+{report.stats?.weekPoints||0}</p>
                          <p className="text-xs text-muted-foreground">النقاط</p>
                        </div>
                      </div>
                      {report.whatsappUrl && (
                        <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          onClick={()=>window.open(report.whatsappUrl,"_blank")}>
                          <Send className="w-3 h-3 ml-1"/> إرسال التقرير لولي الأمر عبر واتساب
                        </Button>
                      )}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {studentAssignments.map(a => (
                      <div key={a.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 rounded-lg border bg-muted/20 gap-2" data-testid={`row-assignment-${a.id}`}>
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-primary/60 shrink-0"/>
                          <div>
                            <p className="text-sm font-medium">{a.surahName}</p>
                            <p className="text-xs text-muted-foreground">الآيات {a.fromVerse} - {a.toVerse}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{a.type==="review"?"مراجعة":"جديد"}</Badge>
                          {a.status === "done" && a.grade != null && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {a.grade}%
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-xs ${a.status==="done"?"bg-green-100 text-green-700":a.status==="cancelled"?"bg-gray-100 text-gray-500":"bg-yellow-100 text-yellow-700"}`}>
                            {a.status==="done"?"تم":a.status==="cancelled"?"ملغي":"قيد الانتظار"}
                          </Badge>
                          {a.status==="pending" && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="الدرجة"
                                className="w-16 h-7 text-xs text-center px-1"
                                value={gradeInputs[a.id] || ""}
                                onChange={(e) => setGradeInputs(prev => ({...prev, [a.id]: e.target.value}))}
                                onKeyDown={(e) => { if (e.key === "Enter") handleComplete(a.id); }}
                                data-testid={`input-grade-${a.id}`}
                              />
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                                disabled={completingId===a.id} onClick={()=>handleComplete(a.id)} data-testid={`btn-complete-${a.id}`}>
                                {completingId===a.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <><CheckCircle className="w-3 h-3"/>أتمّ</>}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
