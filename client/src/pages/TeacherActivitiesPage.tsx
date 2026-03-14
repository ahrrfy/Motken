import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, ClipboardList, Loader2, BarChart3, Users, BookOpen,
  TrendingUp, Clock, CheckCircle, AlertTriangle, Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr, formatDateTimeAr } from "@/lib/utils";

interface ActivityLog {
  id: string;
  userId: string | null;
  userName: string;
  userRole: string | null;
  mosqueId: string | null;
  action: string;
  module: string;
  details: string | null;
  status: string;
  createdAt: string;
}

interface TeacherPerf {
  teacherId: string;
  teacherName: string;
  totalStudents: number;
  activeStudents: number;
  totalAssignments: number;
  gradedAssignments: number;
  pendingAssignments: number;
  avgStudentGrade: number;
  avgGradingDays: number;
  weeklyAssignmentRate: number;
}

interface WeakSurah {
  surahName: string;
  avgGrade: number;
  totalAssignments: number;
  lowGradeCount: number;
  lowPercentage: number;
}

export default function TeacherActivitiesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("activities");
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [teacherPerf, setTeacherPerf] = useState<TeacherPerf | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfDialogOpen, setPerfDialogOpen] = useState(false);

  const [weakSurahs, setWeakSurahs] = useState<WeakSurah[]>([]);
  const [weaknessLoading, setWeaknessLoading] = useState(false);
  const [mosques, setMosques] = useState<any[]>([]);
  const [selectedMosqueId, setSelectedMosqueId] = useState<string>(user?.mosqueId || "");

  const isAdmin = user?.role === "admin";

  const fetchWeakness = (mosqueId: string) => {
    if (!mosqueId) return;
    setWeaknessLoading(true);
    fetch(`/api/collective-weakness/${mosqueId}`, { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setWeakSurahs(Array.isArray(data) ? data : []))
      .catch(() => setWeakSurahs([]))
      .finally(() => setWeaknessLoading(false));
  };

  useEffect(() => {
    fetch("/api/teacher-activities", { credentials: "include" })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Failed to load");
      })
      .then(data => setLogs(data))
      .catch(() => {
        toast({ title: "خطأ", description: "فشل في تحميل أنشطة الأساتذة", variant: "destructive" });
      })
      .finally(() => setLoading(false));

    setTeachersLoading(true);
    fetch("/api/users?role=teacher", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setTeachers(data))
      .catch(() => setTeachers([]))
      .finally(() => setTeachersLoading(false));

    if (isAdmin) {
      fetch("/api/mosques", { credentials: "include" })
        .then(res => res.ok ? res.json() : [])
        .then(data => setMosques(data))
        .catch(() => setMosques([]));
    }

    if (user?.mosqueId) {
      fetchWeakness(user.mosqueId);
    }
  }, []);

  const openTeacherPerf = async (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setPerfDialogOpen(true);
    setPerfLoading(true);
    try {
      const res = await fetch(`/api/teacher-performance/${teacherId}`, { credentials: "include" });
      if (res.ok) setTeacherPerf(await res.json());
      else setTeacherPerf(null);
    } catch {
      setTeacherPerf(null);
    } finally {
      setPerfLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.userName.includes(searchTerm) || log.action.includes(searchTerm) || log.module.includes(searchTerm)
  );

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return formatDateTimeAr(d);
    } catch {
      return dateStr;
    }
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      assignments: "الواجبات",
      exams: "الامتحانات",
      ratings: "التقييمات",
      students: "الطلاب",
      users: "المستخدمين",
    };
    return labels[module] || module;
  };

  const gradeColor = (grade: number) => {
    if (grade >= 90) return "text-emerald-700 bg-emerald-50";
    if (grade >= 75) return "text-blue-700 bg-blue-50";
    if (grade >= 60) return "text-amber-700 bg-amber-50";
    return "text-red-700 bg-red-50";
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-teacher-activities">أنشطة الأساتذة</h1>
        <p className="text-muted-foreground">متابعة أنشطة وأداء الأساتذة وتحليل نقاط الضعف</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList data-testid="teacher-activities-tabs">
          <TabsTrigger value="activities" className="gap-1 text-xs sm:text-sm" data-testid="tab-activities">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">سجل الأنشطة</span>
            <span className="sm:hidden">أنشطة</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1 text-xs sm:text-sm" data-testid="tab-performance">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">أداء الأساتذة</span>
            <span className="sm:hidden">أداء</span>
          </TabsTrigger>
          <TabsTrigger value="weakness" className="gap-1 text-xs sm:text-sm" data-testid="tab-weakness">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">نقاط الضعف</span>
            <span className="sm:hidden">ضعف</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  سجل أنشطة الأساتذة
                </CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث..."
                    className="pr-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-teacher-activities"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-3 md:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12" data-testid="status-loading-teacher-activities">
                  <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
                  <span>جاري التحميل...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="status-empty-activities">
                  لا توجد أنشطة مسجلة حتى الآن
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الأستاذ</TableHead>
                        <TableHead className="text-right">النشاط</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">القسم</TableHead>
                        <TableHead className="text-right hidden md:table-cell">التفاصيل</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-activity-${log.id}`}>
                          <TableCell className="font-bold" data-testid={`text-teacher-${log.id}`}>{log.userName}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="bg-slate-100">{getModuleLabel(log.module)}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{log.details || "—"}</TableCell>
                          <TableCell className="text-sm hidden sm:table-cell" dir="ltr">{formatDate(log.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
                أداء الأساتذة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teachersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
                  <span>جاري التحميل...</span>
                </div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="status-empty-teachers">
                  لا يوجد أساتذة
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الأستاذ</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">الحالة</TableHead>
                        <TableHead className="text-right hidden md:table-cell">الهاتف</TableHead>
                        <TableHead className="text-center">عرض الأداء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.map((teacher) => (
                        <TableRow key={teacher.id} data-testid={`row-teacher-${teacher.id}`}>
                          <TableCell className="font-medium">{teacher.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant={teacher.isActive ? "default" : "destructive"} className={teacher.isActive ? "bg-green-100 text-green-700 border-none" : ""}>
                              {teacher.isActive ? "نشط" : "متوقف"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell" dir="ltr">{teacher.phone || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => openTeacherPerf(teacher.id)}
                              data-testid={`button-perf-${teacher.id}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              الأداء
                            </Button>
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

        <TabsContent value="weakness">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                نقاط الضعف الجماعية (السور ذات الدرجات المنخفضة)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAdmin && mosques.length > 0 && (
                <div className="mb-4">
                  <Select value={selectedMosqueId} onValueChange={(v) => { setSelectedMosqueId(v); fetchWeakness(v); }}>
                    <SelectTrigger className="w-full sm:w-72" data-testid="select-weakness-mosque">
                      <SelectValue placeholder="اختر المسجد" />
                    </SelectTrigger>
                    <SelectContent>
                      {mosques.filter((m: any) => m.isActive !== false).map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {weaknessLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
                  <span>جاري التحليل...</span>
                </div>
              ) : !selectedMosqueId && !user?.mosqueId ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="status-no-mosque">
                  يرجى اختيار المسجد لعرض التحليل
                </div>
              ) : weakSurahs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="status-empty-weakness">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p className="text-lg font-medium">لا توجد نقاط ضعف ملحوظة</p>
                  <p className="text-sm mt-1">جميع السور بمعدلات جيدة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">السور التي يعاني فيها الطلاب أكثر — مرتبة حسب نسبة الدرجات المنخفضة (أقل من 70)</p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">السورة</TableHead>
                          <TableHead className="text-right">معدل الدرجة</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">عدد الواجبات</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">درجات منخفضة</TableHead>
                          <TableHead className="text-right">نسبة الضعف</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weakSurahs.map((surah, i) => (
                          <TableRow key={surah.surahName} data-testid={`row-weak-${i}`}>
                            <TableCell className="font-bold">{surah.surahName}</TableCell>
                            <TableCell>
                              <Badge className={gradeColor(surah.avgGrade)}>{surah.avgGrade}%</Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{surah.totalAssignments}</TableCell>
                            <TableCell className="hidden sm:table-cell text-red-600 font-medium">{surah.lowGradeCount}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={surah.lowPercentage} className="h-2 w-20" />
                                <span className="text-sm font-medium text-red-600">{surah.lowPercentage}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={perfDialogOpen} onOpenChange={setPerfDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              تقرير أداء الأستاذ
            </DialogTitle>
          </DialogHeader>
          {perfLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !teacherPerf ? (
            <p className="text-center py-8 text-muted-foreground">لا تتوفر بيانات</p>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-bold" data-testid="text-perf-name">{teacherPerf.teacherName}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-center" data-testid="stat-perf-students">
                  <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-blue-700">{teacherPerf.activeStudents}</p>
                  <p className="text-xs text-blue-600">طلاب نشطون</p>
                  <p className="text-xs text-muted-foreground">من {teacherPerf.totalStudents}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center" data-testid="stat-perf-grade">
                  <TrendingUp className="w-4 h-4 text-green-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-green-700">{teacherPerf.avgStudentGrade}%</p>
                  <p className="text-xs text-green-600">متوسط درجات الطلاب</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 text-center" data-testid="stat-perf-assignments">
                  <BookOpen className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-purple-700">{teacherPerf.gradedAssignments}</p>
                  <p className="text-xs text-purple-600">واجبات مُقيَّمة</p>
                  <p className="text-xs text-muted-foreground">من {teacherPerf.totalAssignments}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-center" data-testid="stat-perf-pending">
                  <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-amber-700">{teacherPerf.pendingAssignments}</p>
                  <p className="text-xs text-amber-600">واجبات معلقة</p>
                </div>
              </div>

              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">سرعة التقييم (أيام)</span>
                  <Badge variant="outline" className={teacherPerf.avgGradingDays <= 1 ? "bg-green-50 text-green-700" : teacherPerf.avgGradingDays <= 3 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}>
                    {teacherPerf.avgGradingDays} يوم
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">معدل الواجبات الأسبوعي</span>
                  <Badge variant="outline">{teacherPerf.weeklyAssignmentRate} واجب/أسبوع</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">نسبة الإنجاز</span>
                  <div className="flex items-center gap-2">
                    <Progress value={teacherPerf.totalAssignments > 0 ? Math.round((teacherPerf.gradedAssignments / teacherPerf.totalAssignments) * 100) : 0} className="h-2 w-20" />
                    <span className="text-sm font-medium">
                      {teacherPerf.totalAssignments > 0 ? Math.round((teacherPerf.gradedAssignments / teacherPerf.totalAssignments) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
