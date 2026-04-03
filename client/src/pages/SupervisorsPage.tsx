import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, Phone, Loader2, Camera, Building2, Search } from "lucide-react";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import type { ColumnDef } from "@/components/data-table-toolbar";
import LinkedAccountsBadge from "@/components/LinkedAccountsBadge";
import { usePhoneValidation, phoneInputClassName, isValidPhone } from "@/lib/phone-utils";
import { InternationalPhoneInput } from "@/components/international-phone-input";
import { useAuth } from "@/lib/auth-context";
import { usePrintPreview } from "@/lib/print-context";
import { useToast } from "@/hooks/use-toast";
import UsernameInput from "@/components/UsernameInput";
import CredentialsShareDialog from "@/components/CredentialsShareDialog";

interface Supervisor {
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

interface Mosque {
  id: string;
  name: string;
}

export default function SupervisorsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openPrintPreview } = usePrintPreview();
  const [searchTerm, setSearchTerm] = useState("");
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "", password: "", name: "", phone: "", avatar: "", gender: "male", mosqueId: ""
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

  const SUPERVISOR_EXPORT_COLS: ColumnDef[] = [
    { label: "الاسم", field: "name" },
    { label: "اسم المستخدم", field: "username" },
    { label: "رقم الهاتف", field: "phone" },
    { label: "الجامع/المركز", field: "mosqueName" },
    { label: "الحالة", field: "statusLabel" },
  ];
  const SUPERVISOR_IMPORT_COLS: ColumnDef[] = [
    { label: "الاسم", field: "name" },
    { label: "اسم المستخدم", field: "username" },
    { label: "كلمة المرور", field: "password" },
    { label: "رقم الهاتف", field: "phone" },
    { label: "الجنس", field: "gender" },
  ];
  const supervisorPrint = () => {
    const tableHtml = `
      <h3 class="section-title">قائمة المشرفين (${filteredSupervisors.length})</h3>
      <table>
        <thead><tr><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>رقم الهاتف</th><th>الجامع/المركز</th><th>الحالة</th></tr></thead>
        <tbody>${filteredSupervisors.map((s, i) => `
          <tr><td>${i + 1}</td><td>${s.name}</td><td>${s.username}</td><td>${s.phone || "—"}</td><td>${getMosqueName(s.mosqueId)}</td><td>${s.isActive ? "نشط" : "متوقف"}</td></tr>
        `).join("")}</tbody>
      </table>`;
    openPrintPreview({ title: "قائمة المشرفين", contentHtml: tableHtml });
  };

  const getMosqueName = (mosqueId?: string | null) => {
    if (!mosqueId) return "—";
    const mosque = mosques.find(m => m.id === mosqueId);
    return mosque?.name || "—";
  };

  const fetchSupervisors = async () => {
    try {
      const res = await fetch("/api/users?role=supervisor", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSupervisors(data);
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل بيانات المشرفين", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMosques = async () => {
    try {
      const res = await fetch("/api/mosques", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMosques(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSupervisors();
    fetchMosques();
  }, []);

  const handleAddSupervisor = async () => {
    if (!formData.username || !formData.password || !formData.name || !formData.phone) {
      toast({ title: "خطأ", description: "يرجى تعبئة الحقول المطلوبة (الاسم، اسم المستخدم، كلمة المرور، رقم الهاتف)", variant: "destructive" });
      return;
    }
    if (!formData.mosqueId) {
      toast({ title: "خطأ", description: "يرجى اختيار الجامع أو مركز التحفيظ", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...formData, role: "supervisor" }),
      });
      if (res.ok) {
        const savedName = formData.name;
        const savedUsername = formData.username;
        const savedPassword = formData.password;
        const savedPhone = formData.phone;
        toast({ title: "تم بنجاح", description: "تمت إضافة المشرف بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        setFormData({ username: "", password: "", name: "", phone: "", avatar: "", gender: "male", mosqueId: "" });
        fetchSupervisors();
        setCredentialsDialog({ open: true, name: savedName, username: savedUsername, password: savedPassword, phone: savedPhone, role: "supervisor" });
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة المشرف", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSupervisors = supervisors.filter(s => s.name.includes(searchTerm));

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-supervisors">المشرفون</h1>
          <p className="text-muted-foreground">إدارة المشرفين على الجوامع ومراكز التحفيظ</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <DataTableToolbar
            data={filteredSupervisors.map(s => ({ ...s, mosqueName: getMosqueName(s.mosqueId), statusLabel: s.isActive ? "نشط" : "متوقف" }))}
            columns={SUPERVISOR_EXPORT_COLS}
            importColumns={SUPERVISOR_IMPORT_COLS}
            entityName="المشرفون"
            filename="supervisors"
            importEndpoint="/api/users/bulk-import?role=supervisor"
            onImportSuccess={fetchSupervisors}
            onPrint={supervisorPrint}
          />
          {user?.role === "admin" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white gap-2" data-testid="button-add-supervisor">
                  <Plus className="w-4 h-4" />
                  إضافة مشرف
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة مشرف جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden shrink-0">
                      {formData.avatar ? (
                        <img src={formData.avatar} alt="صورة" className="w-full h-full object-cover" data-testid="img-supervisor-avatar-preview" />
                      ) : (
                        <Camera className="w-6 h-6 text-muted-foreground/40" />
                      )}
                    </div>
                    <div>
                      <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarSelect} data-testid="input-supervisor-avatar" />
                      <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} className="gap-1" data-testid="button-supervisor-avatar">
                        <Camera className="w-3.5 h-3.5" />
                        صورة شخصية
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الكامل <span className="text-red-500">*</span></Label>
                    <Input data-testid="input-supervisor-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <UsernameInput
                    value={formData.username}
                    onChange={(v) => setFormData({...formData, username: v})}
                  />
                  <div className="space-y-2">
                    <Label>كلمة المرور <span className="text-red-500">*</span></Label>
                    <Input data-testid="input-supervisor-password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>الجنس</Label>
                    <Select value={formData.gender} onValueChange={(v) => setFormData(prev => ({...prev, gender: v}))}>
                      <SelectTrigger data-testid="select-supervisor-gender">
                        <SelectValue placeholder="اختر الجنس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف <span className="text-red-500">*</span></Label>
                    <InternationalPhoneInput
                      value={formData.phone}
                      onChange={(full) => setFormData(prev => ({ ...prev, phone: full }))}
                      error={phoneValidation.message && !phoneValidation.valid ? phoneValidation.message : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الجامع أو مركز التحفيظ <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                      options={mosques.map(m => ({ value: m.id, label: m.name }))}
                      value={formData.mosqueId}
                      onValueChange={(v) => setFormData(prev => ({...prev, mosqueId: v}))}
                      placeholder="اختر الجامع أو المركز"
                      searchPlaceholder="ابحث عن جامع..."
                      emptyText="لا يوجد جامع بهذا الاسم"
                      data-testid="select-supervisor-mosque"
                    />
                  </div>
                  <Button onClick={handleAddSupervisor} disabled={submitting} className="w-full" data-testid="button-submit-supervisor">
                    {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                    إضافة المشرف
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
            <CardTitle className="text-lg">قائمة المشرفين</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن مشرف..."
                className="pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-supervisors"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="status-loading-supervisors">
              <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
              <span>جاري التحميل...</span>
            </div>
          ) : filteredSupervisors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="status-empty">
              لا توجد بيانات
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">اسم المستخدم</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">الجنس</TableHead>
                    <TableHead className="text-right hidden md:table-cell">الهاتف</TableHead>
                    <TableHead className="text-right hidden md:table-cell">الجامع/المركز</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تواصل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupervisors.map((supervisor) => (
                    <TableRow key={supervisor.id} data-testid={`row-supervisor-${supervisor.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden">
                            {supervisor.avatar ? (
                              <img src={supervisor.avatar} alt={supervisor.name} className="w-full h-full object-cover" />
                            ) : (
                              supervisor.name?.charAt(0)
                            )}
                          </div>
                          <span data-testid={`text-name-${supervisor.id}`}>{supervisor.name}</span>
                          <LinkedAccountsBadge userId={supervisor.id} userRole="supervisor" userName={supervisor.name} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground" dir="ltr" data-testid={`text-username-${supervisor.id}`}>{supervisor.username}</TableCell>
                      <TableCell className="hidden sm:table-cell" data-testid={`text-gender-${supervisor.id}`}>{supervisor.gender === "female" ? "أنثى" : "ذكر"}</TableCell>
                      <TableCell className="hidden md:table-cell" dir="ltr" data-testid={`text-phone-${supervisor.id}`}>{supervisor.phone || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Building2 className="w-3 h-3" />
                          <span data-testid={`text-mosque-${supervisor.id}`}>{getMosqueName(supervisor.mosqueId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={supervisor.isActive ? "default" : "secondary"}
                          className={supervisor.isActive ? "bg-green-100 text-green-700 hover:bg-green-200 border-none" : "bg-orange-100 text-orange-700 border-none"}
                          data-testid={`status-active-${supervisor.id}`}
                        >
                          {supervisor.isActive ? "نشط" : "متوقف"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          {supervisor.phone && (
                            <Button variant="ghost" size="icon" asChild data-testid={`button-phone-${supervisor.id}`}>
                              <a href={`tel:${supervisor.phone}`}>
                                <Phone className="w-4 h-4 text-gray-500" />
                              </a>
                            </Button>
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
        />
      )}
    </div>
  );
}
