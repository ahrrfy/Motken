import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Plus, Printer, Upload, Loader2, ArrowRightLeft, GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  username: string;
  name: string;
  role: string;
  mosqueId?: string | null;
  teacherId?: string | null;
  email?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  isActive: boolean;
}

interface Teacher {
  id: string;
  name: string;
  username: string;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newTeacherId, setNewTeacherId] = useState("");
  const [formData, setFormData] = useState({
    username: "", password: "", name: "", email: "", phone: "", address: ""
  });

  const isSupervisor = user?.role === "supervisor";
  const isTeacher = user?.role === "teacher";

  const fetchData = async () => {
    try {
      const [studentsRes, teachersRes] = await Promise.all([
        fetch("/api/users?role=student", { credentials: "include" }),
        isSupervisor ? fetch("/api/users?role=teacher", { credentials: "include" }) : Promise.resolve(null),
      ]);
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (teachersRes?.ok) setTeachers(await teachersRes.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(students.map(s => ({
      الاسم: s.name,
      البريد: s.email || "",
      الهاتف: s.phone || "",
      الأستاذ: getTeacherName(s.teacherId),
      الحالة: s.isActive ? "نشط" : "متوقف"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "students_list.xlsx");
  };

  const handleAddStudent = async () => {
    if (!formData.username || !formData.password || !formData.name) {
      toast({ title: "خطأ", description: "يرجى تعبئة الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...formData, role: "student" }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تمت إضافة الطالب بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        setFormData({ username: "", password: "", name: "", email: "", phone: "", address: "" });
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة الطالب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedStudent || !newTeacherId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedStudent.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newTeacherId }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: `تم نقل الطالب ${selectedStudent.name} بنجاح` });
        setTransferDialogOpen(false);
        setSelectedStudent(null);
        setNewTeacherId("");
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getTeacherName = (teacherId?: string | null) => {
    if (!teacherId) return "غير محدد";
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher?.name || "غير محدد";
  };

  const openTransferDialog = (student: Student) => {
    setSelectedStudent(student);
    setNewTeacherId("");
    setTransferDialogOpen(true);
  };

  const filteredStudents = students.filter(s => s.name.includes(searchTerm) || s.username.includes(searchTerm));

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">الطلاب</h1>
          <p className="text-muted-foreground">إدارة بيانات الطلاب ومتابعة تقدمهم</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => window.print()} className="gap-2" data-testid="button-print">
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-import">
            <Upload className="w-4 h-4" />
            استيراد
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2" data-testid="button-export">
            <Download className="w-4 h-4" />
            تصدير
          </Button>
          {isTeacher && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white gap-2" data-testid="button-add-student">
                  <Plus className="w-4 h-4" />
                  إضافة طالب
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة طالب جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>اسم المستخدم *</Label>
                    <Input data-testid="input-username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور *</Label>
                    <Input data-testid="input-password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input data-testid="input-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input data-testid="input-email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>الهاتف</Label>
                    <Input data-testid="input-phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>العنوان</Label>
                    <Input data-testid="input-address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <Button onClick={handleAddStudent} disabled={submitting} className="w-full" data-testid="button-submit-student">
                    {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                    إضافة الطالب
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">قائمة الطلاب ({filteredStudents.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن طالب..."
                className="pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="status-loading">
              <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
              <span>جاري التحميل...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="status-empty">
              لا توجد بيانات
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">البريد</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">الهاتف</TableHead>
                    {isSupervisor && <TableHead className="text-right">الأستاذ</TableHead>}
                    <TableHead className="text-right">الحالة</TableHead>
                    {isSupervisor && <TableHead className="text-center">إجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${student.id}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {student.name?.charAt(0)}
                          </div>
                          {student.name}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-email-${student.id}`}>{student.email || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell" dir="ltr" data-testid={`text-phone-${student.id}`}>{student.phone || "—"}</TableCell>
                      {isSupervisor && (
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <GraduationCap className="w-3.5 h-3.5" />
                            {getTeacherName(student.teacherId)}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge
                          variant={student.isActive ? "default" : "destructive"}
                          className={student.isActive ? "bg-green-100 text-green-700 hover:bg-green-200 border-none" : ""}
                          data-testid={`status-active-${student.id}`}
                        >
                          {student.isActive ? "نشط" : "متوقف"}
                        </Badge>
                      </TableCell>
                      {isSupervisor && (
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => openTransferDialog(student)}
                            data-testid={`button-transfer-${student.id}`}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            نقل
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>نقل طالب إلى أستاذ آخر</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 mt-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">الطالب:</p>
                <p className="font-bold text-lg">{selectedStudent.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  الأستاذ الحالي: <span className="font-medium text-foreground">{getTeacherName(selectedStudent.teacherId)}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>الأستاذ الجديد *</Label>
                <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                  <SelectTrigger data-testid="select-new-teacher">
                    <SelectValue placeholder="اختر الأستاذ الجديد" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers
                      .filter(t => t.id !== selectedStudent.teacherId)
                      .map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">سيتم نقل جميع واجبات الطالب إلى الأستاذ الجديد أيضاً.</p>
              <Button onClick={handleTransfer} disabled={submitting || !newTeacherId} className="w-full" data-testid="button-confirm-transfer">
                {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                تأكيد النقل
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
