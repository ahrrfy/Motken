import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAuth } from "@/lib/auth-context";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { Building2, Plus, Edit, Trash2, Users, MapPin, Phone, Search, PauseCircle, XCircle, PlayCircle, ImagePlus, X, CheckCircle2, ShieldCheck, UserCheck, FileText, Clock, LayoutDashboard, Download, Bell, BarChart3, AlertTriangle, ArrowUpDown, Trophy } from "lucide-react";
import type { Mosque, MosqueRegistration } from "@shared/schema";
import { exportJsonToExcel } from "@/lib/excel-utils";
import { formatDateAr } from "@/lib/utils";

interface MosqueStats {
  supervisors: number;
  teachers: number;
  students: number;
}

interface RegistrationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  vouching: number;
  direct: number;
}

const iraqProvinces = [
  "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "كربلاء", "كركوك", "الأنبار", "ديالى", "المثنى", "القادسية", "ميسان", "واسط", "صلاح الدين", "دهوك", "السليمانية", "بابل", "ذي قار"
];

const emptyForm = { name: "", province: "", city: "", area: "", landmark: "", address: "", phone: "", managerName: "", description: "", adminNotes: "", image: "" };

const emptyVouchForm = {
  mosqueName: "",
  province: "",
  city: "",
  area: "",
  landmark: "",
  mosquePhone: "",
  applicantName: "",
  applicantPhone: "",
  requestedUsername: "",
  requestedPassword: "",
  confirmPassword: "",
  voucherRelationship: "",
  vouchReason: ""
};

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

const regStatusLabels: Record<string, string> = {
  pending: "معلّق",
  approved: "مقبول",
  rejected: "مرفوض",
};

const regStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export default function MosquesPage() {
  const { toast } = useToast();
  const { effectiveRole } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = effectiveRole === "admin";
  const isSupervisor = effectiveRole === "supervisor";

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
  const [sortBy, setSortBy] = useState("name");
  const [minStudents, setMinStudents] = useState("");
  const [maxStudents, setMaxStudents] = useState("");
  const [filterInactive, setFilterInactive] = useState(false);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  const [inactiveMosqueIds, setInactiveMosqueIds] = useState<Set<string>>(new Set());
  const [inactivityData, setInactivityData] = useState<any[]>([]);
  const [comparativeStats, setComparativeStats] = useState<any>(null);

  // Admin Registration Management State
  const [registrations, setRegistrations] = useState<MosqueRegistration[]>([]);
  const [regStats, setRegStats] = useState<RegistrationStats | null>(null);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [rejectingRegId, setRejectingRegId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Supervisor Vouching State
  const [vouchOpen, setVouchOpen] = useState(false);
  const [vouchForm, setVouchForm] = useState(emptyVouchForm);
  const [myVouchings, setMyVouchings] = useState<MosqueRegistration[]>([]);

  const fetchMosques = useCallback(async () => {
    try {
      const data = await apiGet("/api/mosques");
      setMosques(data);
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الجوامع والمراكز", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchRegistrations = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [regs, stats] = await Promise.all([
        apiGet("/api/mosque-registrations"),
        apiGet("/api/registration-stats")
      ]);
      setRegistrations(regs);
      setRegStats(stats);
    } catch (error) {
      console.error("Failed to fetch registrations", error);
    }
  }, [isAdmin]);

  const fetchMyVouchings = useCallback(async () => {
    if (!isSupervisor) return;
    try {
      const data = await apiGet("/api/my-vouchings");
      setMyVouchings(data);
    } catch (error) {
      console.error("Failed to fetch my vouchings", error);
    }
  }, [isSupervisor]);

  const fetchStats = useCallback(async (mosqueId: string) => {
    try {
      const users = await apiGet(`/api/users?mosqueId=${mosqueId}`);
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

  const fetchInactivity = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await apiGet("/api/mosques/inactivity-check");
      setInactivityData(data.inactiveMosques || []);
      setInactiveMosqueIds(new Set((data.inactiveMosques || []).map((m: any) => m.id)));
    } catch {}
  }, [isAdmin]);

  const fetchComparativeStats = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await apiGet("/api/mosques/comparative-stats");
      setComparativeStats(data);
    } catch {}
  }, [isAdmin]);

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast({ title: "خطأ", description: "يرجى ملء العنوان والرسالة", variant: "destructive" });
      return;
    }
    setBroadcastSending(true);
    try {
      const res = await apiPost("/api/mosques/broadcast-notification", {
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
      });
      const data = await res.json();
      toast({ title: "تم بنجاح", description: data.message || "تم إرسال الإشعار" });
      setBroadcastOpen(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch {
      toast({ title: "خطأ", description: "فشل في إرسال الإشعار الجماعي", variant: "destructive" });
    } finally {
      setBroadcastSending(false);
    }
  };

  useEffect(() => {
    fetchMosques();
    if (isAdmin) {
      fetchRegistrations();
      fetchInactivity();
      fetchComparativeStats();
    }
    if (isSupervisor) fetchMyVouchings();
  }, [fetchMosques, fetchRegistrations, fetchMyVouchings, fetchInactivity, fetchComparativeStats, isAdmin, isSupervisor]);

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
      const res = await apiPost("/api/mosques", addData);
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
      const res = await apiPatch(`/api/mosques/${editingMosque.id}`, form);
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
      const res = await apiPatch(`/api/mosques/${mosque.id}`, { status: newStatus });
      if (!res.ok) throw new Error();
      const statusMsg = newStatus === "suspended" ? "تم إيقاف الجامع مؤقتاً" : newStatus === "permanently_closed" ? "تم إيقاف الجامع نهائياً" : "تم تفعيل الجامع";
      toast({ title: "تم بنجاح", description: statusMsg });
      fetchMosques();
    } catch {
      toast({ title: "خطأ", description: "فشل في تغيير حالة الجامع", variant: "destructive" });
    }
  };

  // Admin Registration Actions
  const handleApproveRegistration = async (id: string) => {
    try {
      const res = await apiPatch(`/api/mosque-registrations/${id}/approve`, {});
      if (!res.ok) throw new Error();
      toast({ title: "تم بنجاح", description: "تم قبول الطلب وإنشاء الجامع بنجاح" });
      fetchRegistrations();
      fetchMosques();
    } catch {
      toast({ title: "خطأ", description: "فشل في قبول الطلب", variant: "destructive" });
    }
  };

  const handleRejectRegistration = async () => {
    if (!rejectingRegId || !rejectionReason.trim()) return;
    try {
      const res = await apiPatch(`/api/mosque-registrations/${rejectingRegId}/reject`, { rejectionReason });
      if (!res.ok) throw new Error();
      toast({ title: "تم بنجاح", description: "تم رفض الطلب بنجاح" });
      setRejectionOpen(false);
      setRejectingRegId(null);
      setRejectionReason("");
      fetchRegistrations();
    } catch {
      toast({ title: "خطأ", description: "فشل في رفض الطلب", variant: "destructive" });
    }
  };

  // Supervisor Vouching Actions
  const handleVouchSubmit = async () => {
    if (!vouchForm.mosqueName || !vouchForm.applicantName || !vouchForm.applicantPhone || !vouchForm.requestedUsername || !vouchForm.requestedPassword) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (vouchForm.requestedPassword !== vouchForm.confirmPassword) {
      toast({ title: "خطأ", description: "كلمات المرور غير متطابقة", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost("/api/vouch-mosque", vouchForm);
      if (!res.ok) throw new Error();
      toast({ title: "تم بنجاح", description: "تم إرسال طلب التزكية بنجاح" });
      setVouchOpen(false);
      setVouchForm(emptyVouchForm);
      fetchMyVouchings();
    } catch {
      toast({ title: "خطأ", description: "فشل في إرسال طلب التزكية", variant: "destructive" });
    } finally {
      setSubmitting(false);
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
        const isPng = file.type === "image/png";
        if (!isPng) {
          // Fill white background only for non-transparent formats
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        let base64: string;
        if (isPng) {
          base64 = canvas.toDataURL("image/png");
        } else {
          let quality = 0.8;
          base64 = canvas.toDataURL("image/jpeg", quality);
          while (base64.length > 500 * 1024 * 1.37 && quality > 0.1) {
            quality -= 0.1;
            base64 = canvas.toDataURL("image/jpeg", quality);
          }
        }
        if (base64.length > 800 * 1024 * 1.37) {
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
    const mosqueStats = stats[m.id] || { students: 0, teachers: 0, supervisors: 0 };
    const matchesMinStudents = !minStudents || mosqueStats.students >= parseInt(minStudents);
    const matchesMaxStudents = !maxStudents || mosqueStats.students <= parseInt(maxStudents);
    const matchesInactive = !filterInactive || inactiveMosqueIds.has(m.id);
    return matchesSearch && matchesStatus && matchesProvince && matchesDate && matchesMinStudents && matchesMaxStudents && matchesInactive;
  }).sort((a, b) => {
    const sa = stats[a.id] || { students: 0, teachers: 0, supervisors: 0 };
    const sb = stats[b.id] || { students: 0, teachers: 0, supervisors: 0 };
    if (sortBy === "students_desc") return sb.students - sa.students;
    if (sortBy === "students_asc") return sa.students - sb.students;
    if (sortBy === "date_desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "date_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return a.name.localeCompare(b.name, "ar");
  });

  const handleExport = async () => {
    try {
      const exportData = filteredMosques.map((m) => {
        const mosqueStats = stats[m.id] || { students: 0, teachers: 0, supervisors: 0 };
        return {
          "اسم الجامع/المركز": m.name,
          "المحافظة": (m as any).province || "",
          "المدينة": m.city || "",
          "عدد الطلاب": mosqueStats.students,
          "عدد المعلمين": mosqueStats.teachers,
          "الحالة": statusLabels[(m as any).status] || (m as any).status,
          "تاريخ الإنشاء": formatDateAr(m.createdAt),
        };
      });

      await exportJsonToExcel(
        exportData as any,
        "الجوامع والمراكز",
        `mosques_${new Date().toISOString().split('T')[0]}.xlsx`
      );
      toast({ title: "تم بنجاح", description: "تم تصدير البيانات بنجاح" });
    } catch (error) {
      console.error("Export failed", error);
      toast({ title: "خطأ", description: "فشل في تصدير البيانات", variant: "destructive" });
    }
  };

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
          {f.key === "province" ? (
            <Select value={form.province} onValueChange={(v) => handleChange("province", v)}>
              <SelectTrigger id="field-province" data-testid="select-mosque-province">
                <SelectValue placeholder="اختر المحافظة" />
              </SelectTrigger>
              <SelectContent>
                {iraqProvinces.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`field-${f.key}`}
              data-testid={`input-mosque-${f.key}`}
              value={form[f.key as keyof typeof form]}
              onChange={(e) => handleChange(f.key, e.target.value)}
              placeholder={f.label}
            />
          )}
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

  const renderRegistrationRequests = () => (
    <div className="space-y-6">
      {regStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "الإجمالي", value: regStats.total, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "قيد الانتظار", value: regStats.pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "مقبول", value: regStats.approved, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
            { label: "مرفوض", value: regStats.rejected, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
            { label: "عن طريق تزكية", value: regStats.vouching, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "تسجيل مباشر", value: regStats.direct, icon: UserCheck, color: "text-indigo-600", bg: "bg-indigo-50" },
          ].map((s, i) => (
            <Card key={i} className="border-none shadow-sm overflow-hidden">
              <CardContent className={`${s.bg} p-3 flex flex-col items-center text-center gap-1`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {registrations.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground">لا توجد طلبات انضمام حالياً</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {registrations.map((reg) => (
            <Card key={reg.id} className="overflow-hidden" data-testid={`card-registration-${reg.id}`}>
              <CardHeader className="p-4 bg-muted/30 pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-base font-serif text-primary">{reg.mosqueName}</CardTitle>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      {reg.province} - {reg.city} - {reg.area}
                    </div>
                  </div>
                  <Badge variant="outline" className={regStatusColors[reg.status]}>
                    {regStatusLabels[reg.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-muted-foreground">مقدم الطلب:</div>
                  <div className="font-medium text-left">{reg.applicantName}</div>
                  <div className="text-muted-foreground">رقم الهاتف:</div>
                  <div className="font-medium text-left" dir="ltr">{reg.applicantPhone}</div>
                  <div className="text-muted-foreground">نوع التسجيل:</div>
                  <div className="text-left">
                    <Badge variant="secondary" className={reg.registrationType === 'vouching' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                      {reg.registrationType === 'vouching' ? 'تزكية' : 'تسجيل مباشر'}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">تاريخ الطلب:</div>
                  <div className="font-medium text-left">{formatDateAr(reg.createdAt)}</div>
                </div>

                {reg.registrationType === 'vouching' && (
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      تمت التزكية بواسطة:
                    </div>
                    <div className="text-emerald-700 pr-5">
                      {(reg as any).voucherName} ({(reg as any).voucherMosqueName})
                    </div>
                    <div className="text-emerald-600 italic pr-5">
                      العلاقة: {reg.voucherRelationship}
                    </div>
                    <div className="text-emerald-600 pr-5 mt-1 border-t border-emerald-100/50 pt-1">
                      {reg.vouchReason}
                    </div>
                  </div>
                )}

                {reg.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      size="sm"
                      onClick={() => handleApproveRegistration(reg.id)}
                      data-testid={`button-approve-reg-${reg.id}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      موافقة
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                      size="sm"
                      onClick={() => { setRejectingRegId(reg.id); setRejectionOpen(true); }}
                      data-testid={`button-reject-reg-${reg.id}`}
                    >
                      <XCircle className="w-4 h-4" />
                      رفض
                    </Button>
                  </div>
                )}
                {reg.status === 'rejected' && reg.rejectionReason && (
                  <div className="bg-red-50 p-2 rounded text-xs text-red-700 border border-red-100">
                    سبب الرفض: {reg.rejectionReason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderSupervisorVouching = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-primary">تزكياتي السابقة</h2>
        <Button onClick={() => setVouchOpen(true)} className="gap-2" data-testid="button-open-vouch">
          <ShieldCheck className="w-4 h-4" />
          تزكية مسجد/مركز جديد
        </Button>
      </div>

      {myVouchings.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground">لم تقم بإرسال أي تزكيات بعد</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myVouchings.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-primary">{v.mosqueName}</h3>
                    <p className="text-xs text-muted-foreground">{v.province} - {v.city}</p>
                  </div>
                  <Badge variant="outline" className={regStatusColors[v.status]}>
                    {regStatusLabels[v.status]}
                  </Badge>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">مقدم الطلب:</span>
                    <span>{v.applicantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التاريخ:</span>
                    <span>{formatDateAr(v.createdAt)}</span>
                  </div>
                </div>
                {v.status === 'rejected' && v.rejectionReason && (
                  <div className="bg-red-50 p-2 rounded text-xs text-red-700">
                    سبب الرفض: {v.rejectionReason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={vouchOpen} onOpenChange={setVouchOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-primary text-xl flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              تزكية جامع أو مركز تحفيظ جديد
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-bold text-sm border-b pb-1 text-primary">بيانات المسجد</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الجامع/المركز <span className="text-red-500">*</span></Label>
                  <Input
                    data-testid="input-vouch-mosqueName"
                    value={vouchForm.mosqueName}
                    onChange={(e) => setVouchForm({ ...vouchForm, mosqueName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المحافظة <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    options={iraqProvinces.map(p => ({ value: p, label: p }))}
                    value={vouchForm.province}
                    onValueChange={(v) => setVouchForm({ ...vouchForm, province: v })}
                    placeholder="اختر المحافظة"
                    searchPlaceholder="ابحث عن محافظة..."
                    emptyText="لا توجد محافظة بهذا الاسم"
                    data-testid="select-vouch-province"
                  />
                </div>
                <div className="space-y-2">
                  <Label>المدينة/القضاء <span className="text-red-500">*</span></Label>
                  <Input
                    data-testid="input-vouch-city"
                    value={vouchForm.city}
                    onChange={(e) => setVouchForm({ ...vouchForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المنطقة/الحي <span className="text-red-500">*</span></Label>
                  <Input
                    data-testid="input-vouch-area"
                    value={vouchForm.area}
                    onChange={(e) => setVouchForm({ ...vouchForm, area: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>أقرب نقطة دالة</Label>
                  <Input
                    data-testid="input-vouch-landmark"
                    value={vouchForm.landmark}
                    onChange={(e) => setVouchForm({ ...vouchForm, landmark: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>هاتف المسجد (اختياري)</Label>
                  <Input
                    data-testid="input-vouch-mosquePhone"
                    value={vouchForm.mosquePhone}
                    onChange={(e) => setVouchForm({ ...vouchForm, mosquePhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-sm border-b pb-1 text-primary">بيانات مقدم الطلب (المسؤول)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل <span className="text-red-500">*</span></Label>
                  <Input
                    data-testid="input-vouch-applicantName"
                    value={vouchForm.applicantName}
                    onChange={(e) => setVouchForm({ ...vouchForm, applicantName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف <span className="text-red-500">*</span></Label>
                  <Input
                    data-testid="input-vouch-applicantPhone"
                    dir="ltr"
                    value={vouchForm.applicantPhone}
                    onChange={(e) => setVouchForm({ ...vouchForm, applicantPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم المستخدم المطلوب <span className="text-red-500">*</span></Label>
                  <Input
                    data-testid="input-vouch-requestedUsername"
                    value={vouchForm.requestedUsername}
                    onChange={(e) => setVouchForm({ ...vouchForm, requestedUsername: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور <span className="text-red-500">*</span></Label>
                  <Input
                    data-testid="input-vouch-requestedPassword"
                    type="password"
                    value={vouchForm.requestedPassword}
                    onChange={(e) => setVouchForm({ ...vouchForm, requestedPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>تأكيد كلمة المرور <span className="text-red-500">*</span></Label>
                  <Input
                    data-testid="input-vouch-confirmPassword"
                    type="password"
                    value={vouchForm.confirmPassword}
                    onChange={(e) => setVouchForm({ ...vouchForm, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-sm border-b pb-1 text-primary">بيانات التزكية</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>علاقتك بالمسؤول <span className="text-red-500">*</span></Label>
                  <Select value={vouchForm.voucherRelationship} onValueChange={(v) => setVouchForm({ ...vouchForm, voucherRelationship: v })}>
                    <SelectTrigger data-testid="select-vouch-relationship">
                      <SelectValue placeholder="اختر نوع العلاقة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="جار">جار</SelectItem>
                      <SelectItem value="صديق">صديق</SelectItem>
                      <SelectItem value="نفس المنطقة">نفس المنطقة</SelectItem>
                      <SelectItem value="قريب">قريب</SelectItem>
                      <SelectItem value="أخرى">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>سبب التزكية <span className="text-red-500">*</span></Label>
                  <Textarea
                    data-testid="input-vouch-reason"
                    placeholder="لماذا تزكي هذا المسجد ومسؤوله؟"
                    value={vouchForm.vouchReason}
                    onChange={(e) => setVouchForm({ ...vouchForm, vouchReason: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVouchOpen(false)} data-testid="button-cancel-vouch">إلغاء</Button>
            <Button onClick={handleVouchSubmit} disabled={submitting} data-testid="button-submit-vouch">
              {submitting ? "جاري الإرسال..." : "إرسال التزكية"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-mosques">
            الجوامع ومراكز التحفيظ
          </h1>
          <p className="text-muted-foreground">إدارة الجوامع ومراكز تحفيظ القرآن وطلبات الانضمام</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => setBroadcastOpen(true)} data-testid="button-broadcast-notification">
              <Bell className="w-4 h-4" />
              إشعار جماعي
            </Button>
            <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white gap-2" data-testid="button-add-mosque">
                <Plus className="w-4 h-4" />
                إضافة جامع/مركز مباشر
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
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50">
          <TabsTrigger value="all" className="gap-2 py-2" data-testid="tab-all-mosques">
            <Building2 className="w-4 h-4" />
            الجوامع الحالية
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="stats" className="gap-2 py-2" data-testid="tab-comparative-stats">
              <BarChart3 className="w-4 h-4" />
              إحصائيات مقارنة
            </TabsTrigger>
          )}
          {isAdmin && inactivityData.length > 0 && (
            <TabsTrigger value="inactive" className="gap-2 py-2" data-testid="tab-inactive-mosques">
              <AlertTriangle className="w-4 h-4" />
              غير نشطة
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px]">
                {inactivityData.length}
              </Badge>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="registrations" className="gap-2 py-2" data-testid="tab-registrations">
              <FileText className="w-4 h-4" />
              طلبات الانضمام
              {regStats && regStats.pending > 0 && (
                <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] animate-pulse">
                  {regStats.pending}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {isSupervisor && (
            <TabsTrigger value="my-vouchings" className="gap-2 py-2" data-testid="tab-my-vouchings">
              <ShieldCheck className="w-4 h-4" />
              تزكياتي
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="space-y-6 pt-4">
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
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-44" data-testid="select-sort-by">
                      <ArrowUpDown className="w-3.5 h-3.5 ml-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">ترتيب بالاسم</SelectItem>
                      <SelectItem value="date_desc">الأحدث أولاً</SelectItem>
                      <SelectItem value="date_asc">الأقدم أولاً</SelectItem>
                      <SelectItem value="students_desc">الأكثر طلاباً</SelectItem>
                      <SelectItem value="students_asc">الأقل طلاباً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">الحد الأدنى للطلاب</Label>
                    <Input
                      type="number"
                      min="0"
                      data-testid="input-min-students"
                      value={minStudents}
                      onChange={(e) => setMinStudents(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">الحد الأقصى للطلاب</Label>
                    <Input
                      type="number"
                      min="0"
                      data-testid="input-max-students"
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(e.target.value)}
                      placeholder="999"
                    />
                  </div>
                  {isAdmin && inactivityData.length > 0 && (
                    <Button
                      variant={filterInactive ? "default" : "outline"}
                      size="sm"
                      className={`gap-1 shrink-0 ${filterInactive ? "" : "text-amber-600 border-amber-300"}`}
                      onClick={() => setFilterInactive(!filterInactive)}
                      data-testid="button-filter-inactive"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      غير نشطة ({inactivityData.length})
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="gap-2 shrink-0"
                      onClick={handleExport}
                      data-testid="button-export-mosques"
                    >
                      <Download className="w-4 h-4" />
                      تصدير Excel
                    </Button>
                    {(search || filterStatus !== "all" || filterProvince !== "all" || dateFrom || dateTo || sortBy !== "name" || minStudents || maxStudents || filterInactive) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSearch(""); setFilterStatus("all"); setFilterProvince("all"); setDateFrom(""); setDateTo(""); setSortBy("name"); setMinStudents(""); setMaxStudents(""); setFilterInactive(false); }}
                        data-testid="button-clear-filters"
                      >
                        مسح الفلاتر
                      </Button>
                    )}
                  </div>
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
                        {inactiveMosqueIds.has(mosque.id) && (
                          <span className="flex items-center gap-1 text-amber-600 font-medium" data-testid={`badge-inactive-${mosque.id}`}>
                            <AlertTriangle className="w-3 h-3" />
                            غير نشط
                          </span>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={() => navigate(`/mosques/${mosque.id}/dashboard`)}
                            data-testid={`button-dashboard-mosque-${mosque.id}`}
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            لوحة التحكم
                          </Button>
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
                                  <AlertDialogTitle>إيقاف مؤقت للجامع</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم إيقاف حسابات المعلمين والطلاب التابعين لهذا الجامع مؤقتاً. هل أنت متأكد؟
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleStatusChange(mosque, "suspended")} className="bg-orange-600 hover:bg-orange-700">تأكيد الإيقاف</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {mosqueStatus === "suspended" && (
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
                                <AlertDialogTitle>حذف الجامع نهائياً</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف هذا الجامع؟ هذا الإجراء لا يمكن التراجع عنه وسيؤدي لحذف كافة البيانات المرتبطة.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(mosque)} className="bg-red-600 hover:bg-red-700">تأكيد الحذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="stats" className="pt-4 space-y-6">
            {comparativeStats ? (
              <>
                {[
                  { title: "الأكثر طلاباً", data: comparativeStats.topByStudents, valueKey: "studentsCount", valueLabel: "طالب", icon: Users, color: "text-blue-600" },
                  { title: "أعلى نسبة حضور", data: comparativeStats.topByAttendance, valueKey: "attendanceRate", valueLabel: "%", icon: BarChart3, color: "text-teal-600" },
                  { title: "الأكثر نشاطاً", data: comparativeStats.topByActivity, valueKey: "lastActivity", valueLabel: "", icon: Trophy, color: "text-amber-600" },
                ].map((section, si) => (
                  <Card key={si}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <section.icon className={`w-5 h-5 ${section.color}`} />
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(!section.data || section.data.length === 0) ? (
                        <div className="text-center text-muted-foreground py-6">لا توجد بيانات</div>
                      ) : (
                        <div className="space-y-2">
                          {section.data.map((m: any, i: number) => (
                            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`ranking-${section.valueKey}-${m.id}`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                                i === 0 ? "bg-amber-100 text-amber-700" :
                                i === 1 ? "bg-gray-200 text-gray-700" :
                                i === 2 ? "bg-orange-100 text-orange-700" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {i + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">{m.name}</div>
                                <div className="text-xs text-muted-foreground">{m.province}</div>
                              </div>
                              <div className={`font-bold ${section.color}`}>
                                {section.valueKey === "lastActivity"
                                  ? (m.lastActivity ? formatDateAr(m.lastActivity) : "—")
                                  : `${m[section.valueKey]}${section.valueLabel}`
                                }
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/mosques/${m.id}/dashboard`)} data-testid={`button-dashboard-ranking-${m.id}`}>
                                <LayoutDashboard className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-12">جاري تحميل الإحصائيات...</div>
            )}
          </TabsContent>
        )}

        {isAdmin && inactivityData.length > 0 && (
          <TabsContent value="inactive" className="pt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  جوامع/مراكز غير نشطة ({inactivityData.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inactivityData.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/50 border border-amber-100" data-testid={`inactive-mosque-${m.id}`}>
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.province}</div>
                      </div>
                      <div className="text-sm text-amber-700 font-medium">
                        {m.daysSinceActivity !== null ? `${m.daysSinceActivity} يوم` : "لا نشاط مطلقاً"}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/mosques/${m.id}/dashboard`)} className="gap-1" data-testid={`button-inactive-dashboard-${m.id}`}>
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        لوحة التحكم
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="registrations" className="pt-4">
            {renderRegistrationRequests()}
          </TabsContent>
        )}

        {isSupervisor && (
          <TabsContent value="my-vouchings" className="pt-4">
            {renderSupervisorVouching()}
          </TabsContent>
        )}
      </Tabs>

      {/* Broadcast Notification Dialog */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" />
              إشعار جماعي لكل المشرفين
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>عنوان الإشعار</Label>
              <Input
                data-testid="input-broadcast-title"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="عنوان الإشعار..."
              />
            </div>
            <div className="space-y-2">
              <Label>نص الإشعار</Label>
              <Textarea
                data-testid="input-broadcast-message"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="اكتب نص الإشعار الذي سيصل لجميع المشرفين..."
                rows={4}
              />
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm text-amber-700">
              سيتم إرسال هذا الإشعار إلى جميع المشرفين النشطين في كل الجوامع والمراكز
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBroadcastOpen(false)} data-testid="button-cancel-broadcast">إلغاء</Button>
            <Button onClick={handleBroadcast} disabled={broadcastSending} className="bg-amber-600 hover:bg-amber-700" data-testid="button-send-broadcast">
              {broadcastSending ? "جاري الإرسال..." : "إرسال الإشعار"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mosque Dialog */}
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

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectionOpen} onOpenChange={setRejectionOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض طلب الانضمام</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>سبب الرفض</Label>
              <Textarea
                placeholder="يرجى كتابة سبب الرفض ليظهر للمتقدم..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                data-testid="input-rejection-reason"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectionOpen(false)} data-testid="button-cancel-reject">إلغاء</Button>
            <Button variant="destructive" onClick={handleRejectRegistration} data-testid="button-confirm-reject">تأكيد الرفض</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
