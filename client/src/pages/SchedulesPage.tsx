import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { CalendarDays, Plus, Trash2, Pencil, Loader2, MapPin, Clock } from "lucide-react";

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

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
];

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

  const isTeacher = user?.role === "teacher";
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";
  const canManage = isTeacher || isSupervisor || isAdmin;

  const teacherColorMap = new Map<string, string>();
  const getTeacherColor = (teacherId: string) => {
    if (!teacherColorMap.has(teacherId)) {
      teacherColorMap.set(teacherId, TEACHER_COLORS[teacherColorMap.size % TEACHER_COLORS.length]);
    }
    return teacherColorMap.get(teacherId)!;
  };

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
  };

  const openEditDialog = (schedule: ScheduleData) => {
    setEditingSchedule(schedule);
    setTitle(schedule.title);
    setDayOfWeek(String(schedule.dayOfWeek));
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setLocation(schedule.location || "");
    setSelectedTeacherId(schedule.teacherId);
    setDialogOpen(true);
  };

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

  const getTeacherName = (teacherId: string) => {
    if (teacherId === user?.id) return user?.name || "";
    const t = teachers.find(t => t.id === teacherId);
    if (t) return t.name;
    const sched = schedules.find(s => s.teacherId === teacherId);
    return sched?.teacherName || teacherId;
  };

  const getSchedulesForSlot = (day: number, timeSlot: string) => {
    const slotHour = parseInt(timeSlot.split(":")[0]);
    return schedules.filter(s => {
      if (s.dayOfWeek !== day) return false;
      const startHour = parseInt(s.startTime.split(":")[0]);
      const endHour = parseInt(s.endTime.split(":")[0]);
      return slotHour >= startHour && slotHour < endHour;
    });
  };

  const getActiveTimeSlots = () => {
    if (schedules.length === 0) return TIME_SLOTS;
    let minHour = 23;
    let maxHour = 0;
    schedules.forEach(s => {
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

  const activeTimeSlots = getActiveTimeSlots();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-schedules">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl" data-testid="schedules-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">جدول الحلقات الأسبوعي</h1>
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

      {schedules.length === 0 ? (
        <Card data-testid="empty-schedules">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد جداول حالياً</p>
            {canManage && (
              <p className="text-muted-foreground text-sm mt-2">اضغط على "إضافة جدول" لإنشاء جدول جديد</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="weekly-grid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              الجدول الأسبوعي
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-8 border rounded-lg overflow-hidden">
                <div className="bg-muted p-3 font-semibold text-center border-b border-l">
                  الوقت
                </div>
                {DAY_NAMES.map((day, idx) => (
                  <div
                    key={idx}
                    className="bg-muted p-3 font-semibold text-center border-b border-l last:border-l-0"
                    data-testid={`header-day-${idx}`}
                  >
                    {day}
                  </div>
                ))}

                {activeTimeSlots.map((timeSlot) => (
                  <>
                    <div
                      key={`time-${timeSlot}`}
                      className="p-2 text-xs text-muted-foreground text-center border-b border-l bg-muted/30 flex items-center justify-center"
                    >
                      {timeSlot}
                    </div>
                    {DAY_NAMES.map((_, dayIdx) => {
                      const slotSchedules = getSchedulesForSlot(dayIdx, timeSlot);
                      return (
                        <div
                          key={`${timeSlot}-${dayIdx}`}
                          className="border-b border-l last:border-l-0 p-1 min-h-[60px] relative"
                          data-testid={`cell-${dayIdx}-${timeSlot}`}
                        >
                          {slotSchedules.map(schedule => {
                            if (!isFirstSlotOfSchedule(schedule, timeSlot)) return null;
                            const colorClass = getTeacherColor(schedule.teacherId);
                            return (
                              <div
                                key={schedule.id}
                                className={`rounded-md border p-2 text-xs cursor-pointer hover:shadow-md transition-shadow ${colorClass}`}
                                data-testid={`card-schedule-${schedule.id}`}
                                onClick={() => canManage && openEditDialog(schedule)}
                              >
                                <div className="font-semibold truncate" data-testid={`text-schedule-title-${schedule.id}`}>
                                  {schedule.title}
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
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {schedules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="schedule-cards-list">
          {schedules.map(schedule => {
            const colorClass = getTeacherColor(schedule.teacherId);
            return (
              <Card key={schedule.id} className={`border ${colorClass.split(" ").find(c => c.startsWith("border-")) || ""}`} data-testid={`card-schedule-detail-${schedule.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate" data-testid={`text-detail-title-${schedule.id}`}>
                        {schedule.title}
                      </h3>
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
      )}
    </div>
  );
}
