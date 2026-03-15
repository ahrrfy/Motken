import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Star, Quote, Loader2, Eye, EyeOff, ArrowUpDown, MessageSquareQuote } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function TestimonialsManagePage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formText, setFormText] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formActive, setFormActive] = useState(true);
  const [formOrder, setFormOrder] = useState(0);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/admin/testimonials", { credentials: "include" });
      if (res.ok) setItems(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const resetForm = () => {
    setFormName(""); setFormRole(""); setFormText("");
    setFormRating(5); setFormActive(true); setFormOrder(0);
    setEditing(null);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setFormName(t.name); setFormRole(t.role); setFormText(t.text);
    setFormRating(t.rating); setFormActive(t.isActive); setFormOrder(t.sortOrder);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formRole.trim() || !formText.trim()) {
      toast({ title: "خطأ", description: "جميع الحقول مطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const body = { name: formName.trim(), role: formRole.trim(), text: formText.trim(), rating: formRating, isActive: formActive, sortOrder: formOrder };
      const url = editing ? `/api/admin/testimonials/${editing.id}` : "/api/admin/testimonials";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: editing ? "تم تحديث الرأي" : "تم إضافة الرأي", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetForm();
        fetchItems();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "خطأ", description: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الرأي؟")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم الحذف", className: "bg-amber-50 border-amber-200 text-amber-800" });
        fetchItems();
      }
    } catch {} finally { setDeleting(null); }
  };

  const toggleActive = async (t: Testimonial) => {
    try {
      const res = await fetch(`/api/admin/testimonials/${t.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      if (res.ok) fetchItems();
    } catch {}
  };

  const activeCount = items.filter(i => i.isActive).length;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquareQuote className="w-6 h-6 text-emerald-600" />
            آراء المستخدمين
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة الآراء المعروضة في صفحة الهبوط</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="btn-add-testimonial">
              <Plus className="w-4 h-4" />
              إضافة رأي جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل الرأي" : "إضافة رأي جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>الاسم</Label>
                <Input placeholder="مثال: أبو عبدالله" value={formName} onChange={e => setFormName(e.target.value)} data-testid="input-testimonial-name" />
              </div>
              <div>
                <Label>الدور / المكان</Label>
                <Input placeholder="مثال: مشرف حلقات — بغداد" value={formRole} onChange={e => setFormRole(e.target.value)} data-testid="input-testimonial-role" />
              </div>
              <div>
                <Label>نص الرأي</Label>
                <Textarea placeholder="اكتب رأي المستخدم هنا..." value={formText} onChange={e => setFormText(e.target.value)} className="min-h-[100px]" data-testid="input-testimonial-text" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>التقييم</Label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setFormRating(n)} data-testid={`btn-rating-${n}`}>
                        <Star className={`w-6 h-6 transition-colors ${n <= formRating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <Label>ترتيب العرض</Label>
                  <Input type="number" min={0} value={formOrder} onChange={e => setFormOrder(Number(e.target.value))} data-testid="input-testimonial-order" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>ظاهر في صفحة الهبوط</Label>
                <Switch checked={formActive} onCheckedChange={setFormActive} data-testid="switch-testimonial-active" />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={submitting} data-testid="btn-submit-testimonial">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {editing ? "حفظ التعديلات" : "إضافة الرأي"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">{items.length}</div><p className="text-xs text-muted-foreground">إجمالي الآراء</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{activeCount}</div><p className="text-xs text-muted-foreground">مفعّل</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-gray-400">{items.length - activeCount}</div><p className="text-xs text-muted-foreground">مخفي</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-amber-500">{items.length > 0 ? (items.reduce((s, i) => s + i.rating, 0) / items.length).toFixed(1) : "0"}</div><p className="text-xs text-muted-foreground">متوسط التقييم</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Quote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد آراء بعد — أضف أول رأي</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map(t => (
            <Card key={t.id} className={`relative transition-opacity ${!t.isActive ? "opacity-60" : ""}`} data-testid={`testimonial-card-${t.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`w-3.5 h-3.5 ${j < t.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {t.isActive ? (
                      <Badge variant="outline" className="text-green-600 border-green-200 text-[10px]"><Eye className="w-3 h-3 ml-1" />ظاهر</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400 border-gray-200 text-[10px]"><EyeOff className="w-3 h-3 ml-1" />مخفي</Badge>
                    )}
                    <Badge variant="outline" className="text-gray-400 text-[10px]"><ArrowUpDown className="w-3 h-3 ml-1" />{t.sortOrder}</Badge>
                  </div>
                </div>

                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.text}"</p>

                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-700 font-bold text-xs">{t.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleActive(t)} data-testid={`btn-toggle-${t.id}`}>
                      {t.isActive ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-green-600" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(t)} data-testid={`btn-edit-${t.id}`}>
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(t.id)} disabled={deleting === t.id} data-testid={`btn-delete-${t.id}`}>
                      {deleting === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
