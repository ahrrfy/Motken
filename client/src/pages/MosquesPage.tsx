import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Building2, Plus, Edit, Trash2, Users, MapPin, Phone } from "lucide-react";
import type { Mosque } from "@shared/schema";

interface MosqueStats {
  supervisors: number;
  teachers: number;
  students: number;
}

const emptyForm = { name: "", province: "", city: "", area: "", landmark: "", address: "", phone: "", managerName: "", description: "" };

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
      // ignore
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
      const res = await fetch("/api/mosques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
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

  const renderForm = () => (
    <div className="space-y-4" dir="rtl">
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
            <div className="max-h-[80vh] overflow-y-auto">{renderForm()}</div>
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

      {mosques.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-16 h-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">لا توجد جوامع أو مراكز حالياً</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">ابدأ بإضافة جامع/مركز</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mosques.map((mosque) => {
            const mosqueStats = stats[mosque.id] || { supervisors: 0, teachers: 0, students: 0 };
            return (
              <Card key={mosque.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-mosque-${mosque.id}`}>
                <CardContent className="p-3 sm:p-4 md:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
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
                      variant={mosque.isActive ? "default" : "secondary"}
                      className={mosque.isActive ? "bg-green-100 text-green-700 hover:bg-green-200 border-none shrink-0" : "shrink-0"}
                      data-testid={`badge-status-${mosque.id}`}
                    >
                      {mosque.isActive ? "نشط" : "غير نشط"}
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

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => openEditDialog(mosque)}
                      data-testid={`button-edit-mosque-${mosque.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      تعديل
                    </Button>
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
          <div className="max-h-[80vh] overflow-y-auto">{renderForm()}</div>
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