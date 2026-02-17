import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save, Calendar, ClipboardList, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  name: string;
  avatar?: string;
  teacherId?: string | null;
  mosqueId?: string | null;
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

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("mark");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceEntry>>({});
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  const isTeacher = user?.role === "teacher";
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";

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

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const updateStatus = (studentId: string, status: "present" | "absent" | "late" | "excused") => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const updateNotes = (studentId: string, notes: string) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
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

  const filteredHistory = history.filter((record) => {
    if (filterSearch && !record.studentName?.includes(filterSearch)) return false;
    return true;
  });

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" data-testid="attendance-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
            الحضور والغياب
          </h1>
          <p className="text-muted-foreground">إدارة حضور وغياب الطلاب</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-2 max-w-md" data-testid="tabs-attendance">
          <TabsTrigger value="mark" className="gap-2" data-testid="tab-mark-attendance">
            <ClipboardList className="w-4 h-4" />
            تسجيل الحضور
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2" data-testid="tab-attendance-history">
            <Calendar className="w-4 h-4" />
            سجل الحضور
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
                          <TableHead className="text-right">ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student, index) => (
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
                            <TableCell className="text-center">
                              <RadioGroup
                                value={attendanceData[student.id]?.status}
                                onValueChange={(val) => updateStatus(student.id, val as any)}
                                className="flex justify-center"
                              >
                                <RadioGroupItem
                                  value="present"
                                  className="border-green-500 text-green-500 data-[state=checked]:border-green-600"
                                  data-testid={`radio-present-${student.id}`}
                                />
                              </RadioGroup>
                            </TableCell>
                            <TableCell className="text-center">
                              <RadioGroup
                                value={attendanceData[student.id]?.status}
                                onValueChange={(val) => updateStatus(student.id, val as any)}
                                className="flex justify-center"
                              >
                                <RadioGroupItem
                                  value="absent"
                                  className="border-red-500 text-red-500 data-[state=checked]:border-red-600"
                                  data-testid={`radio-absent-${student.id}`}
                                />
                              </RadioGroup>
                            </TableCell>
                            <TableCell className="text-center">
                              <RadioGroup
                                value={attendanceData[student.id]?.status}
                                onValueChange={(val) => updateStatus(student.id, val as any)}
                                className="flex justify-center"
                              >
                                <RadioGroupItem
                                  value="late"
                                  className="border-yellow-500 text-yellow-500 data-[state=checked]:border-yellow-600"
                                  data-testid={`radio-late-${student.id}`}
                                />
                              </RadioGroup>
                            </TableCell>
                            <TableCell className="text-center">
                              <RadioGroup
                                value={attendanceData[student.id]?.status}
                                onValueChange={(val) => updateStatus(student.id, val as any)}
                                className="flex justify-center"
                              >
                                <RadioGroupItem
                                  value="excused"
                                  className="border-blue-500 text-blue-500 data-[state=checked]:border-blue-600"
                                  data-testid={`radio-excused-${student.id}`}
                                />
                              </RadioGroup>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="ملاحظات..."
                                value={attendanceData[student.id]?.notes || ""}
                                onChange={(e) => updateNotes(student.id, e.target.value)}
                                className="min-w-[120px]"
                                data-testid={`input-notes-${student.id}`}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
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
                            {record.date}
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
      </Tabs>
    </div>
  );
}