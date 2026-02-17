import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Edit, Trash2, Users, MapPin, Phone, Search, PauseCircle, XCircle, PlayCircle, ImagePlus, X } from "lucide-react";
import type { Mosque } from "@shared/schema";

interface MosqueStats {
  supervisors: number;
  teachers: number;
  students: number;
}

const emptyForm = { name: "", province: "", city: "", area: "", landmark: "", address: "", phone: "", managerName: "", description: "", adminNotes: "", image: "" };

const statusLabels: Record<string, string> = {
  active: "نشط",
  suspended: "موقوف مؤقتاً",
  permanently_closed: "موقوف نهائياً",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 hover:bg-green-200 border-none",
  suspended: "bg-orange-100 text-orange-700 hover:bg-orange-200 border-none",
  permanently_closed: "bg-red-100 text-red-700 hover:bg-red-200 border-none",
};

export default function MosquesPage() {
  const { toast } = useToast();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [stats, setStats] = useState<Record<string, MosqueStats>>({});
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingMosque, setEditingMosque] = useState<Mosque | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProvince, setFilterProvince] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchMosques = useCallback(async () => {
    try {
      const res = await fetch("/api/mosques", { credentials: "include" });
      if (!res.ok) throw new Error("فشل في تحميل البيانات");
      const data = await res.json();
      setMosques(data);
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الجوامع والمراكز", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchStats = useCallback(async (mosqueId: string) => {
    try {
      const res = await fetch(`/api/users?mosqueId=${mosqueId}`, { credentials: "include" });
      if (!res.ok) return;
      const users = await res.json();
      const s: MosqueStats = { supervisors: 0, teachers: 0, students: 0 };
      for (const u of users) {
        if (u.role === "supervisor") s.supervisors++;
        else if (u.role === "teacher") s.teachers++;
        else if (u.role === "student") s.students++;
      }
      setStats((prev) => ({ ...prev, [mosqueId]: s }));
    } catch {
    }
  }, []);

  useEffect(() => {
    fetchMosques();
  }, [fetchMosques]);

  useEffect(() => {
    mosques.forEach((m) => fetchStats(m.id));
  }, [mosques, fetchStats]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم الجامع/المركز", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { adminNotes, ...addData } = form;
      const res = await fetch("/api/mosques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(addData),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم بنجاح", description: "تمت إضافة الجامع/المركز بنجاح" });
      setAddOpen(false);
      setForm(emptyForm);
      fetchMosques();
    } catch {
      toast({ title: "خطأ", description: "فشل في إضافة الجامع/المركز", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingMosque || !form.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mosques/${editingMosque.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم بنجاح", description: "تم تعديل بيانات الجامع/المركز" });
      setEditOpen(false);
      setEditingMosque(null);
      setForm(emptyForm);
      fetchMosques();
    } catch {
      toast({ title: "خطأ", description: "فشل في تعديل الجامع/المركز", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (mosque: Mosque) => {
    try {
      const res = await fetch(`/api/mosques/${mosque.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم بنجاح", description: "تم حذف الجامع/المركز بنجاح" });
      fetchMosques();
    } catch {
      toast({ title: "خطأ", description: "فشل في حذف الجامع/المركز", variant: "destructive" });
    }
  };

  const handleStatusChange = async (mosque: Mosque, newStatus: string) => {
    try {
      const res = await fetch(`/api/mosques/${mosque.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const statusMsg = newStatus === "suspended" ? "تم إيقاف الجامع مؤقتاً" : newStatus === "permanently_closed" ? "تم إيقاف الجامع نهائياً" : "تم تفعيل الجامع";
      toast({ title: "تم بنجاح", description: statusMsg });
      fetchMosques();
    } catch {
      toast({ title: "خطأ", description: "فشل في تغيير حالة الجامع", variant: "destructive" });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({ title: "خطأ", description: "يرجى اختيار صورة بصيغة PNG أو JPG أو WebP", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 200;
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        let quality = 0.8;
        let base64 = canvas.toDataURL("image/jpeg", quality);
        while (base64.length > 500 * 1024 * 1.37 && quality > 0.1) {
          quality -= 0.1;
          base64 = canvas.toDataURL("image/jpeg", quality);
        }
        if (base64.length > 500 * 1024 * 1.37) {
          toast({ title: "خطأ", description: "حجم الصورة كبير جداً، يرجى اختيار صورة أصغر", variant: "destructive" });
          return;
        }
        handleChange("image", base64);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const openEditDialog = (mosque: Mosque) => {
    setEditingMosque(mosque);
    setForm({
      name: mosque.name || "",
      province: (mosque as any).province || "",
      city: mosque.city || "",
      area: (mosque as any).area || "",
      landmark: (mosque as any).landmark || "",
      address: mosque.address || "",
      phone: mosque.phone || "",
      managerName: (mosque as any).managerName || "",
      description: mosque.description || "",
      adminNotes: (mosque as any).adminNotes || "",
      image: mosque.image || "",
    });
    setEditOpen(true);
  };

  const formFields = [
    { key: "name", label: "اسم الجامع/المركز", required: true },
    { key: "managerName", label: "اسم مسؤول الجامع أو مركز التحفيظ" },
    { key: "province", label: "المحافظة" },
    { key: "city", label: "المدينة" },
    { key: "area", label: "المنطقة" },
    { key: "landmark", label: "أقرب نقطة دالة" },
    { key: "address", label: "العنوان التفصيلي" },
    { key: "phone", label: "الهاتف" },
    { key: "description", label: "الوصف" },
  ];

  const provinces = Array.from(new Set(mosques.map((m) => (m as any).province).filter(Boolean)));

  const filteredMosques = mosques.filter((m) => {
    const matchesSearch = !search || m.name.includes(search) || ((m as any).province || "").includes(search) || (m.city || "").includes(search);
    const matchesStatus = filterStatus === "all" || (m as any).status === filterStatus;
    const matchesProvince = filterProvince === "all" || (m as any).province === filterProvince;
    let matchesDate = true;
    if (dateFrom) {
      const from = new Date(dateFrom);
      matchesDate = matchesDate && new Date(m.createdAt) >= from;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(m.createdAt) <= to;
    }
    return matchesSearch && matchesStatus && matchesProvince && matchesDate;
  });

  const renderForm = (isEdit: boolean = false) => (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label>شعار الجامع/المركز</Label>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden bg-muted/30"
            onClick={() => document.getElementById('mosque-logo-input')?.click()}
            data-testid="button-upload-mosque-logo"
          >
            {form.image ? (
              <img src={form.image} alt="شعار" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <ImagePlus className="w-8 h-8 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm text-muted-foreground">اختر صورة شعار الجامع أو المركز</p>
            <p className="text-xs text-muted-foreground/60">PNG أو JPG - الحد الأقصى 500 كيلوبايت</p>
            {form.image && (
              <Button variant="ghost" size="sm" className="text-red-500 h-7 px-2" onClick={() => handleChange("image", "")} data-testid="button-remove-mosque-logo">
                <X className="w-3 h-3 ml-1" /> إزالة الشعار
              </Button>
            )}
          </div>
          <input
            id="mosque-logo-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
      </div>
      {formFields.map((f) => (
        <div key={f.key} className="space-y-2">
          <Label htmlFor={`field-${f.key}`}>
            {f.label} {f.required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={`field-${f.key}`}
            data-testid={`input-mosque-${f.key}`}
            value={form[f.key as keyof typeof form]}
            onChange={(e) => handleChange(f.key, e.target.value)}
            placeholder={f.label}
          />
        </div>
      ))}
      {isEdit && (
        <div className="space-y-2">
          <Label htmlFor="field-adminNotes">ملاحظات إدارية</Label>
          <Textarea
            id="field-adminNotes"
            data-testid="input-mosque-adminNotes"
            value={form.adminNotes}
            onChange={(e) => handleChange("adminNotes", e.target.value)}
            placeholder="ملاحظات إدارية خاصة..."
            rows={3}
          />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
            الجوامع ومراكز التحفيظ
          </h1>
          <p className="text-muted-foreground">إضافة وتعديل وإدارة الجوامع ومراكز تحفيظ القرآن</p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white gap-2" data-testid="button-add-mosque">
              <Plus className="w-4 h-4" />
              إضافة جامع/مركز
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-serif text-primary">إضافة جامع/مركز تحفيظ</DialogTitle>
            </DialogHeader>
            <div className="max-h-[80vh] overflow-y-auto">{renderForm(false)}</div>
            <div className="flex flex-wrap justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-add">
                إلغاء
              </Button>
              <Button onClick={handleAdd} disabled={submitting} data-testid="button-submit-add">
                {submitting ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-search-mosques"
                  placeholder="بحث بالاسم أو المحافظة أو المدينة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-44" data-testid="select-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="suspended">موقوف مؤقتاً</SelectItem>
                  <SelectItem value="permanently_closed">موقوف نهائياً</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterProvince} onValueChange={setFilterProvince}>
                <SelectTrigger className="w-full sm:w-44" data-testid="select-filter-province">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المحافظات</SelectItem>
                  {provinces.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">من تاريخ</Label>
                <Input
                  type="date"
                  data-testid="input-date-from"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
                <Input
                  type="date"
                  data-testid="input-date-to"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              {(search || filterStatus !== "all" || filterProvince !== "all" || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearch(""); setFilterStatus("all"); setFilterProvince("all"); setDateFrom(""); setDateTo(""); }}
                  data-testid="button-clear-filters"
                >
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredMosques.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-16 h-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">لا توجد جوامع أو مراكز حالياً</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">ابدأ بإضافة جامع/مركز</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMosques.map((mosque) => {
            const mosqueStats = stats[mosque.id] || { supervisors: 0, teachers: 0, students: 0 };
            const mosqueStatus = (mosque as any).status || "active";
            return (
              <Card key={mosque.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-mosque-${mosque.id}`}>
                <CardContent className="p-3 sm:p-4 md:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {mosque.image ? (
                          <img src={mosque.image} alt={mosque.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold font-serif text-base truncate" data-testid={`text-mosque-name-${mosque.id}`}>
                          {mosque.name}
                        </h3>
                        {((mosque as any).province || mosque.city) && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{[(mosque as any).province, mosque.city, (mosque as any).area].filter(Boolean).join(" - ")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`${statusColors[mosqueStatus] || statusColors.active} shrink-0`}
                      data-testid={`badge-status-${mosque.id}`}
                    >
                      {statusLabels[mosqueStatus] || "نشط"}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {(mosque as any).managerName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>المسؤول: {(mosque as any).managerName}</span>
                      </div>
                    )}
                    {mosque.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span dir="ltr" className="text-right">{mosque.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t text-xs text-muted-foreground">
                    <span data-testid={`text-supervisors-${mosque.id}`}>مشرفين: {mosqueStats.supervisors}</span>
                    <span data-testid={`text-teachers-${mosque.id}`}>أساتذة: {mosqueStats.teachers}</span>
                    <span data-testid={`text-students-${mosque.id}`}>طلاب: {mosqueStats.students}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => openEditDialog(mosque)}
                      data-testid={`button-edit-mosque-${mosque.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      تعديل
                    </Button>
                    {mosqueStatus !== "suspended" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            data-testid={`button-suspend-mosque-${mosque.id}`}
                          >
                            <PauseCircle className="w-3.5 h-3.5" />
                            إيقاف مؤقت
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>إيقاف مؤقت</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من إيقاف "{mosque.name}" مؤقتاً؟
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleStatusChange(mosque, "suspended")}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              إيقاف مؤقت
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {mosqueStatus !== "permanently_closed" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-close-mosque-${mosque.id}`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            إيقاف نهائي
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>إيقاف نهائي</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من الإيقاف النهائي لـ "{mosque.name}"؟ هذا الإجراء يعني إغلاق الجامع/المركز بشكل دائم.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleStatusChange(mosque, "permanently_closed")}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              إيقاف نهائي
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {mosqueStatus !== "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleStatusChange(mosque, "active")}
                        data-testid={`button-activate-mosque-${mosque.id}`}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        تفعيل
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-mosque-${mosque.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف "{mosque.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row-reverse gap-2">
                          <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(mosque)}
                            className="bg-red-600 hover:bg-red-700"
                            data-testid="button-confirm-delete"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditingMosque(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-primary">تعديل بيانات الجامع/المركز</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">{renderForm(true)}</div>
          <div className="flex flex-wrap justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} data-testid="button-cancel-edit">
              إلغاء
            </Button>
            <Button onClick={handleEdit} disabled={submitting} data-testid="button-submit-edit">
              {submitting ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}