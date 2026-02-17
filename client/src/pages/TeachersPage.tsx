import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Phone, Download, Printer, Upload, Loader2, Camera, MessageCircle, X } from "lucide-react";
import { isValidIraqiPhone, getWhatsAppUrl, usePhoneValidation, phoneInputClassName } from "@/lib/phone-utils";
import { useAuth } from "@/lib/auth-context";
import { openPrintWindow } from "@/lib/print-utils";
import { useToast } from "@/hooks/use-toast";
import { exportJsonToExcel, readExcelFile } from "@/lib/excel-utils";
import UsernameInput from "@/components/UsernameInput";
import CredentialsShareDialog from "@/components/CredentialsShareDialog";

interface Teacher {
  id: string;
  username: string;
  name: string;
  role: string;
  mosqueId?: string | null;
  phone?: string;
  address?: string;
  avatar?: string;
  gender?: string | null;
  isActive: boolean;
}

export default function TeachersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "", password: "", name: "", phone: "", avatar: "", gender: "male"
  });
  const [credentialsDialog, setCredentialsDialog] = useState<{ open: boolean; name: string; username: string; password: string; phone: string; role: string } | null>(null);
  const phoneValidation = usePhoneValidation(formData.phone);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportJsonToExcel(
      teachers.map(t => ({
        الاسم: t.name,
        "اسم المستخدم": t.username,
        الهاتف: t.phone || "",
        الحالة: t.isActive ? "نشط" : "متوقف"
      })),
      "Teachers",
      "teachers_list.xlsx",
    );
  };

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
              role: "teacher",
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
        description: `تم استيراد ${success} أستاذ بنجاح${failed > 0 ? `، فشل ${failed}` : ""}`,
        className: failed === 0 ? "bg-green-50 border-green-200 text-green-800" : undefined,
        variant: failed > 0 && success === 0 ? "destructive" : undefined,
      });
      if (success > 0) fetchTeachers();
    } catch {
      toast({ title: "خطأ", description: "فشل في قراءة الملف", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/users?role=teacher", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل بيانات الأساتذة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleAddTeacher = async () => {
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
        body: JSON.stringify({ ...formData, role: "teacher" }),
      });
      if (res.ok) {
        const savedName = formData.name;
        const savedUsername = formData.username;
        const savedPassword = formData.password;
        const savedPhone = formData.phone;
        toast({ title: "تم بنجاح", description: "تمت إضافة الأستاذ بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        setFormData({ username: "", password: "", name: "", phone: "", avatar: "", gender: "male" });
        fetchTeachers();
        setCredentialsDialog({ open: true, name: savedName, username: savedUsername, password: savedPassword, phone: savedPhone, role: "teacher" });
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة الأستاذ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveFilters = filterGender !== "all" || filterStatus !== "all" || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setSearchTerm("");
    setFilterGender("all");
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const filteredTeachers = teachers.filter(t => {
    if (searchTerm && !t.name.includes(searchTerm) && !t.username.includes(searchTerm)) return false;
    if (filterGender !== "all" && t.gender !== filterGender) return false;
    if (filterStatus !== "all") {
      if (filterStatus === "active" && !t.isActive) return false;
      if (filterStatus === "inactive" && t.isActive) return false;
    }
    if (filterDateFrom && (t as any).createdAt) {
      if (new Date((t as any).createdAt) < new Date(filterDateFrom)) return false;
    }
    if (filterDateTo && (t as any).createdAt) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date((t as any).createdAt) > toDate) return false;
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">الأساتذة</h1>
          <p className="text-muted-foreground">إدارة هيئة التدريس والمشرفين</p>
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
                  <h3 class="section-title">قائمة الأساتذة (${filteredTeachers.length})</h3>
                  <table>
                    <thead>
                      <tr><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>الهاتف</th><th>الحالة</th></tr>
                    </thead>
                    <tbody>
                      ${filteredTeachers.map((t, i) => `
                        <tr>
                          <td>${i + 1}</td>
                          <td>${t.name}</td>
                          <td>${t.username}</td>
                          <td>${t.phone || "—"}</td>
                          <td>${t.isActive ? "نشط" : "متوقف"}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                `;
                openPrintWindow("قائمة الأساتذة", tableHtml);
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
          {user?.role === "supervisor" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white gap-2" data-testid="button-add-teacher">
                  <Plus className="w-4 h-4" />
                  إضافة أستاذ
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة أستاذ جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden shrink-0">
                      {formData.avatar ? (
                        <img src={formData.avatar} alt="صورة" className="w-full h-full object-cover" data-testid="img-teacher-avatar-preview" />
                      ) : (
                        <Camera className="w-6 h-6 text-muted-foreground/40" />
                      )}
                    </div>
                    <div>
                      <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarSelect} data-testid="input-teacher-avatar" />
                      <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} className="gap-1" data-testid="button-teacher-avatar">
                        <Camera className="w-3.5 h-3.5" />
                        صورة شخصية
                      </Button>
                    </div>
                  </div>
                  <UsernameInput
                    value={formData.username}
                    onChange={(v) => setFormData({...formData, username: v})}
                  />
                  <div className="space-y-2">
                    <Label>كلمة المرور *</Label>
                    <Input data-testid="input-password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input data-testid="input-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
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
                    <Label>الهاتف <span className="text-red-500">*</span></Label>
                    <Input data-testid="input-phone" className={phoneInputClassName(phoneValidation, formData.phone)} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} dir="ltr" placeholder="07xxxxxxxxx" required />
                    {formData.phone && !isValidIraqiPhone(formData.phone) && (
                      <p className="text-xs text-orange-500 mt-1" data-testid="text-phone-warning">⚠ صيغة الرقم غير مطابقة للأرقام العراقية (مثال: 07xxxxxxxxx)</p>
                    )}
                    {phoneValidation.message && (
                      <p className={`text-xs mt-1 ${phoneValidation.valid ? "text-green-600" : "text-red-500"}`} data-testid="text-phone-validation">{phoneValidation.message}</p>
                    )}
                  </div>
                  <Button onClick={handleAddTeacher} disabled={submitting} className="w-full" data-testid="button-submit-teacher">
                    {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                    إضافة الأستاذ
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card dir="rtl">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">قائمة الأساتذة ({filteredTeachers.length})</CardTitle>
          </div>
          <div className="flex flex-wrap items-end gap-3 mt-3">
            <div className="relative w-full sm:w-52">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن أستاذ..."
                className="pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <div className="w-full sm:w-36">
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger data-testid="select-filter-gender">
                  <SelectValue placeholder="الجنس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الجنس - الكل</SelectItem>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الحالة - الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">متوقف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs text-muted-foreground mb-1 block">من تاريخ</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                data-testid="input-filter-date-from"
              />
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                data-testid="input-filter-date-to"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-destructive hover:text-destructive" data-testid="button-clear-filters">
                <X className="w-4 h-4" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="status-loading">
              <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
              <span>جاري التحميل...</span>
            </div>
          ) : filteredTeachers.length === 0 ? (
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
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تواصل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id} data-testid={`row-teacher-${teacher.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${teacher.id}`}>{teacher.name}</TableCell>
                      <TableCell className="hidden sm:table-cell" data-testid={`text-gender-${teacher.id}`}>{teacher.gender === "female" ? "أنثى" : "ذكر"}</TableCell>
                      <TableCell className="hidden sm:table-cell" dir="ltr" data-testid={`text-phone-${teacher.id}`}>{teacher.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={teacher.isActive ? "default" : "secondary"}
                          className={teacher.isActive ? "bg-green-100 text-green-700 hover:bg-green-200 border-none" : "bg-orange-100 text-orange-700 border-none"}
                          data-testid={`status-active-${teacher.id}`}
                        >
                          {teacher.isActive ? "نشط" : "متوقف"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          {teacher.phone && (
                            <>
                              <Button variant="ghost" size="icon" data-testid={`button-phone-${teacher.id}`}>
                                <Phone className="w-4 h-4 text-gray-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => window.open(getWhatsAppUrl(teacher.phone!), "_blank")}
                                title="واتساب"
                                data-testid={`button-whatsapp-${teacher.id}`}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
