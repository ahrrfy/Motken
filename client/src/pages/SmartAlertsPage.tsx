import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/phone-utils";
import { useLocation } from "wouter";
import {
  AlertTriangle, AlertCircle, Info, CheckCircle, Bell,
  Search, MessageCircle, Loader2, Shield, TrendingDown,
  Clock, Flame, ArrowUp, X, ExternalLink, Users, PartyPopper,
  BookOpen, RefreshCw, PlusCircle, Coins, ChevronDown, ChevronUp,
  CalendarDays
} from "lucide-react";

interface SmartAlert {
  id: string;
  severity: "critical" | "warning" | "info" | "positive";
  title: string;
  description: string;
  studentId?: string;
  studentName?: string;
  parentPhone?: string;
  actionType?: "whatsapp" | "link" | "mixed";
  actionUrl?: string;
  actionLabel?: string;
  timestamp: Date;
  dismissed: boolean;
  type?: "absence" | "low-grade" | "overdue" | "streak" | "levelup";
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    label: "حرج",
  },
  warning: {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    label: "تحذير",
  },
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    label: "معلومات",
  },
  positive: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-800",
    badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    label: "إيجابي",
  },
};

type SeverityFilter = "all" | "critical" | "warning" | "info" | "positive";

export default function SmartAlertsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [assignmentsData, setAssignmentsData] = useState<any[]>([]);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateFrom = sevenDaysAgo.toISOString().split("T")[0];

      const [attendanceRes, assignmentsRes, studentsRes] = await Promise.allSettled([
        fetch(`/api/attendance?dateFrom=${dateFrom}`, { credentials: "include" }),
        fetch("/api/assignments", { credentials: "include" }),
        fetch("/api/students", { credentials: "include" }),
      ]);

      if (attendanceRes.status === "fulfilled" && attendanceRes.value.ok) {
        const data = await attendanceRes.value.json();
        setAttendanceData(Array.isArray(data) ? data : []);
      }
      if (assignmentsRes.status === "fulfilled" && assignmentsRes.value.ok) {
        const data = await assignmentsRes.value.json();
        setAssignmentsData(Array.isArray(data) ? data : []);
      }
      if (studentsRes.status === "fulfilled" && studentsRes.value.ok) {
        const data = await studentsRes.value.json();
        setStudentsData(Array.isArray(data) ? data : []);
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 120000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const studentsMap = useMemo(() => {
    const map = new Map<number | string, any>();
    studentsData.forEach((s) => map.set(s.id, s));
    return map;
  }, [studentsData]);

  const alerts: SmartAlert[] = useMemo(() => {
    const result: SmartAlert[] = [];
    const now = new Date();

    const absencesByStudent = new Map<number | string, { count: number; name: string; lastDate: string; parentPhone?: string }>();
    attendanceData.forEach((record) => {
      if (record.status === "absent" || record.status === "غائب") {
        const studentId = record.studentId || record.student_id;
        const student = studentsMap.get(studentId);
        const studentName = record.studentName || record.student_name || student?.name || `طالب #${studentId}`;
        const parentPhone = record.parentPhone || record.parent_phone || student?.parentPhone || student?.parent_phone;
        const existing = absencesByStudent.get(studentId);
        if (existing) {
          existing.count++;
          if (record.date > existing.lastDate) existing.lastDate = record.date;
        } else {
          absencesByStudent.set(studentId, {
            count: 1,
            name: studentName,
            lastDate: record.date || new Date().toISOString(),
            parentPhone,
          });
        }
      }
    });

    absencesByStudent.forEach((info, studentId) => {
      if (info.count >= 2) {
        result.push({
          id: `absence-${studentId}`,
          severity: "critical",
          title: `غياب متكرر: ${info.name}`,
          description: `غاب ${info.count} أيام متتالية. آخر حضور: ${formatDateAr(info.lastDate)}`,
          studentId: String(studentId),
          studentName: info.name,
          parentPhone: info.parentPhone,
          actionType: info.parentPhone ? "whatsapp" : "link",
          actionUrl: info.parentPhone
            ? getWhatsAppUrl(info.parentPhone, `السلام عليكم، نود إبلاغكم بأن الطالب ${info.name} غاب ${info.count} أيام متتالية. نرجو التواصل مع الإدارة.`)
            : `/students`,
          actionLabel: info.parentPhone ? "تواصل مع ولي الأمر" : "عرض التفاصيل",
          timestamp: new Date(info.lastDate || now),
          dismissed: false,
          type: "absence",
        });
      }
    });

    assignmentsData.forEach((assignment) => {
      const grade = assignment.grade ?? assignment.score;
      if (grade !== undefined && grade !== null && grade < 60) {
        const studentId = assignment.studentId || assignment.student_id;
        const student = studentsMap.get(studentId);
        const studentName = assignment.studentName || assignment.student_name || student?.name || `طالب #${studentId}`;
        const parentPhone = student?.parentPhone || student?.parent_phone;
        result.push({
          id: `low-grade-${assignment.id}`,
          severity: "warning",
          title: `أداء منخفض: ${studentName}`,
          description: `حصل على ${grade} في "${assignment.title || assignment.subject || "واجب"}" - أقل من الحد الأدنى (60)`,
          studentId: String(studentId),
          studentName,
          parentPhone,
          actionType: parentPhone ? "whatsapp" : "link",
          actionUrl: parentPhone
            ? getWhatsAppUrl(parentPhone, `السلام عليكم، نود إبلاغكم بأن الطالب ${studentName} حصل على درجة ${grade} وهي أقل من المطلوب.`)
            : `/students`,
          actionLabel: parentPhone ? "تواصل مع ولي الأمر" : "عرض الطالب",
          timestamp: new Date(assignment.updatedAt || assignment.createdAt || now),
          dismissed: false,
          type: "low-grade",
        });
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    assignmentsData.forEach((assignment) => {
      const status = assignment.status;
      const scheduledDate = assignment.scheduledDate || assignment.scheduled_date || assignment.dueDate || assignment.due_date;
      if (scheduledDate && (status === "pending" || status === "معلق" || !status)) {
        const dueDate = new Date(scheduledDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          const studentId = assignment.studentId || assignment.student_id;
          const student = studentsMap.get(studentId);
          const studentName = assignment.studentName || assignment.student_name || student?.name || "";
          result.push({
            id: `overdue-${assignment.id}`,
            severity: "info",
            title: `واجب متأخر${studentName ? `: ${studentName}` : ""}`,
            description: `"${assignment.title || "واجب"}" كان مستحقاً في ${formatDateAr(scheduledDate)} ولم يُنجز بعد`,
            studentId: studentId ? String(studentId) : undefined,
            studentName: studentName || undefined,
            actionType: "link",
            actionUrl: `/assignments`,
            actionLabel: "عرض الواجبات",
            timestamp: new Date(scheduledDate),
            dismissed: false,
            type: "overdue",
          });
        }
      }
    });

    studentsData.forEach((student) => {
      const streak = student.streak || student.currentStreak || 0;
      if (streak >= 30) {
        result.push({
          id: `streak-30-${student.id}`,
          severity: "positive",
          title: `إنجاز رائع: ${student.name}`,
          description: `حقق سلسلة حضور مذهلة بلغت ${streak} يوماً متتالياً! 🎉`,
          studentId: String(student.id),
          studentName: student.name,
          actionType: "link",
          actionUrl: `/students`,
          actionLabel: "عرض الملف",
          timestamp: new Date(),
          dismissed: false,
          type: "streak",
        });
      } else if (streak >= 14) {
        result.push({
          id: `streak-14-${student.id}`,
          severity: "positive",
          title: `مواظبة ممتازة: ${student.name}`,
          description: `سلسلة حضور متواصلة بلغت ${streak} يوماً 🔥`,
          studentId: String(student.id),
          studentName: student.name,
          actionType: "link",
          actionUrl: `/students`,
          actionLabel: "عرض الملف",
          timestamp: new Date(),
          dismissed: false,
          type: "streak",
        });
      } else if (streak >= 7) {
        result.push({
          id: `streak-7-${student.id}`,
          severity: "positive",
          title: `بداية قوية: ${student.name}`,
          description: `أكمل ${streak} أيام حضور متتالية ⭐`,
          studentId: String(student.id),
          studentName: student.name,
          actionType: "link",
          actionUrl: `/students`,
          actionLabel: "عرض الملف",
          timestamp: new Date(),
          dismissed: false,
          type: "streak",
        });
      }
    });

    studentsData.forEach((student) => {
      const level = student.level || student.currentLevel || 0;
      const progress = student.progress || student.memorizedPages || student.memorized || 0;
      const nextLevelThreshold = (level + 1) * 5;
      const remaining = nextLevelThreshold - progress;
      if (remaining > 0 && remaining <= 2 && progress > 0) {
        result.push({
          id: `levelup-${student.id}`,
          severity: "positive",
          title: `قريب من الترقية: ${student.name}`,
          description: `يحتاج ${remaining} صفحة فقط للانتقال إلى المستوى ${level + 1} 📈`,
          studentId: String(student.id),
          studentName: student.name,
          actionType: "link",
          actionUrl: `/students`,
          actionLabel: "عرض التقدم",
          timestamp: new Date(),
          dismissed: false,
          type: "levelup",
        });
      }
    });

    result.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2, positive: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return result;
  }, [attendanceData, assignmentsData, studentsData, studentsMap]);

  const filteredAlerts = useMemo(() => {
    let list = alerts.filter((alert) => {
      if (dismissedIds.has(alert.id)) return false;
      if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = alert.studentName?.toLowerCase().includes(q);
        const matchTitle = alert.title.toLowerCase().includes(q);
        const matchDesc = alert.description.toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchDesc) return false;
      }
      return true;
    });

    if (!showAll && severityFilter === "all" && !searchQuery.trim()) {
      return list.slice(0, 3);
    }
    return list;
  }, [alerts, dismissedIds, severityFilter, searchQuery, showAll]);

  const weeklySummary = useMemo(() => {
    const last7Days = alerts.filter(a => {
      const diff = new Date().getTime() - a.timestamp.getTime();
      return diff <= 7 * 24 * 60 * 60 * 1000;
    });

    return {
      total: last7Days.length,
      absences: last7Days.filter(a => a.type === "absence").length,
      lowGrades: last7Days.filter(a => a.type === "low-grade").length,
      streaks: last7Days.filter(a => a.type === "streak").length,
    };
  }, [alerts]);

  const handleAwardPoints = async (studentId: string) => {
    try {
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: parseInt(studentId),
          points: 10,
          reason: "مكافأة تشجيعية من التنبيهات الذكية",
          category: "behavior"
        }),
      });
      if (res.ok) {
        toast({ title: "تم منح النقاط", description: "تم منح 10 نقاط للطالب بنجاح" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في منح النقاط", variant: "destructive" });
    }
  };

  const stats = useMemo(() => {
    const active = alerts.filter((a) => !dismissedIds.has(a.id));
    return {
      total: active.length,
      critical: active.filter((a) => a.severity === "critical").length,
      warning: active.filter((a) => a.severity === "warning").length,
      info: active.filter((a) => a.severity === "info").length,
      positive: active.filter((a) => a.severity === "positive").length,
    };
  }, [alerts, dismissedIds]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(Array.from(prev));
      next.add(id);
      return next;
    });
  };

  const handleDismissAll = () => {
    const allIds = filteredAlerts.map((a) => a.id);
    setDismissedIds((prev) => {
      const next = new Set(Array.from(prev));
      allIds.forEach((id) => next.add(id));
      return next;
    });
    toast({ title: "تم", description: "تم تجاهل جميع التنبيهات المعروضة" });
  };

  const summaryCards = [
    { title: "إجمالي التنبيهات", value: stats.total, icon: Bell, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-800" },
    { title: "تنبيهات حرجة", value: stats.critical, icon: Shield, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900" },
    { title: "تحذيرات", value: stats.warning, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900" },
    { title: "معلومات", value: stats.info, icon: Info, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900" },
  ];

  const filterOptions: { value: SeverityFilter; label: string }[] = [
    { value: "all", label: "الكل" },
    { value: "critical", label: "حرج" },
    { value: "warning", label: "تحذير" },
    { value: "info", label: "معلومات" },
    { value: "positive", label: "إيجابي" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="loading-smart-alerts">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">جارٍ تحليل البيانات وإنشاء التنبيهات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl" data-testid="smart-alerts-page">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-serif" data-testid="text-page-title-smart-alerts">
            مركز التنبيهات الذكية
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
            تحليل تلقائي للحضور والأداء والواجبات مع تنبيهات فورية
          </p>
        </div>
        <div className="flex gap-2">
          {filteredAlerts.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleDismissAll} data-testid="button-dismiss-all">
              <X className="w-4 h-4 ml-1" />
              تجاهل الكل
            </Button>
          )}
          <Button variant="outline" onClick={fetchAllData} data-testid="button-refresh-alerts">
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {summaryCards.map((card, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow" data-testid={`card-summary-${i}`}>
            <CardContent className="p-3 md:p-6 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">{card.title}</p>
                <h3 className="text-lg md:text-2xl font-bold" data-testid={`text-summary-value-${i}`}>{card.value}</h3>
              </div>
              <div className={`p-2 md:p-3 rounded-full ${card.bg} shrink-0`}>
                <card.icon className={`w-4 h-4 md:w-6 md:h-6 ${card.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-none" data-testid="filter-bar">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو العنوان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
                data-testid="input-search-alerts"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {filterOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={severityFilter === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSeverityFilter(opt.value); setShowAll(true); }}
                  data-testid={`button-filter-${opt.value}`}
                  className="text-xs"
                >
                  {opt.label}
                  {opt.value !== "all" && (
                    <Badge variant="secondary" className="mr-1 text-[10px] px-1.5 py-0">
                      {opt.value === "critical" ? stats.critical : opt.value === "warning" ? stats.warning : opt.value === "info" ? stats.info : stats.positive}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-none bg-primary/5">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            ملخص الأسبوع الماضي
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div className="text-center p-2 rounded-lg bg-background border">
              <p className="text-[10px] text-muted-foreground">تنبيهات غياب</p>
              <p className="text-lg font-bold text-red-600">{weeklySummary.absences}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background border">
              <p className="text-[10px] text-muted-foreground">أداء منخفض</p>
              <p className="text-lg font-bold text-amber-600">{weeklySummary.lowGrades}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background border">
              <p className="text-[10px] text-muted-foreground">إنجازات متميزة</p>
              <p className="text-lg font-bold text-green-600">{weeklySummary.streaks}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background border">
              <p className="text-[10px] text-muted-foreground">إجمالي الفعاليات</p>
              <p className="text-lg font-bold text-primary">{weeklySummary.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredAlerts.length === 0 ? (
        <Card className="shadow-sm border-none" data-testid="empty-state-alerts">
          <CardContent className="p-8 text-center text-muted-foreground">
            <PartyPopper className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium" data-testid="text-empty-message">
              {alerts.length === 0
                ? "لا توجد تنبيهات! كل شيء يسير بشكل ممتاز 🎉"
                : "لا توجد تنبيهات تطابق الفلتر المحدد"}
            </p>
            {alerts.length > 0 && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => { setSeverityFilter("all"); setSearchQuery(""); setShowAll(true); }}
                data-testid="button-clear-filters"
              >
                مسح الفلاتر
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="alerts-list">
          {filteredAlerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const SeverityIcon = config.icon;

            return (
              <Card
                key={alert.id}
                className={`shadow-sm border ${config.border} ${config.bg} transition-all hover:shadow-md`}
                data-testid={`alert-card-${alert.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full shrink-0 mt-0.5 ${config.badge}`}>
                      <SeverityIcon className={`w-4 h-4 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm md:text-base truncate" data-testid={`text-alert-title-${alert.id}`}>
                            {alert.title}
                          </h3>
                          <p className="text-xs md:text-sm text-muted-foreground mt-0.5" data-testid={`text-alert-desc-${alert.id}`}>
                            {alert.description}
                          </p>
                        </div>
                        <Badge className={`${config.badge} shrink-0 text-[10px]`} data-testid={`badge-severity-${alert.id}`}>
                          {config.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-alert-time-${alert.id}`}>
                          <Clock className="w-3 h-3" />
                          {formatDateAr(alert.timestamp)}
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {alert.parentPhone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2 border-green-200 text-green-700 hover:bg-green-50"
                              onClick={() => {
                                const url = getWhatsAppUrl(alert.parentPhone!, `السلام عليكم، بخصوص الطالب ${alert.studentName}: ${alert.description}`);
                                window.open(url, "_blank");
                              }}
                              data-testid={`button-contact-parent-${alert.id}`}
                            >
                              <MessageCircle className="w-3 h-3 ml-1" />
                              تواصل واتساب
                            </Button>
                          )}

                          {alert.type === "low-grade" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => setLocation(`/assignments?studentId=${alert.studentId}&action=create-review`)}
                              data-testid={`button-create-review-${alert.id}`}
                            >
                              <PlusCircle className="w-3 h-3 ml-1" />
                              إنشاء مراجعة
                            </Button>
                          )}

                          {alert.severity === "positive" && alert.studentId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                              onClick={() => handleAwardPoints(alert.studentId!)}
                              data-testid={`button-award-points-${alert.id}`}
                            >
                              <Coins className="w-3 h-3 ml-1" />
                              منح نقاط
                            </Button>
                          )}

                          {alert.actionUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              data-testid={`button-action-${alert.id}`}
                              onClick={() => {
                                if (alert.actionType === "whatsapp" && alert.actionUrl) {
                                  window.open(alert.actionUrl, "_blank");
                                } else if (alert.actionUrl) {
                                  setLocation(alert.actionUrl);
                                }
                              }}
                            >
                              <ExternalLink className="w-3 h-3 ml-1" />
                              {alert.actionLabel || "عرض"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDismiss(alert.id)}
                            data-testid={`button-dismiss-${alert.id}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!showAll && alerts.length > 3 && severityFilter === "all" && !searchQuery && (
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setShowAll(true)}
              data-testid="button-show-all-alerts"
            >
              عرض الكل ({alerts.length})
              <ChevronDown className="w-4 h-4 mr-2" />
            </Button>
          )}
          {showAll && alerts.length > 3 && severityFilter === "all" && !searchQuery && (
            <Button
              variant="ghost"
              className="w-full mt-2 text-muted-foreground"
              onClick={() => setShowAll(false)}
              data-testid="button-show-less-alerts"
            >
              عرض أقل
              <ChevronUp className="w-4 h-4 mr-2" />
            </Button>
          )}
        </div>
      )}

      {stats.positive > 0 && severityFilter === "all" && (
        <Card className="shadow-sm border-none bg-gradient-to-l from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950" data-testid="positive-summary-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <Flame className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-lg text-green-800 dark:text-green-200" data-testid="text-positive-count">
                  {stats.positive} إنجاز إيجابي
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  طلاب يحققون تقدماً ملموساً ويستحقون التشجيع
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
