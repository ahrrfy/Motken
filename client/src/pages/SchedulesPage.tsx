import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  CalendarDays, Plus, Trash2, Pencil, Loader2, MapPin, Clock,
  Printer, Play, Pause, Copy, AlertTriangle, Eye, EyeOff, List, Grid, Filter, Users
} from "lucide-react";

interface ScheduleData {
  id: string;
  mosqueId: string | null;
  teacherId: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  teacherName?: string;
}

interface TeacherUser {
  id: string;
  name: string;
  username: string;
}

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const TEACHER_COLORS = [
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-green-100 border-green-300 text-green-800",
  "bg-purple-100 border-purple-300 text-purple-800",
  "bg-orange-100 border-orange-300 text-orange-800",
  "bg-pink-100 border-pink-300 text-pink-800",
  "bg-teal-100 border-teal-300 text-teal-800",
  "bg-indigo-100 border-indigo-300 text-indigo-800",
  "bg-yellow-100 border-yellow-300 text-yellow-800",
  "bg-red-100 border-red-300 text-red-800",
  "bg-cyan-100 border-cyan-300 text-cyan-800",
];

const TEACHER_BG_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500",
  "bg-teal-500", "bg-indigo-500", "bg-yellow-500", "bg-red-500", "bg-cyan-500",
];

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
];

const TIME_LABELS: Record<string, string> = {
  "06:00": "6:00 ص", "07:00": "7:00 ص", "08:00": "8:00 ص", "09:00": "9:00 ص",
  "10:00": "10:00 ص", "11:00": "11:00 ص", "12:00": "12:00 م",
  "13:00": "1:00 م", "14:00": "2:00 م", "15:00": "3:00 م", "16:00": "4:00 م",
  "17:00": "5:00 م", "18:00": "6:00 م", "19:00": "7:00 م", "20:00": "8:00 م",
  "21:00": "9:00 م", "22:00": "10:00 م",
};

export default function SchedulesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showInactive, setShowInactive] = useState(true);
  const [filterTeacherId, setFilterTeacherId] = useState<string>("all");
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const isTeacher = user?.role === "teacher";
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";
  const canManage = isTeacher || isSupervisor || isAdmin;

  const todayDayOfWeek = new Date().getDay();

  const teacherColorMap = useMemo(() => {
    const map = new Map<string, number>();
    const uniqueTeachers = Array.from(new Set(schedules.map(s => s.teacherId)));
    uniqueTeachers.forEach((tid, idx) => {
      map.set(tid, idx % TEACHER_COLORS.length);
    });
    return map;
  }, [schedules]);

  const getTeacherColor = (teacherId: string) => {
    const idx = teacherColorMap.get(teacherId) ?? 0;
    return TEACHER_COLORS[idx];
  };

  const getTeacherDotColor = (teacherId: string) => {
    const idx = teacherColorMap.get(teacherId) ?? 0;
    return TEACHER_BG_COLORS[idx];
  };

  const filteredSchedules = useMemo(() => {
    let result = schedules;
    if (!showInactive) {
      result = result.filter(s => s.isActive);
    }
    if (filterTeacherId !== "all") {
      result = result.filter(s => s.teacherId === filterTeacherId);
    }
    return result;
  }, [schedules, showInactive, filterTeacherId]);

  const activeSchedules = useMemo(() => schedules.filter(s => s.isActive), [schedules]);
  const uniqueTeacherIds = useMemo(() => Array.from(new Set(schedules.map(s => s.teacherId))), [schedules]);
  const todaySessions = useMemo(() => schedules.filter(s => s.dayOfWeek === todayDayOfWeek && s.isActive), [schedules, todayDayOfWeek]);

  const fetchSchedules = async () => {
    try {
      let url = "/api/schedules";
      if (isSupervisor && user?.mosqueId) {
        url += `?mosqueId=${user.mosqueId}`;
      } else if (isTeacher) {
        url += `?teacherId=${user?.id}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) setSchedules(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الجداول", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/users?role=teacher", { credentials: "include" });
      if (res.ok) setTeachers(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchSchedules();
    if (isSupervisor || isAdmin) {
      fetchTeachers();
    }
  }, []);

  const resetForm = () => {
    setTitle("");
    setDayOfWeek("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setSelectedTeacherId("");
    setEditingSchedule(null);
    setConflictWarning(null);
  };

  const openEditDialog = (schedule: ScheduleData) => {
    setEditingSchedule(schedule);
    setTitle(schedule.title);
    setDayOfWeek(String(schedule.dayOfWeek));
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setLocation(schedule.location || "");
    setSelectedTeacherId(schedule.teacherId);
    setConflictWarning(null);
    setDialogOpen(true);
  };

  const openCopyDialog = (schedule: ScheduleData) => {
    setEditingSchedule(null);
    setTitle(schedule.title);
    setDayOfWeek("");
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setLocation(schedule.location || "");
    setSelectedTeacherId(schedule.teacherId);
    setConflictWarning(null);
    setDialogOpen(true);
  };

  const checkConflicts = (teacherId: string, day: number, start: string, end: string, excludeId?: string): string | null => {
    if (!teacherId || day === undefined || !start || !end) return null;
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    const conflicts = schedules.filter(s => {
      if (excludeId && s.id === excludeId) return false;
      if (s.teacherId !== teacherId) return false;
      if (s.dayOfWeek !== day) return false;
      const sStart = timeToMinutes(s.startTime);
      const sEnd = timeToMinutes(s.endTime);
      return startMinutes < sEnd && endMinutes > sStart;
    });
    if (conflicts.length > 0) {
      const c = conflicts[0];
      return `تعارض مع "${c.title}" (${DAY_NAMES[c.dayOfWeek]} ${c.startTime} - ${c.endTime})`;
    }
    return null;
  };

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0);
  };

  useEffect(() => {
    const tid = (isSupervisor || isAdmin) ? selectedTeacherId : (user?.id || "");
    if (dayOfWeek !== "" && startTime && endTime && tid) {
      const warning = checkConflicts(tid, Number(dayOfWeek), startTime, endTime, editingSchedule?.id);
      setConflictWarning(warning);
    } else {
      setConflictWarning(null);
    }
  }, [dayOfWeek, startTime, endTime, selectedTeacherId]);

  const handleSubmit = async () => {
    if (!title || dayOfWeek === "" || !startTime || !endTime) {
      toast({ title: "خطأ", description: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const body: any = {
        title,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        location: location || null,
      };

      if ((isSupervisor || isAdmin) && selectedTeacherId) {
        body.teacherId = selectedTeacherId;
      }

      const isEditing = !!editingSchedule;
      const url = isEditing ? `/api/schedules/${editingSchedule!.id}` : "/api/schedules";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({
          title: "تم بنجاح",
          description: isEditing ? "تم تعديل الجدول بنجاح" : "تم إنشاء الجدول بنجاح",
          className: "bg-green-50 border-green-200 text-green-800",
        });
        setDialogOpen(false);
        resetForm();
        fetchSchedules();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في حفظ الجدول", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    setDeletingId(scheduleId);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف الجدول", className: "bg-green-50 border-green-200 text-green-800" });
        setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الجدول", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (schedule: ScheduleData) => {
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !schedule.isActive }),
      });
      if (res.ok) {
        toast({
          title: "تم بنجاح",
          description: schedule.isActive ? "تم تعطيل الجدول" : "تم تفعيل الجدول",
          className: "bg-green-50 border-green-200 text-green-800",
        });
        setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, isActive: !s.isActive } : s));
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في تحديث الحالة", variant: "destructive" });
    }
  };

  const getTeacherName = (teacherId: string) => {
    if (teacherId === user?.id) return user?.name || "";
    const t = teachers.find(t => t.id === teacherId);
    if (t) return t.name;
    const sched = schedules.find(s => s.teacherId === teacherId);
    return sched?.teacherName || teacherId;
  };

  const getSchedulesForSlot = (day: number, timeSlot: string) => {
    const slotHour = parseInt(timeSlot.split(":")[0]);
    return filteredSchedules.filter(s => {
      if (s.dayOfWeek !== day) return false;
      const startHour = parseInt(s.startTime.split(":")[0]);
      const endHour = parseInt(s.endTime.split(":")[0]);
      return slotHour >= startHour && slotHour < endHour;
    });
  };

  const getActiveTimeSlots = () => {
    if (filteredSchedules.length === 0) return TIME_SLOTS;
    let minHour = 23;
    let maxHour = 0;
    filteredSchedules.forEach(s => {
      const startH = parseInt(s.startTime.split(":")[0]);
      const endH = parseInt(s.endTime.split(":")[0]);
      if (startH < minHour) minHour = startH;
      if (endH > maxHour) maxHour = endH;
    });
    minHour = Math.max(minHour - 1, 0);
    maxHour = Math.min(maxHour + 1, 23);
    return TIME_SLOTS.filter(t => {
      const h = parseInt(t.split(":")[0]);
      return h >= minHour && h <= maxHour;
    });
  };

  const isFirstSlotOfSchedule = (schedule: ScheduleData, timeSlot: string) => {
    const slotHour = parseInt(timeSlot.split(":")[0]);
    const startHour = parseInt(schedule.startTime.split(":")[0]);
    return slotHour === startHour;
  };

  const handlePrint = () => {
    const activeSlots = getActiveTimeSlots();
    let tableRows = "";
    activeSlots.forEach(timeSlot => {
      let cells = `<td style="padding:8px;border:1px solid #ddd;background:#f9f9f9;text-align:center;font-weight:bold;white-space:nowrap;">${TIME_LABELS[timeSlot] || timeSlot}</td>`;
      DAY_NAMES.forEach((_, dayIdx) => {
        const slotSchedules = getSchedulesForSlot(dayIdx, timeSlot);
        const firstSlotSchedules = slotSchedules.filter(s => isFirstSlotOfSchedule(s, timeSlot));
        if (firstSlotSchedules.length > 0) {
          const content = firstSlotSchedules.map(s =>
            `<div style="margin-bottom:4px;"><strong>${s.title}</strong><br/><small>${s.startTime} - ${s.endTime}</small><br/><small>${getTeacherName(s.teacherId)}</small>${s.location ? `<br/><small>📍 ${s.location}</small>` : ""}</div>`
          ).join("");
          cells += `<td style="padding:6px;border:1px solid #ddd;text-align:center;vertical-align:top;font-size:12px;">${content}</td>`;
        } else if (slotSchedules.length > 0) {
          cells += `<td style="padding:6px;border:1px solid #ddd;background:#f0f7ff;"></td>`;
        } else {
          cells += `<td style="padding:6px;border:1px solid #ddd;"></td>`;
        }
      });
      tableRows += `<tr>${cells}</tr>`;
    });

    const dayHeaders = DAY_NAMES.map(d => `<th style="padding:10px;border:1px solid #ddd;background:#2563eb;color:white;text-align:center;">${d}</th>`).join("");

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>الجدول الأسبوعي</title><style>body{font-family:'Segoe UI',Tahoma,sans-serif;padding:20px;direction:rtl;}table{width:100%;border-collapse:collapse;margin-top:20px;}h1{text-align:center;color:#1e40af;}@media print{body{padding:10px;}}</style></head><body><h1>📅 الجدول الأسبوعي للحلقات</h1><table><thead><tr><th style="padding:10px;border:1px solid #ddd;background:#2563eb;color:white;">الوقت</th>${dayHeaders}</tr></thead><tbody>${tableRows}</tbody></table><script>window.print();</script></body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const activeTimeSlots = getActiveTimeSlots();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-schedules">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-transition" dir="rtl" data-testid="schedules-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">جدول الحلقات الأسبوعي</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-schedule">
            <Printer className="h-4 w-4 ml-2" />
            طباعة
          </Button>

          <div className="flex items-center border rounded-lg overflow-hidden" data-testid="view-mode-toggle">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-schedule">
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة جدول
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle data-testid="text-dialog-title">
                    {editingSchedule ? "تعديل الجدول" : "إضافة جدول جديد"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="title">عنوان الحلقة *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: حلقة تحفيظ سورة البقرة"
                      data-testid="input-schedule-title"
                    />
                  </div>

                  <div>
                    <Label>يوم الأسبوع *</Label>
                    <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                      <SelectTrigger data-testid="select-day-of-week">
                        <SelectValue placeholder="اختر اليوم" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((name, idx) => (
                          <SelectItem key={idx} value={String(idx)} data-testid={`option-day-${idx}`}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="startTime">وقت البداية *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        data-testid="input-start-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">وقت النهاية *</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        data-testid="input-end-time"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="location">المكان</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="مثال: القاعة الرئيسية"
                      data-testid="input-location"
                    />
                  </div>

                  {(isSupervisor || isAdmin) && teachers.length > 0 && (
                    <div>
                      <Label>المعلم</Label>
                      <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                        <SelectTrigger data-testid="select-teacher">
                          <SelectValue placeholder="اختر المعلم" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map((t) => (
                            <SelectItem key={t.id} value={t.id} data-testid={`option-teacher-${t.id}`}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {conflictWarning && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm" data-testid="conflict-warning">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{conflictWarning}</span>
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full"
                    data-testid="button-submit-schedule"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                    {editingSchedule ? "تحديث الجدول" : "إضافة الجدول"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-cards">
        <Card className="border-blue-200 bg-blue-50/50" data-testid="stat-total-schedules">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">إجمالي الجداول</p>
              <p className="text-2xl font-bold text-blue-800">{schedules.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50" data-testid="stat-active-schedules">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">الجداول النشطة</p>
              <p className="text-2xl font-bold text-green-800">{activeSchedules.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50" data-testid="stat-total-teachers">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-600">المعلمون</p>
              <p className="text-2xl font-bold text-purple-800">{uniqueTeacherIds.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50" data-testid="stat-today-sessions">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-600">حلقات اليوم</p>
              <p className="text-2xl font-bold text-amber-800">{todaySessions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {todaySessions.length > 0 && (
        <Card className="border-amber-200 shadow-sm" data-testid="today-sessions-section">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Clock className="h-5 w-5" />
              حلقات اليوم - {DAY_NAMES[todayDayOfWeek]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todaySessions.map(session => {
                const colorClass = getTeacherColor(session.teacherId);
                return (
                  <div
                    key={session.id}
                    className={`rounded-lg border p-3 ${colorClass} shadow-sm`}
                    data-testid={`today-session-${session.id}`}
                  >
                    <div className="font-semibold">{session.title}</div>
                    <div className="flex items-center gap-1 mt-1 text-sm opacity-80">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{session.startTime} - {session.endTime}</span>
                    </div>
                    <div className="text-sm opacity-80 mt-0.5">{getTeacherName(session.teacherId)}</div>
                    {session.location && (
                      <div className="flex items-center gap-1 text-sm opacity-70 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span>{session.location}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap" data-testid="filters-bar">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterTeacherId} onValueChange={setFilterTeacherId}>
            <SelectTrigger className="w-[200px]" data-testid="filter-teacher-select">
              <SelectValue placeholder="جميع المعلمين" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المعلمين</SelectItem>
              {uniqueTeacherIds.map(tid => (
                <SelectItem key={tid} value={tid} data-testid={`filter-teacher-${tid}`}>
                  {getTeacherName(tid)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Switch
              checked={showInactive}
              onCheckedChange={setShowInactive}
              data-testid="toggle-show-inactive"
            />
            <Label className="text-sm flex items-center gap-1 cursor-pointer">
              {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showInactive ? "إظهار غير النشطة" : "إخفاء غير النشطة"}
            </Label>
          </div>
        )}
      </div>

      {filteredSchedules.length === 0 ? (
        <Card data-testid="empty-schedules">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد جداول حالياً</p>
            {canManage && (
              <p className="text-muted-foreground text-sm mt-2">اضغط على "إضافة جدول" لإنشاء جدول جديد</p>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <>
          <Card className="shadow-md" data-testid="weekly-grid">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  الجدول الأسبوعي
                </CardTitle>
                {uniqueTeacherIds.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap" data-testid="teacher-legend">
                    {uniqueTeacherIds.map(tid => (
                      <div key={tid} className="flex items-center gap-1.5 text-xs">
                        <div className={`w-3 h-3 rounded-full ${getTeacherDotColor(tid)}`} />
                        <span>{getTeacherName(tid)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-8 border rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-muted p-3 font-semibold text-center border-b border-l">
                    الوقت
                  </div>
                  {DAY_NAMES.map((day, idx) => (
                    <div
                      key={idx}
                      className={`p-3 font-semibold text-center border-b border-l last:border-l-0 ${
                        idx === todayDayOfWeek
                          ? "bg-amber-100 text-amber-900 ring-2 ring-amber-300 ring-inset"
                          : "bg-muted"
                      }`}
                      data-testid={`header-day-${idx}`}
                    >
                      {day}
                      {idx === todayDayOfWeek && (
                        <Badge variant="outline" className="mr-1 text-[10px] bg-amber-200 border-amber-400">اليوم</Badge>
                      )}
                    </div>
                  ))}

                  {activeTimeSlots.map((timeSlot) => (
                    <>
                      <div
                        key={`time-${timeSlot}`}
                        className="p-2 text-xs text-muted-foreground text-center border-b border-l bg-muted/30 flex items-center justify-center font-medium"
                      >
                        {TIME_LABELS[timeSlot] || timeSlot}
                      </div>
                      {DAY_NAMES.map((_, dayIdx) => {
                        const slotSchedules = getSchedulesForSlot(dayIdx, timeSlot);
                        return (
                          <div
                            key={`${timeSlot}-${dayIdx}`}
                            className={`border-b border-l last:border-l-0 p-1 min-h-[60px] relative transition-colors ${
                              dayIdx === todayDayOfWeek ? "bg-amber-50/40" : ""
                            }`}
                            data-testid={`cell-${dayIdx}-${timeSlot}`}
                          >
                            <TooltipProvider>
                              {slotSchedules.map(schedule => {
                                if (!isFirstSlotOfSchedule(schedule, timeSlot)) return null;
                                const colorClass = getTeacherColor(schedule.teacherId);
                                return (
                                  <Tooltip key={schedule.id}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`rounded-lg border p-2 text-xs cursor-pointer hover:shadow-lg transition-all ${colorClass} ${
                                          !schedule.isActive ? "opacity-50" : ""
                                        }`}
                                        data-testid={`card-schedule-${schedule.id}`}
                                        onClick={() => canManage && openEditDialog(schedule)}
                                      >
                                        <div className="font-semibold truncate" data-testid={`text-schedule-title-${schedule.id}`}>
                                          {schedule.title}
                                          {!schedule.isActive && <span className="mr-1 text-[9px]">(معطل)</span>}
                                        </div>
                                        <div className="flex items-center gap-1 mt-1 text-[10px] opacity-80">
                                          <Clock className="h-3 w-3" />
                                          <span data-testid={`text-schedule-time-${schedule.id}`}>
                                            {schedule.startTime} - {schedule.endTime}
                                          </span>
                                        </div>
                                        <div className="truncate text-[10px] opacity-80 mt-0.5" data-testid={`text-schedule-teacher-${schedule.id}`}>
                                          {getTeacherName(schedule.teacherId)}
                                        </div>
                                        {schedule.location && (
                                          <div className="flex items-center gap-1 text-[10px] opacity-70 mt-0.5">
                                            <MapPin className="h-2.5 w-2.5" />
                                            <span className="truncate" data-testid={`text-schedule-location-${schedule.id}`}>
                                              {schedule.location}
                                            </span>
                                          </div>
                                        )}
                                        {canManage && (
                                          <div className="flex items-center gap-1 mt-1.5 justify-end">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openCopyDialog(schedule);
                                              }}
                                              data-testid={`button-copy-schedule-${schedule.id}`}
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleActive(schedule);
                                              }}
                                              data-testid={`button-toggle-schedule-${schedule.id}`}
                                            >
                                              {schedule.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openEditDialog(schedule);
                                              }}
                                              data-testid={`button-edit-schedule-${schedule.id}`}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 text-red-500 hover:text-red-700"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(schedule.id);
                                              }}
                                              disabled={deletingId === schedule.id}
                                              data-testid={`button-delete-schedule-${schedule.id}`}
                                            >
                                              {deletingId === schedule.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <Trash2 className="h-3 w-3" />
                                              )}
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs" dir="rtl">
                                      <div className="space-y-1">
                                        <p className="font-semibold">{schedule.title}</p>
                                        <p className="text-xs">{DAY_NAMES[schedule.dayOfWeek]} | {schedule.startTime} - {schedule.endTime}</p>
                                        <p className="text-xs">المعلم: {getTeacherName(schedule.teacherId)}</p>
                                        {schedule.location && <p className="text-xs">المكان: {schedule.location}</p>}
                                        <p className="text-xs">الحالة: {schedule.isActive ? "نشط" : "معطل"}</p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </TooltipProvider>
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="schedule-cards-list">
            {filteredSchedules.map(schedule => {
              const colorClass = getTeacherColor(schedule.teacherId);
              return (
                <Card
                  key={schedule.id}
                  className={`border shadow-sm ${colorClass.split(" ").find(c => c.startsWith("border-")) || ""} ${
                    !schedule.isActive ? "opacity-50" : ""
                  }`}
                  data-testid={`card-schedule-detail-${schedule.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base truncate" data-testid={`text-detail-title-${schedule.id}`}>
                            {schedule.title}
                          </h3>
                          {!schedule.isActive && (
                            <Badge variant="outline" className="text-xs bg-gray-100">معطل</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Badge variant="outline" data-testid={`badge-day-${schedule.id}`}>
                            {DAY_NAMES[schedule.dayOfWeek]}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span data-testid={`text-detail-time-${schedule.id}`}>
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 text-sm" data-testid={`text-detail-teacher-${schedule.id}`}>
                          المعلم: {getTeacherName(schedule.teacherId)}
                        </div>
                        {schedule.location && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span data-testid={`text-detail-location-${schedule.id}`}>{schedule.location}</span>
                          </div>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 mr-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openCopyDialog(schedule)}
                            data-testid={`button-copy-detail-${schedule.id}`}
                            title="نسخ"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(schedule)}
                            data-testid={`button-toggle-detail-${schedule.id}`}
                            title={schedule.isActive ? "تعطيل" : "تفعيل"}
                          >
                            {schedule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(schedule)}
                            data-testid={`button-edit-detail-${schedule.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(schedule.id)}
                            disabled={deletingId === schedule.id}
                            data-testid={`button-delete-detail-${schedule.id}`}
                          >
                            {deletingId === schedule.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <Card className="shadow-md" data-testid="list-view">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              قائمة الجداول
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="schedules-table">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-right font-semibold">العنوان</th>
                  <th className="p-3 text-right font-semibold">اليوم</th>
                  <th className="p-3 text-right font-semibold">الوقت</th>
                  <th className="p-3 text-right font-semibold">المعلم</th>
                  <th className="p-3 text-right font-semibold">المكان</th>
                  <th className="p-3 text-right font-semibold">الحالة</th>
                  {canManage && <th className="p-3 text-right font-semibold">إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {[...filteredSchedules]
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
                  .map(schedule => (
                    <tr
                      key={schedule.id}
                      className={`border-b hover:bg-muted/30 transition-colors ${
                        !schedule.isActive ? "opacity-50" : ""
                      } ${schedule.dayOfWeek === todayDayOfWeek ? "bg-amber-50/40" : ""}`}
                      data-testid={`row-schedule-${schedule.id}`}
                    >
                      <td className="p-3 font-medium" data-testid={`list-title-${schedule.id}`}>{schedule.title}</td>
                      <td className="p-3">
                        <Badge variant="outline" data-testid={`list-day-${schedule.id}`}>
                          {DAY_NAMES[schedule.dayOfWeek]}
                        </Badge>
                      </td>
                      <td className="p-3" data-testid={`list-time-${schedule.id}`}>
                        {schedule.startTime} - {schedule.endTime}
                      </td>
                      <td className="p-3" data-testid={`list-teacher-${schedule.id}`}>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${getTeacherDotColor(schedule.teacherId)}`} />
                          {getTeacherName(schedule.teacherId)}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground" data-testid={`list-location-${schedule.id}`}>
                        {schedule.location || "—"}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={schedule.isActive ? "default" : "secondary"}
                          className={schedule.isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                          data-testid={`list-status-${schedule.id}`}
                        >
                          {schedule.isActive ? "نشط" : "معطل"}
                        </Badge>
                      </td>
                      {canManage && (
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCopyDialog(schedule)} data-testid={`list-copy-${schedule.id}`} title="نسخ">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(schedule)} data-testid={`list-toggle-${schedule.id}`} title={schedule.isActive ? "تعطيل" : "تفعيل"}>
                              {schedule.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(schedule)} data-testid={`list-edit-${schedule.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(schedule.id)} disabled={deletingId === schedule.id} data-testid={`list-delete-${schedule.id}`}>
                              {deletingId === schedule.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
