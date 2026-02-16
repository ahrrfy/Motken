import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Plus, Printer, Upload, Loader2, ArrowRightLeft, GraduationCap, Camera, MessageCircle } from "lucide-react";
import { isValidIraqiPhone, getWhatsAppUrl } from "@/lib/phone-utils";
import { useAuth } from "@/lib/auth-context";
import { openPrintWindow } from "@/lib/print-utils";
import { useToast } from "@/hooks/use-toast";
import { exportJsonToExcel, readExcelFile } from "@/lib/excel-utils";
import UsernameInput from "@/components/UsernameInput";
import CredentialsShareDialog from "@/components/CredentialsShareDialog";

interface Student {
  id: string;
  username: string;
  name: string;
  role: string;
  mosqueId?: string | null;
  teacherId?: string | null;
  phone?: string;
  address?: string;
  avatar?: string;
  gender?: string | null;
  age?: number | null;
  telegramId?: string | null;
  parentPhone?: string | null;
  educationLevel?: string | null;
  isSpecialNeeds?: boolean;
  isOrphan?: boolean;
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
    name: "", username: "", password: "", phone: "", address: "", avatar: "", gender: "male",
    age: "", telegramId: "", parentPhone: "", educationLevel: "", isSpecialNeeds: false, isOrphan: false
  });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [credentialsDialog, setCredentialsDialog] = useState<{ open: boolean; name: string; username: string; password: string; phone: string; role: string } | null>(null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى اختيار ملف صورة", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      if (base64.length > 500000) {
        toast({ title: "خطأ", description: "حجم الصورة كبير جداً (الحد الأقصى ~375KB)", variant: "destructive" });
        return;
      }
      setFormData(prev => ({ ...prev, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const isSupervisor = user?.role === "supervisor";
  const isTeacher = user?.role === "teacher";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readExcelFile(file);
      let success = 0;
      let failed = 0;
      for (const row of rows) {
        try {
          const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: row["الاسم"] || "",
              username: row["اسم المستخدم"] || "",
              password: row["كلمة المرور"] || "",
              phone: row["الهاتف"] || "",
              address: row["العنوان"] || "",
              age: row["العمر"] ? parseInt(row["العمر"]) : null,
              parentPhone: row["هاتف ولي الأمر"] || "",
              telegramId: row["التلغرام"] || "",
              educationLevel: row["المستوى الدراسي"] || "",
              role: "student",
            }),
          });
          if (res.ok) success++;
          else failed++;
        } catch {
          failed++;
        }
      }
      toast({
        title: "نتيجة الاستيراد",
        description: `تم استيراد ${success} طالب بنجاح${failed > 0 ? `، فشل ${failed}` : ""}`,
        className: failed === 0 ? "bg-green-50 border-green-200 text-green-800" : undefined,
        variant: failed > 0 && success === 0 ? "destructive" : undefined,
      });
      if (success > 0) fetchData();
    } catch {
      toast({ title: "خطأ", description: "فشل في قراءة الملف", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
    exportJsonToExcel(
      students.map(s => ({
        الاسم: s.name,
        الهاتف: s.phone || "",
        العمر: s.age || "",
        "هاتف ولي الأمر": s.parentPhone || "",
        التلغرام: s.telegramId || "",
        "المستوى الدراسي": s.educationLevel || "",
        "ذوي الاحتياجات": s.isSpecialNeeds ? "نعم" : "لا",
        يتيم: s.isOrphan ? "نعم" : "لا",
        الأستاذ: getTeacherName(s.teacherId),
        الحالة: s.isActive ? "نشط" : "متوقف"
      })),
      "Students",
      "students_list.xlsx",
    );
  };

  const handleAddStudent = async () => {
    if (!formData.username || !formData.password || !formData.name || !formData.phone) {
      toast({ title: "خطأ", description: "يرجى تعبئة الحقول المطلوبة (الاسم، اسم المستخدم، كلمة المرور، رقم الهاتف)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          role: "student",
          age: formData.age ? parseInt(formData.age) : null,
          educationLevel: formData.educationLevel || null,
          telegramId: formData.telegramId || null,
          parentPhone: formData.parentPhone || null,
        }),
      });
      if (res.ok) {
        const savedName = formData.name;
        const savedUsername = formData.username;
        const savedPassword = formData.password;
        const savedPhone = formData.phone;
        toast({ title: "تم بنجاح", description: "تمت إضافة الطالب بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        setFormData({ name: "", username: "", password: "", phone: "", address: "", avatar: "", gender: "male", age: "", telegramId: "", parentPhone: "", educationLevel: "", isSpecialNeeds: false, isOrphan: false });
        fetchData();
        setCredentialsDialog({ open: true, name: savedName, username: savedUsername, password: savedPassword, phone: savedPhone, role: "student" });
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
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">الطلاب</h1>
          <p className="text-muted-foreground">إدارة بيانات الطلاب ومتابعة تقدمهم</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImport}
            data-testid="input-file-import"
          />
          {user?.role !== "student" && (
            <>
              <Button variant="outline" onClick={() => {
                const tableHtml = `
                  <h3 class="section-title">قائمة الطلاب (${filteredStudents.length})</h3>
                  <table>
                    <thead>
                      <tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>العمر</th><th>المستوى الدراسي</th><th>الحالة</th></tr>
                    </thead>
                    <tbody>
                      ${filteredStudents.map((s, i) => `
                        <tr>
                          <td>${i + 1}</td>
                          <td>${s.name}</td>
                          <td>${s.phone || "—"}</td>
                          <td>${s.age || "—"}</td>
                          <td>${s.educationLevel || "—"}</td>
                          <td>${s.isActive ? "نشط" : "متوقف"}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                `;
                openPrintWindow("قائمة الطلاب", tableHtml);
              }} className="gap-2" data-testid="button-print">
                <Printer className="w-4 h-4" />
                طباعة
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2" data-testid="button-import">
                <Upload className="w-4 h-4" />
                استيراد
              </Button>
              <Button variant="outline" onClick={handleExport} className="gap-2" data-testid="button-export">
                <Download className="w-4 h-4" />
                تصدير
              </Button>
            </>
          )}
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
                <div className="space-y-4 mt-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden shrink-0">
                      {formData.avatar ? (
                        <img src={formData.avatar} alt="صورة" className="w-full h-full object-cover" data-testid="img-student-avatar-preview" />
                      ) : (
                        <Camera className="w-6 h-6 text-muted-foreground/40" />
                      )}
                    </div>
                    <div>
                      <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarSelect} data-testid="input-student-avatar" />
                      <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} className="gap-1" data-testid="button-student-avatar">
                        <Camera className="w-3.5 h-3.5" />
                        صورة شخصية
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input data-testid="input-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <UsernameInput
                    value={formData.username}
                    onChange={(v) => setFormData({...formData, username: v})}
                    editingUserId={selectedStudent?.id}
                  />
                  <div className="space-y-2">
                    <Label>كلمة المرور *</Label>
                    <Input data-testid="input-password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>الجنس</Label>
                    <Select value={formData.gender} onValueChange={(v) => setFormData(prev => ({...prev, gender: v}))}>
                      <SelectTrigger data-testid="select-gender">
                        <SelectValue placeholder="اختر الجنس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>العمر</Label>
                    <Input data-testid="input-age" type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>الهاتف <span className="text-red-500">*</span></Label>
                    <Input data-testid="input-phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} dir="ltr" placeholder="07xxxxxxxxx" required />
                    {formData.phone && !isValidIraqiPhone(formData.phone) && (
                      <p className="text-xs text-orange-500 mt-1" data-testid="text-phone-warning">⚠ صيغة الرقم غير مطابقة للأرقام العراقية (مثال: 07xxxxxxxxx)</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>هاتف ولي الأمر</Label>
                    <Input data-testid="input-parent-phone" value={formData.parentPhone} onChange={e => setFormData({...formData, parentPhone: e.target.value})} dir="ltr" placeholder="07xxxxxxxxx" />
                    {formData.parentPhone && !isValidIraqiPhone(formData.parentPhone) && (
                      <p className="text-xs text-orange-500 mt-1" data-testid="text-parent-phone-warning">⚠ صيغة الرقم غير مطابقة للأرقام العراقية (مثال: 07xxxxxxxxx)</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>معرف التلغرام</Label>
                    <Input data-testid="input-telegram-id" value={formData.telegramId} onChange={e => setFormData({...formData, telegramId: e.target.value})} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>العنوان</Label>
                    <Input data-testid="input-address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>المستوى الدراسي</Label>
                    <Select value={formData.educationLevel} onValueChange={(v) => setFormData(prev => ({...prev, educationLevel: v}))}>
                      <SelectTrigger data-testid="select-education-level">
                        <SelectValue placeholder="اختر المستوى الدراسي" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school">مدرسة</SelectItem>
                        <SelectItem value="university">جامعة</SelectItem>
                        <SelectItem value="postgraduate">دراسات عليا</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="special-needs"
                      checked={formData.isSpecialNeeds}
                      onCheckedChange={(v) => setFormData(prev => ({...prev, isSpecialNeeds: !!v}))}
                      data-testid="checkbox-special-needs"
                    />
                    <Label htmlFor="special-needs">من ذوي الاحتياجات الخاصة</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="orphan"
                      checked={formData.isOrphan}
                      onCheckedChange={(v) => setFormData(prev => ({...prev, isOrphan: !!v}))}
                      data-testid="checkbox-orphan"
                    />
                    <Label htmlFor="orphan">يتيم</Label>
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">قائمة الطلاب ({filteredStudents.length})</CardTitle>
            <div className="relative w-full sm:w-64">
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
        <CardContent className="p-0 sm:p-4 md:p-6">
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
                    <TableHead className="text-right hidden sm:table-cell">الجنس</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">الهاتف</TableHead>
                    {isSupervisor && <TableHead className="text-right hidden md:table-cell">الأستاذ</TableHead>}
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
                      <TableCell className="hidden sm:table-cell" data-testid={`text-gender-${student.id}`}>{student.gender === "female" ? "أنثى" : "ذكر"}</TableCell>
                      <TableCell className="hidden sm:table-cell" dir="ltr" data-testid={`text-phone-${student.id}`}>
                        <div className="flex items-center gap-1">
                          <span>{student.phone || "—"}</span>
                          {student.phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => window.open(getWhatsAppUrl(student.phone!), "_blank")}
                              title="واتساب"
                              data-testid={`button-whatsapp-${student.id}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {student.parentPhone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => window.open(getWhatsAppUrl(student.parentPhone!), "_blank")}
                              title="واتساب ولي الأمر"
                              data-testid={`button-whatsapp-parent-${student.id}`}
                            >
                              <MessageCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      {isSupervisor && (
                        <TableCell className="hidden md:table-cell">
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

      {credentialsDialog && (
        <CredentialsShareDialog
          open={credentialsDialog.open}
          onClose={() => setCredentialsDialog(null)}
          name={credentialsDialog.name}
          username={credentialsDialog.username}
          password={credentialsDialog.password}
          phone={credentialsDialog.phone}
          role={credentialsDialog.role}
          mosqueName={user?.mosqueName || undefined}
        />
      )}
    </div>
  );
}
