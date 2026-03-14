import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Users, Clock, Plus, Loader2, BookOpen, GraduationCap,
  Layout, Maximize2, Eye, Trash2, Edit, Grid, List
} from "lucide-react";

interface Schedule {
  id: string;
  teacherId: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
  isActive: boolean;
  teacherName?: string;
}

interface Teacher {
  id: string;
  name: string;
  username: string;
}

interface StudentCount {
  teacherId: string;
  count: number;
}

interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: "classroom" | "hall" | "office" | "prayer" | "entrance";
}

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const ROOM_COLORS: Record<string, string> = {
  classroom: "#3b82f6",
  hall: "#10b981",
  office: "#8b5cf6",
  prayer: "#f59e0b",
  entrance: "#6b7280",
};

const ROOM_LABELS: Record<string, string> = {
  classroom: "فصل دراسي",
  hall: "قاعة",
  office: "مكتب",
  prayer: "مصلى",
  entrance: "مدخل",
};

const DEFAULT_ROOMS: Room[] = [
  { id: "room-1", name: "القاعة الرئيسية", x: 50, y: 50, width: 200, height: 150, color: ROOM_COLORS.hall, type: "hall" },
  { id: "room-2", name: "الحلقة الأولى", x: 300, y: 50, width: 120, height: 100, color: ROOM_COLORS.classroom, type: "classroom" },
  { id: "room-3", name: "الحلقة الثانية", x: 300, y: 170, width: 120, height: 100, color: ROOM_COLORS.classroom, type: "classroom" },
  { id: "room-4", name: "الحلقة الثالثة", x: 450, y: 50, width: 120, height: 100, color: ROOM_COLORS.classroom, type: "classroom" },
  { id: "room-5", name: "مكتب المشرف", x: 450, y: 170, width: 120, height: 100, color: ROOM_COLORS.office, type: "office" },
  { id: "room-6", name: "المصلى", x: 50, y: 230, width: 200, height: 100, color: ROOM_COLORS.prayer, type: "prayer" },
  { id: "room-7", name: "المدخل", x: 50, y: 360, width: 520, height: 40, color: ROOM_COLORS.entrance, type: "entrance" },
];

export default function FloorPlanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [studentCounts, setStudentCounts] = useState<StudentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const stored = localStorage.getItem(`mutqin_floorplan_${user?.mosqueId || "default"}`);
      return stored ? JSON.parse(stored) : DEFAULT_ROOMS;
    } catch { return DEFAULT_ROOMS; }
  });
  const [editMode, setEditMode] = useState(false);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState<string>("classroom");
  const [viewMode, setViewMode] = useState<"visual" | "list">("visual");

  const canManage = user?.role === "admin" || user?.role === "supervisor";

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(`mutqin_floorplan_${user?.mosqueId || "default"}`, JSON.stringify(rooms));
    } catch {}
  }, [rooms]);

  const fetchData = async () => {
    try {
      const [schedulesRes, teachersRes, studentsRes] = await Promise.all([
        fetch("/api/schedules", { credentials: "include" }),
        fetch("/api/users?role=teacher", { credentials: "include" }),
        fetch("/api/users?role=student", { credentials: "include" }),
      ]);
      
      const schedulesData = schedulesRes.ok ? await schedulesRes.json() : [];
      const teachersData = teachersRes.ok ? await teachersRes.json() : [];
      const studentsData = studentsRes.ok ? await studentsRes.json() : [];
      
      setSchedules(schedulesData);
      setTeachers(teachersData);
      
      const counts: Record<string, number> = {};
      studentsData.forEach((s: any) => {
        if (s.teacherId) {
          counts[s.teacherId] = (counts[s.teacherId] || 0) + 1;
        }
      });
      setStudentCounts(Object.entries(counts).map(([teacherId, count]) => ({ teacherId, count })));
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getTeacherName = (teacherId: string) => teachers.find(t => t.id === teacherId)?.name || teacherId;
  const getStudentCount = (teacherId: string) => studentCounts.find(sc => sc.teacherId === teacherId)?.count || 0;

  const getActiveSessionsForRoom = (room: Room) => {
    return schedules.filter(s => 
      s.dayOfWeek === selectedDay && 
      s.isActive && 
      s.location && 
      (s.location.includes(room.name) || room.name.includes(s.location || ""))
    );
  };

  const todaySchedules = useMemo(() => {
    return schedules.filter(s => s.dayOfWeek === selectedDay && s.isActive);
  }, [schedules, selectedDay]);

  const handleAddRoom = () => {
    if (!newRoomName) return;
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: newRoomName,
      x: 50 + Math.random() * 300,
      y: 50 + Math.random() * 200,
      width: 120,
      height: 100,
      color: ROOM_COLORS[newRoomType] || ROOM_COLORS.classroom,
      type: newRoomType as Room["type"],
    };
    setRooms(prev => [...prev, newRoom]);
    setNewRoomName("");
    setAddRoomOpen(false);
    toast({ title: "تم", description: "تمت إضافة القاعة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
    setSelectedRoom(null);
    toast({ title: "تم", description: "تم حذف القاعة", className: "bg-green-50 border-green-200 text-green-800" });
  };

  if (!["admin", "supervisor", "teacher"].includes(user?.role || "")) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <h2 className="text-xl font-bold text-muted-foreground">غير مصرح لك بالوصول لهذه الصفحة</h2>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 page-transition" dir="rtl" data-testid="floor-plan-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-floor-plan">
            المخطط البصري للمركز
          </h1>
          <p className="text-muted-foreground text-sm">عرض تفاعلي لتوزيع الحلقات والقاعات</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "visual" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("visual")}
            className="gap-1"
            data-testid="btn-view-visual"
          >
            <Grid className="w-4 h-4" />
            بصري
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-1"
            data-testid="btn-view-list"
          >
            <List className="w-4 h-4" />
            قائمة
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-sm font-medium shrink-0">اختر اليوم:</span>
            {DAY_NAMES.map((day, idx) => (
              <Button
                key={idx}
                variant={selectedDay === idx ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDay(idx)}
                className={`shrink-0 ${idx === new Date().getDay() ? "ring-2 ring-amber-300" : ""}`}
                data-testid={`btn-day-${idx}`}
              >
                {day}
                {idx === new Date().getDay() && <Badge variant="secondary" className="mr-1 text-[9px] px-1">اليوم</Badge>}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <Card className="card-hover" data-testid="stat-total-rooms">
          <CardContent className="p-3 text-center">
            <Layout className="w-6 h-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{rooms.filter(r => r.type === "classroom" || r.type === "hall").length}</p>
            <p className="text-xs text-muted-foreground">قاعات ومصليات</p>
          </CardContent>
        </Card>
        <Card className="card-hover" data-testid="stat-today-sessions">
          <CardContent className="p-3 text-center">
            <Clock className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{todaySchedules.length}</p>
            <p className="text-xs text-muted-foreground">حلقات اليوم</p>
          </CardContent>
        </Card>
        <Card className="card-hover" data-testid="stat-teachers">
          <CardContent className="p-3 text-center">
            <GraduationCap className="w-6 h-6 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{teachers.length}</p>
            <p className="text-xs text-muted-foreground">أساتذة</p>
          </CardContent>
        </Card>
        <Card className="card-hover" data-testid="stat-total-students">
          <CardContent className="p-3 text-center">
            <Users className="w-6 h-6 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{studentCounts.reduce((sum, sc) => sum + sc.count, 0)}</p>
            <p className="text-xs text-muted-foreground">إجمالي الطلاب</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="mr-2">جاري تحميل المخطط...</span>
          </CardContent>
        </Card>
      ) : viewMode === "visual" ? (
        <Card data-testid="floor-plan-visual">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                مخطط المركز - {DAY_NAMES[selectedDay]}
              </CardTitle>
              {canManage && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)} className="gap-1" data-testid="btn-toggle-edit">
                    <Edit className="w-4 h-4" />
                    {editMode ? "إنهاء التعديل" : "تعديل"}
                  </Button>
                  <Button size="sm" onClick={() => setAddRoomOpen(true)} className="gap-1" data-testid="btn-add-room">
                    <Plus className="w-4 h-4" />
                    إضافة قاعة
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs mt-2">
              {Object.entries(ROOM_LABELS).map(([type, label]) => (
                <span key={type} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ROOM_COLORS[type] }}></span>
                  {label}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden" style={{ minHeight: "420px" }}>
              <svg width="100%" viewBox="0 0 620 420" className="mx-auto" data-testid="svg-floor-plan">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.5" />
                  </pattern>
                </defs>
                <rect width="620" height="420" fill="url(#grid)" />
                
                {rooms.map((room) => {
                  const sessions = getActiveSessionsForRoom(room);
                  const hasActiveSessions = sessions.length > 0;
                  
                  return (
                    <g
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className="cursor-pointer"
                      data-testid={`room-${room.id}`}
                    >
                      <rect
                        x={room.x} y={room.y}
                        width={room.width} height={room.height}
                        rx={8}
                        fill={room.color}
                        opacity={hasActiveSessions ? 0.9 : 0.4}
                        stroke={hasActiveSessions ? "#059669" : "#94a3b8"}
                        strokeWidth={hasActiveSessions ? 2.5 : 1}
                        className="transition-all duration-300"
                      />
                      
                      {hasActiveSessions && (
                        <rect
                          x={room.x} y={room.y}
                          width={room.width} height={room.height}
                          rx={8}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={2}
                          opacity={0.5}
                        >
                          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                        </rect>
                      )}
                      
                      <text
                        x={room.x + room.width / 2}
                        y={room.y + room.height / 2 - 8}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill="white"
                      >
                        {room.name}
                      </text>
                      
                      {hasActiveSessions && (
                        <>
                          <text
                            x={room.x + room.width / 2}
                            y={room.y + room.height / 2 + 8}
                            textAnchor="middle"
                            fontSize="9"
                            fill="rgba(255,255,255,0.9)"
                          >
                            {getTeacherName(sessions[0].teacherId)}
                          </text>
                          <text
                            x={room.x + room.width / 2}
                            y={room.y + room.height / 2 + 22}
                            textAnchor="middle"
                            fontSize="8"
                            fill="rgba(255,255,255,0.7)"
                          >
                            {sessions[0].startTime} - {sessions[0].endTime}
                          </text>
                          <circle cx={room.x + room.width - 12} cy={room.y + 12} r={10} fill="#f59e0b" />
                          <text x={room.x + room.width - 12} y={room.y + 16} textAnchor="middle" fontSize="9" fontWeight="bold" fill="white">
                            {getStudentCount(sessions[0].teacherId)}
                          </text>
                        </>
                      )}
                      
                      {editMode && canManage && (
                        <g onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}>
                          <circle cx={room.x + 12} cy={room.y + 12} r={10} fill="#ef4444" className="cursor-pointer" />
                          <text x={room.x + 12} y={room.y + 16} textAnchor="middle" fontSize="12" fill="white">×</text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="floor-plan-list">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5" />
              قائمة القاعات والحلقات - {DAY_NAMES[selectedDay]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rooms.filter(r => r.type === "classroom" || r.type === "hall").map(room => {
              const sessions = getActiveSessionsForRoom(room);
              return (
                <div key={room.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow" data-testid={`list-room-${room.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: room.color }}>
                        <Layout className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{room.name}</h3>
                        <p className="text-xs text-muted-foreground">{ROOM_LABELS[room.type]}</p>
                      </div>
                    </div>
                    <Badge variant={sessions.length > 0 ? "default" : "secondary"}>
                      {sessions.length > 0 ? "نشط" : "فارغ"}
                    </Badge>
                  </div>
                  {sessions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {sessions.map(session => (
                        <div key={session.id} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">{getTeacherName(session.teacherId)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{session.startTime} - {session.endTime}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-bold">{getStudentCount(session.teacherId)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card data-testid="today-sessions-summary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            حلقات {DAY_NAMES[selectedDay]} ({todaySchedules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedules.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">لا توجد حلقات مجدولة لهذا اليوم</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todaySchedules.map(session => (
                <div key={session.id} className="border rounded-xl p-3 hover:shadow-sm transition-shadow" data-testid={`session-card-${session.id}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{session.title}</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3 h-3" />
                      <span>{getTeacherName(session.teacherId)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{session.startTime} - {session.endTime}</span>
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        <span>{session.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      <span>{getStudentCount(session.teacherId)} طالب</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent dir="rtl" data-testid="dialog-room-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {selectedRoom?.name}
            </DialogTitle>
            <DialogDescription>تفاصيل القاعة والحلقات المجدولة</DialogDescription>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: selectedRoom.color, color: "white" }}>{ROOM_LABELS[selectedRoom.type]}</Badge>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">الحلقات في هذه القاعة ({DAY_NAMES[selectedDay]})</h4>
                {getActiveSessionsForRoom(selectedRoom).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد حلقات في هذه القاعة لهذا اليوم</p>
                ) : (
                  <div className="space-y-2">
                    {getActiveSessionsForRoom(selectedRoom).map(session => (
                      <div key={session.id} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{session.title}</span>
                          <Badge variant="outline">{session.startTime} - {session.endTime}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {getTeacherName(session.teacherId)}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {getStudentCount(session.teacherId)} طالب</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">جميع أيام الأسبوع</h4>
                <div className="space-y-1">
                  {DAY_NAMES.map((day, idx) => {
                    const daySessions = schedules.filter(s => s.dayOfWeek === idx && s.isActive && s.location && (s.location.includes(selectedRoom!.name) || selectedRoom!.name.includes(s.location || "")));
                    if (daySessions.length === 0) return null;
                    return (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 bg-secondary/20 rounded">
                        <span className="font-medium">{day}</span>
                        <div className="flex items-center gap-2">
                          {daySessions.map(s => (
                            <Badge key={s.id} variant="outline" className="text-[10px]">
                              {s.startTime} - {getTeacherName(s.teacherId)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
        <DialogContent dir="rtl" data-testid="dialog-add-room">
          <DialogHeader>
            <DialogTitle>إضافة قاعة جديدة</DialogTitle>
            <DialogDescription>أضف قاعة أو مكان جديد للمخطط</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم القاعة</Label>
              <Input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="مثال: الحلقة الرابعة" data-testid="input-room-name" />
            </div>
            <div className="space-y-2">
              <Label>نوع المكان</Label>
              <Select value={newRoomType} onValueChange={setNewRoomType}>
                <SelectTrigger data-testid="select-room-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROOM_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddRoom} disabled={!newRoomName} className="w-full" data-testid="btn-confirm-add-room">
              إضافة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}