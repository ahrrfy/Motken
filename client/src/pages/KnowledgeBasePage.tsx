import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2, Plus, BookOpen, Edit, Trash2, Search, ChevronDown, ChevronUp
} from "lucide-react";

interface TajweedRule {
  id: string;
  category: string;
  title: string;
  description: string;
  examples: string | null;
  surahReference: string | null;
  sortOrder: number;
  createdAt: string;
}

const categories = [
  { value: "idgham", label: "الإدغام", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "ikhfaa", label: "الإخفاء", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "iqlab", label: "الإقلاب", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "madd", label: "المد", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "qalqalah", label: "القلقلة", color: "bg-red-100 text-red-800 border-red-200" },
  { value: "waqf", label: "الوقف والابتداء", color: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "noon_sakinah", label: "أحكام النون الساكنة والتنوين", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { value: "meem_sakinah", label: "أحكام الميم الساكنة", color: "bg-pink-100 text-pink-800 border-pink-200" },
];

const getCategoryInfo = (value: string) => categories.find(c => c.value === value) || { value, label: value, color: "bg-gray-100 text-gray-800 border-gray-200" };

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rules, setRules] = useState<TajweedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categories.map(c => c.value)));

  const [formCategory, setFormCategory] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formExamples, setFormExamples] = useState("");
  const [formSurahRef, setFormSurahRef] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [editingRule, setEditingRule] = useState<TajweedRule | null>(null);

  const canManage = user?.role === "admin" || user?.role === "supervisor";

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/tajweed-rules", { credentials: "include" });
      if (res.ok) setRules(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل أحكام التجويد", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const resetForm = () => {
    setFormCategory("");
    setFormTitle("");
    setFormDescription("");
    setFormExamples("");
    setFormSurahRef("");
    setFormSortOrder("0");
    setEditingRule(null);
  };

  const handleCreate = async () => {
    if (!formCategory || !formTitle || !formDescription) {
      toast({ title: "خطأ", description: "الفئة والعنوان والوصف مطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tajweed-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: formCategory,
          title: formTitle,
          description: formDescription,
          examples: formExamples || null,
          surahReference: formSurahRef || null,
          sortOrder: parseInt(formSortOrder) || 0,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إضافة القاعدة", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetForm();
        fetchRules();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة القاعدة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingRule || !formCategory || !formTitle || !formDescription) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tajweed-rules/${editingRule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: formCategory,
          title: formTitle,
          description: formDescription,
          examples: formExamples || null,
          surahReference: formSurahRef || null,
          sortOrder: parseInt(formSortOrder) || 0,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم تعديل القاعدة", className: "bg-green-50 border-green-200 text-green-800" });
        setEditDialogOpen(false);
        resetForm();
        fetchRules();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في تعديل القاعدة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tajweed-rules/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف القاعدة", className: "bg-green-50 border-green-200 text-green-800" });
        fetchRules();
      } else {
        toast({ title: "خطأ", description: "فشل في حذف القاعدة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const openEditDialog = (rule: TajweedRule) => {
    setEditingRule(rule);
    setFormCategory(rule.category);
    setFormTitle(rule.title);
    setFormDescription(rule.description);
    setFormExamples(rule.examples || "");
    setFormSurahRef(rule.surahReference || "");
    setFormSortOrder(String(rule.sortOrder));
    setEditDialogOpen(true);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const filteredRules = rules
    .filter(r => filterCategory === "all" || r.category === filterCategory)
    .filter(r => !searchQuery || r.title.includes(searchQuery) || r.description.includes(searchQuery));

  const groupedRules: Record<string, TajweedRule[]> = {};
  filteredRules.forEach(r => {
    if (!groupedRules[r.category]) groupedRules[r.category] = [];
    groupedRules[r.category].push(r);
  });
  Object.values(groupedRules).forEach(arr => arr.sort((a, b) => a.sortOrder - b.sortOrder));

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>الفئة *</Label>
        <Select value={formCategory} onValueChange={setFormCategory}>
          <SelectTrigger data-testid={isEdit ? "select-edit-category" : "select-category"}>
            <SelectValue placeholder="اختر الفئة" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>العنوان *</Label>
        <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} data-testid={isEdit ? "input-edit-title" : "input-title"} />
      </div>
      <div className="space-y-2">
        <Label>الوصف *</Label>
        <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} data-testid={isEdit ? "input-edit-description" : "input-description"} />
      </div>
      <div className="space-y-2">
        <Label>الأمثلة</Label>
        <Textarea value={formExamples} onChange={e => setFormExamples(e.target.value)} rows={2} placeholder="مثال: من يعمل - إدغام بغنة" data-testid={isEdit ? "input-edit-examples" : "input-examples"} />
      </div>
      <div className="space-y-2">
        <Label>مرجع السورة</Label>
        <Input value={formSurahRef} onChange={e => setFormSurahRef(e.target.value)} placeholder="سورة البقرة - آية 10" data-testid={isEdit ? "input-edit-surah-ref" : "input-surah-ref"} />
      </div>
      <div className="space-y-2">
        <Label>الترتيب</Label>
        <Input type="number" value={formSortOrder} onChange={e => setFormSortOrder(e.target.value)} data-testid={isEdit ? "input-edit-sort-order" : "input-sort-order"} />
      </div>
      <Button
        onClick={isEdit ? handleEdit : handleCreate}
        disabled={!formCategory || !formTitle || !formDescription || submitting}
        className="w-full"
        data-testid={isEdit ? "button-confirm-edit" : "button-confirm-create"}
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
        {isEdit ? "حفظ التعديلات" : "إضافة القاعدة"}
      </Button>
    </div>
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
            موسوعة التجويد
          </h1>
          <p className="text-muted-foreground">أحكام التجويد والقواعد القرآنية</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-rule">
                <Plus className="w-4 h-4 ml-1" />
                إضافة قاعدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة قاعدة تجويد جديدة</DialogTitle>
              </DialogHeader>
              {renderForm(false)}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث في القواعد..."
            className="pr-10"
            data-testid="input-search-rules"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-56" data-testid="select-filter-category">
            <SelectValue placeholder="جميع الفئات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفئات</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12" data-testid="status-loading">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
        </div>
      ) : Object.keys(groupedRules).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-no-rules">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا توجد قواعد تجويد بعد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.filter(c => groupedRules[c.value]).map(cat => {
            const catRules = groupedRules[cat.value];
            const isExpanded = expandedCategories.has(cat.value);
            return (
              <Card key={cat.value} className="shadow-md" data-testid={`card-category-${cat.value}`}>
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleCategory(cat.value)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={cat.color} data-testid={`badge-category-${cat.value}`}>
                        {cat.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">({catRules.length} قاعدة)</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {catRules.map(rule => (
                        <Card key={rule.id} className="border" data-testid={`card-rule-${rule.id}`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base">{rule.title}</CardTitle>
                              {canManage && (
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => openEditDialog(rule)} data-testid={`button-edit-rule-${rule.id}`}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => handleDelete(rule.id)}
                                    disabled={deletingId === rule.id}
                                    data-testid={`button-delete-rule-${rule.id}`}
                                  >
                                    {deletingId === rule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <p className="text-muted-foreground leading-relaxed">{rule.description}</p>
                            {rule.examples && (
                              <div className="bg-muted/50 rounded p-2">
                                <span className="font-medium">الأمثلة: </span>
                                <span>{rule.examples}</span>
                              </div>
                            )}
                            {rule.surahReference && (
                              <div className="text-primary text-xs">
                                <BookOpen className="w-3 h-3 inline ml-1" />
                                {rule.surahReference}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل قاعدة التجويد</DialogTitle>
          </DialogHeader>
          {renderForm(true)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
