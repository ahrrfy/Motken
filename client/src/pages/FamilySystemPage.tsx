import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";
import {
  Loader2, Plus, Users, Trash2, Search, Phone, UserCheck, Baby, MessageCircle, BarChart3, KeyRound, UserPlus, Copy, RefreshCcw, Eye, EyeOff
} from "lucide-react";

interface FamilyLink {
  id: string;
  parentPhone: string;
  studentId: string;
  studentName?: string;
  relationship: string;
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
}

interface FamilyDashboard {
  children: {
    studentId: string;
    studentName: string;
    relationship: string;
    attendance?: number;
    points?: number;
    assignments?: number;
  }[];
}

const relationshipMap: Record<string, string> = {
  parent: "ولي أمر",
  guardian: "وصي",
  sibling: "أخ/أخت",
};

export default function FamilySystemPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [parentPhone, setParentPhone] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [relationship, setRelationship] = useState("parent");

  const [searchPhone, setSearchPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [dashboard, setDashboard] = useState<FamilyDashboard | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [generatingParents, setGeneratingParents] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<any[]>([]);
  const [parentCredentials, setParentCredentials] = useState<{ parentName: string; username: string; password: string; phone: string; childrenNames: string[] }[]>(() => {
    try {
      const saved = sessionStorage.getItem("parentCredentials");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showCredentials, setShowCredentials] = useState(() => {
    try { return !!sessionStorage.getItem("parentCredentials"); } catch { return false; }
  });
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ username: string; password: string } | null>(null);

  const canManage = user?.role === "admin" || user?.role === "supervisor";

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/family-links", { credentials: "include" });
      if (res.ok) setLinks(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الروابط العائلية", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchParentAccounts = async () => {
    try {
      const res = await fetch("/api/parents", { credentials: "include" });
      if (res.ok) setParentAccounts(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchLinks();
    if (canManage) fetchParentAccounts();
    fetch("/api/users?role=student", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setStudents(data))
      .catch(() => {});
  }, []);

  const filteredLinks = searchPhone
    ? links.filter(l => l.parentPhone.includes(searchPhone))
    : links;

  const uniqueFamilies = new Set(links.map(l => l.parentPhone)).size;
  const totalChildren = links.length;
  const activeFamilies = new Set(links.filter(l => l.parentPhone).map(l => l.parentPhone)).size;

  const handleCreate = async () => {
    if (!parentPhone || !selectedStudentId) {
      toast({ title: "خطأ", description: "رقم الهاتف واختيار الطالب مطلوبان", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/family-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ parentPhone, studentId: selectedStudentId, relationship }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء الرابط العائلي", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        setParentPhone("");
        setSelectedStudentId("");
        setRelationship("parent");
        fetchLinks();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الرابط", variant: "destructive" });
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
      const res = await fetch(`/api/family-links/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف الرابط العائلي", className: "bg-green-50 border-green-200 text-green-800" });
        fetchLinks();
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الرابط", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchDashboard = async () => {
    if (!searchPhone) return;
    setSearching(true);
    setDashboard(null);
    try {
      const res = await fetch(`/api/family-dashboard/${searchPhone}`, { credentials: "include" });
      if (res.ok) {
        setDashboard(await res.json());
      } else {
        toast({ title: "خطأ", description: "لم يتم العثور على بيانات لهذا الرقم", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleBulkGenerateParents = async () => {
    setGeneratingParents(true);
    setParentCredentials([]);
    try {
      const res = await fetch("/api/parents/generate", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const creds = data.created || [];
        setParentCredentials(creds);
        setShowCredentials(true);
        try { sessionStorage.setItem("parentCredentials", JSON.stringify(creds)); } catch {}
        fetchParentAccounts();
        toast({
          title: "تم بنجاح",
          description: `تم إنشاء ${data.totalCreated || 0} حساب ولي أمر جديد`,
          className: "bg-green-50 border-green-200 text-green-800",
        });
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الحسابات", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setGeneratingParents(false);
    }
  };

  const handleResetParentPassword = async (parentId: string) => {
    setResettingId(parentId);
    setResetResult(null);
    try {
      const res = await fetch(`/api/parents/${parentId}/reset-password`, {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setResetResult({ username: data.username, password: data.password });
        toast({
          title: "تم بنجاح",
          description: "تم إعادة تعيين كلمة المرور",
          className: "bg-green-50 border-green-200 text-green-800",
        });
      } else {
        toast({ title: "خطأ", description: "فشل في إعادة تعيين كلمة المرور", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setResettingId(null);
    }
  };

  const handleDeleteParent = async (parentId: string) => {
    try {
      const res = await fetch(`/api/parents/${parentId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف حساب ولي الأمر", className: "bg-green-50 border-green-200 text-green-800" });
        fetchParentAccounts();
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الحساب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    }
  };

  const copyCredentials = () => {
    const text = parentCredentials.map(c =>
      `الاسم: ${c.parentName}\nالمستخدم: ${c.username}\nكلمة المرور: ${c.password}\nرقم الهاتف: ${c.phone}\nالأبناء: ${c.childrenNames.join("، ")}\n---`
    ).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ بيانات الحسابات", className: "bg-green-50 border-green-200 text-green-800" });
  };

  const getStudentName = (studentId: string, studentName?: string) => {
    if (studentName) return studentName;
    return students.find(s => s.id === studentId)?.name || studentId;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-family-system">
            النظام العائلي
          </h1>
          <p className="text-muted-foreground">إدارة حسابات أولياء الأمور وربطهم بالطلاب</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-family-link">
                <Plus className="w-4 h-4 ml-1" />
                إنشاء رابط عائلي
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" dir="rtl">
              <DialogHeader>
                <DialogTitle>إنشاء رابط عائلي جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>رقم هاتف ولي الأمر *</Label>
                  <Input
                    value={parentPhone}
                    onChange={e => setParentPhone(e.target.value)}
                    placeholder="07xxxxxxxxx"
                    data-testid="input-parent-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>اختر الطالب *</Label>
                  <SearchableSelect
                    options={students.map(s => ({ value: s.id, label: s.name }))}
                    value={selectedStudentId}
                    onValueChange={setSelectedStudentId}
                    placeholder="اختر الطالب"
                    searchPlaceholder="ابحث عن طالب..."
                    emptyText="لا يوجد طالب بهذا الاسم"
                    data-testid="select-student"
                  />
                </div>
                <div className="space-y-2">
                  <Label>صلة القرابة</Label>
                  <Select value={relationship} onValueChange={setRelationship}>
                    <SelectTrigger data-testid="select-relationship">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">ولي أمر</SelectItem>
                      <SelectItem value="guardian">وصي</SelectItem>
                      <SelectItem value="sibling">أخ/أخت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!parentPhone || !selectedStudentId || submitting}
                  className="w-full"
                  data-testid="button-confirm-create-link"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  إنشاء الرابط
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-t-4 border-t-blue-500" data-testid="card-stat-families">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي العائلات</p>
                <p className="text-2xl font-bold">{uniqueFamilies}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-green-500" data-testid="card-stat-children">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأبناء المرتبطين</p>
                <p className="text-2xl font-bold">{totalChildren}</p>
              </div>
              <Baby className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-purple-500" data-testid="card-stat-active">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">العائلات النشطة</p>
                <p className="text-2xl font-bold">{activeFamilies}</p>
              </div>
              <UserCheck className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md" data-testid="card-search-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            البحث عن عائلة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
              placeholder="ابحث برقم هاتف ولي الأمر..."
              className="flex-1"
              data-testid="input-search-phone"
            />
            <Button onClick={handleSearchDashboard} disabled={!searchPhone || searching} data-testid="button-search-dashboard">
              {searching ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <BarChart3 className="w-4 h-4 ml-1" />}
              عرض لوحة العائلة
            </Button>
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <Card className="shadow-md border-t-4 border-t-amber-500" data-testid="card-parent-accounts">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                حسابات أولياء الأمور
                <Badge variant="secondary">{parentAccounts.length}</Badge>
              </CardTitle>
              <Button onClick={handleBulkGenerateParents} disabled={generatingParents} data-testid="button-bulk-generate-parents">
                {generatingParents ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <UserPlus className="w-4 h-4 ml-1" />}
                توليد حسابات تلقائياً
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showCredentials && parentCredentials.length > 0 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3" data-testid="credentials-section">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-amber-800">بيانات الحسابات الجديدة</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyCredentials} data-testid="button-copy-credentials">
                      <Copy className="w-4 h-4 ml-1" />
                      نسخ الكل
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowCredentials(false); setParentCredentials([]); try { sessionStorage.removeItem("parentCredentials"); } catch {} }}>
                      <EyeOff className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {parentCredentials.map((cred, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border text-sm" data-testid={`credential-${idx}`}>
                      <p><strong>ولي الأمر:</strong> {cred.parentName}</p>
                      <p><strong>المستخدم:</strong> {cred.username}</p>
                      <p><strong>كلمة المرور:</strong> {cred.password}</p>
                      <p><strong>الأبناء:</strong> {cred.childrenNames.join("، ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resetResult && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm" data-testid="reset-result">
                <p className="font-semibold text-blue-800 mb-1">كلمة المرور الجديدة:</p>
                <p>المستخدم: <strong>{resetResult.username}</strong></p>
                <p>كلمة المرور: <strong>{resetResult.password}</strong></p>
                <Button size="sm" variant="ghost" className="mt-1" onClick={() => {
                  navigator.clipboard.writeText(`المستخدم: ${resetResult.username}\nكلمة المرور: ${resetResult.password}`);
                  toast({ title: "تم النسخ" });
                }}>
                  <Copy className="w-3 h-3 ml-1" /> نسخ
                </Button>
              </div>
            )}

            {parentAccounts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">لا توجد حسابات أولياء أمور بعد. اضغط "توليد حسابات تلقائياً" لإنشائها.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="table-parent-accounts">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">اسم المستخدم</TableHead>
                      <TableHead className="text-right">رقم الهاتف</TableHead>
                      <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parentAccounts.map((pa: any) => (
                      <TableRow key={pa.id} data-testid={`row-parent-${pa.id}`}>
                        <TableCell>{pa.name}</TableCell>
                        <TableCell className="font-mono text-sm">{pa.username}</TableCell>
                        <TableCell>{pa.phone || "—"}</TableCell>
                        <TableCell>{formatDateAr(pa.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600"
                              onClick={() => handleResetParentPassword(pa.id)}
                              disabled={resettingId === pa.id}
                              data-testid={`button-reset-${pa.id}`}
                            >
                              {resettingId === pa.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteParent(pa.id)}
                              data-testid={`button-delete-parent-${pa.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
      )}

      {dashboard && (
        <Card className="shadow-md border-t-4 border-t-primary" data-testid="card-family-dashboard">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              لوحة العائلة - {searchPhone}
              <a
                href={`https://wa.me/964${searchPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-auto"
                data-testid="link-whatsapp-dashboard"
              >
                <Button size="sm" variant="outline" className="text-green-600 border-green-300">
                  <MessageCircle className="w-4 h-4 ml-1" />
                  واتساب
                </Button>
              </a>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.children.map((child, idx) => (
                <Card key={idx} className="border" data-testid={`card-dashboard-child-${idx}`}>
                  <CardContent className="pt-4 space-y-2">
                    <p className="font-semibold text-lg">{child.studentName}</p>
                    <Badge variant="outline">{relationshipMap[child.relationship] || child.relationship}</Badge>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm mt-3">
                      <div className="bg-blue-50 rounded p-2">
                        <p className="text-muted-foreground">الحضور</p>
                        <p className="font-bold text-blue-700">{child.attendance ?? "—"}</p>
                      </div>
                      <div className="bg-green-50 rounded p-2">
                        <p className="text-muted-foreground">النقاط</p>
                        <p className="font-bold text-green-700">{child.points ?? "—"}</p>
                      </div>
                      <div className="bg-purple-50 rounded p-2">
                        <p className="text-muted-foreground">الواجبات</p>
                        <p className="font-bold text-purple-700">{child.assignments ?? "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {dashboard.children.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-4" data-testid="text-no-dashboard-children">
                  لا يوجد أبناء مرتبطين بهذا الرقم
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            الروابط العائلية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8" data-testid="status-loading-family-system">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-links">
              لا توجد روابط عائلية
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-family-links">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم هاتف ولي الأمر</TableHead>
                    <TableHead className="text-right">اسم الطالب</TableHead>
                    <TableHead className="text-right">صلة القرابة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLinks.map(link => (
                    <TableRow key={link.id} data-testid={`row-link-${link.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span data-testid={`text-phone-${link.id}`}>{link.parentPhone}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-student-${link.id}`}>
                        {getStudentName(link.studentId, link.studentName)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-relationship-${link.id}`}>
                          {relationshipMap[link.relationship] || link.relationship}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-date-${link.id}`}>
                        {formatDateAr(link.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <a
                            href={`https://wa.me/964${link.parentPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-whatsapp-${link.id}`}
                          >
                            <Button size="sm" variant="ghost" className="text-green-600">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </a>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDelete(link.id)}
                              disabled={deletingId === link.id}
                              data-testid={`button-delete-link-${link.id}`}
                            >
                              {deletingId === link.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
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
    </div>
  );
}
