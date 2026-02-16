import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, BookOpen, CheckCircle, Clock, AlertCircle, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface Student {
  id: string;
  name: string;
  avatar?: string;
}

interface Assignment {
  id: string;
  studentId: string;
  surahName: string;
  fromVerse: number;
  toVerse: number;
  scheduledDate: string;
  status: string;
  type: string;
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function TeacherDailyPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignRes, studentRes] = await Promise.all([
          fetch("/api/assignments", { credentials: "include" }),
          fetch("/api/users?role=student", { credentials: "include" }),
        ]);
        if (assignRes.ok) {
          const data = await assignRes.json();
          setAssignments(data);
        }
        if (studentRes.ok) {
          const data = await studentRes.json();
          setStudents(data);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const todayAssignments = assignments.filter((a) => isToday(a.scheduledDate));

  const studentMap = new Map<string, Student>();
  students.forEach((s) => studentMap.set(s.id, s));

  const grouped = new Map<string, Assignment[]>();
  todayAssignments.forEach((a) => {
    const list = grouped.get(a.studentId) || [];
    list.push(a);
    grouped.set(a.studentId, list);
  });

  const totalStudents = grouped.size;
  const totalAssignments = todayAssignments.length;
  const completedCount = todayAssignments.filter((a) => a.status === "done").length;
  const pendingCount = todayAssignments.filter((a) => a.status === "pending").length;

  const statusColor = (status: string) => {
    if (status === "done") return "bg-green-100 text-green-700 border-green-200";
    if (status === "cancelled") return "bg-gray-100 text-gray-500 border-gray-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  const statusLabel = (status: string) => {
    if (status === "done") return "تم";
    if (status === "cancelled") return "ملغي";
    return "قيد الانتظار";
  };

  const typeLabel = (type: string) => {
    return type === "review" ? "مراجعة" : "جديد";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="status-loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
          واجبات اليوم
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" data-testid="stats-summary">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold" data-testid="stat-total-students">{totalStudents}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">طلاب لديهم واجبات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-full text-purple-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold" data-testid="stat-total-assignments">{totalAssignments}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الواجبات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full text-green-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold" data-testid="stat-completed">{completedCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">مكتملة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold" data-testid="stat-pending">{pendingCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">قيد الانتظار</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {todayAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center" data-testid="status-empty">
            <AlertCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">لا توجد واجبات لهذا اليوم</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([studentId, studentAssignments]) => {
            const student = studentMap.get(studentId);
            const name = student?.name || "—";
            const avatar = student?.avatar;

            return (
              <Card key={studentId} data-testid={`card-student-${studentId}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-base">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="w-9 h-9 rounded-full border"
                        data-testid={`img-avatar-${studentId}`}
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border"
                        data-testid={`avatar-placeholder-${studentId}`}
                      >
                        {name.charAt(0)}
                      </div>
                    )}
                    <span data-testid={`text-student-name-${studentId}`}>{name}</span>
                    <Badge variant="secondary" className="mr-auto" data-testid={`badge-count-${studentId}`}>
                      {studentAssignments.length} واجب
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {studentAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 rounded-lg border bg-muted/20 gap-2"
                        data-testid={`row-assignment-${a.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-primary/60" />
                          <div>
                            <p className="text-sm font-medium" data-testid={`text-surah-${a.id}`}>
                              {a.surahName}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-verses-${a.id}`}>
                              الآيات {a.fromVerse} - {a.toVerse}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs" data-testid={`badge-type-${a.id}`}>
                            {typeLabel(a.type)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusColor(a.status)}`}
                            data-testid={`badge-status-${a.id}`}
                          >
                            {statusLabel(a.status)}
                          </Badge>
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
