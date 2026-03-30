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
  Loader2, Plus, Users, Trash2, Search, Phone, UserCheck, Baby, MessageCircle, BarChart3,
  UserPlus, Eye, EyeOff, X, CheckCircle2
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

  // Create parent account state
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [parentAccountPhone, setParentFormPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentUsername, setParentUsername] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [parentGender, setParentGender] = useState("male");
  const [showParentPassword, setShowParentPassword] = useState(false);
  const [parentSubmitting, setParentSubmitting] = useState(false);
  const [detectedStudents, setDetectedStudents] = useState<{ id: string; name: string; gender: string | null; level: number | null; parentPhone: string | null }[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [detectingStudents, setDetectingStudents] = useState(false);
  const [manualStudentId, setManualStudentId] = useState("");

  const canManage = user?.role === "admin" || user?.role === "supervisor";

  // Smart phone detection for parent account creation
  const detectStudentsByPhone = async (phone: string) => {
    if (phone.length < 7) {
      setDetectedStudents([]);
      return;
    }
    setDetectingStudents(true);
    try {
      const res = await fetch(`/api/family/students-by-parent-phone/${encodeURIComponent(phone)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDetectedStudents(data);
        // Auto-select all detected students
        setSelectedStudentIds(data.map((s: any) => s.id));
      }
    } catch {}
    finally {
      setDetectingStudents(false);
    }
  };

  const handleParentPhoneChange = (val: string) => {
    setParentFormPhone(val);
    // Debounced search
    const timeout = setTimeout(() => detectStudentsByPhone(val), 400);
    return () => clearTimeout(timeout);
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const addManualStudent = () => {
    if (manualStudentId && !selectedStudentIds.includes(manualStudentId)) {
      setSelectedStudentIds(prev => [...prev, manualStudentId]);
      // Check if student is already in detected list
      if (!detectedStudents.find(s => s.id === manualStudentId)) {
        const student = students.find(s => s.id === manualStudentId);
        if (student) {
          setDetectedStudents(prev => [...prev, { id: student.id, name: student.name, gender: null, level: null, parentPhone: null }]);
        }
      }
      setManualStudentId("");
    }
  };

  const handleCreateParentAccount = async () => {
    if (!parentName || !parentUsername || !parentPassword || !parentAccountPhone) {
      toast({ title: "خطأ", description: "جميع الحقول مطلوبة", variant: "destructive" });
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast({ title: "خطأ", description: "يجب اختيار طالب واحد على الأقل", variant: "destructive" });
      return;
    }
    if (parentPassword.length < 4) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setParentSubmitting(true);
    try {
      const res = await fetch("/api/family/create-parent-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: parentAccountPhone,
          name: parentName,
          username: parentUsername,
          password: parentPassword,
          gender: parentGender,
          studentIds: selectedStudentIds,
        }),
      });
      if (res.ok) {
        toast({
          title: "تم بنجاح",
          description: `تم إنشاء حساب ولي الأمر "${parentName}" وربطه بـ ${selectedStudentIds.length} طالب`,
          className: "bg-green-50 border-green-200 text-green-800",
        });
        setParentDialogOpen(false);
        setParentFormPhone("");
        setParentName("");
        setParentUsername("");
        setParentPassword("");
        setParentGender("male");
        setDetectedStudents([]);
        setSelectedStudentIds([]);
        fetchLinks();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الحساب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setParentSubmitting(false);
    }
  };

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

  useEffect(() => {
    fetchLinks();
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
          <div className="flex gap-2 flex-wrap">
          <Dialog open={parentDialogOpen} onOpenChange={setParentDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" data-testid="button-create-parent-account">
                <UserPlus className="w-4 h-4 ml-1" />
                إنشاء حساب ولي أمر
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  إنشاء حساب ولي أمر جديد
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>رقم هاتف ولي الأمر *</Label>
                  <Input
                    value={parentAccountPhone}
                    onChange={e => handleParentPhoneChange(e.target.value)}
                    placeholder="07xxxxxxxxx"
                    data-testid="input-parent-account-phone"
                  />
                  {detectingStudents && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      جاري البحث عن الطلاب...
                    </p>
                  )}
                </div>

                {/* Detected Students */}
                {detectedStudents.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      طلاب يحملون نفس الرقم ({detectedStudents.length})
                    </Label>
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto border rounded-lg p-2">
                      {detectedStudents.map(s => (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedStudentIds.includes(s.id)
                              ? "bg-emerald-50 border border-emerald-200"
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(s.id)}
                            onChange={() => toggleStudentSelection(s.id)}
                            className="rounded"
                          />
                          <span className="text-sm font-medium">{s.name}</span>
                          {s.gender && (
                            <Badge variant="outline" className="text-[9px]">
                              {s.gender === "male" || s.gender === "ذكر" ? "ذكر" : "أنثى"}
                            </Badge>
                          )}
                          {s.level && (
                            <Badge variant="secondary" className="text-[9px]">
                              م{s.level}
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual student selection */}
                <div className="space-y-2">
                  <Label>إضافة طالب يدوياً</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={students.filter(s => !selectedStudentIds.includes(s.id)).map(s => ({ value: s.id, label: s.name }))}
                        value={manualStudentId}
                        onValueChange={setManualStudentId}
                        placeholder="ابحث واختر طالب..."
                        searchPlaceholder="ابحث عن طالب..."
                        emptyText="لا يوجد طالب"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addManualStudent}
                      disabled={!manualStudentId}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {selectedStudentIds.length > 0 && (
                    <p className="text-xs text-emerald-600 font-medium">
                      {selectedStudentIds.length} طالب مختار للربط
                    </p>
                  )}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input
                      value={parentName}
                      onChange={e => setParentName(e.target.value)}
                      placeholder="اسم ولي الأمر"
                      data-testid="input-parent-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم المستخدم *</Label>
                    <Input
                      value={parentUsername}
                      onChange={e => setParentUsername(e.target.value)}
                      placeholder="اسم المستخدم للدخول"
                      data-testid="input-parent-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور *</Label>
                    <div className="relative">
                      <Input
                        type={showParentPassword ? "text" : "password"}
                        value={parentPassword}
                        onChange={e => setParentPassword(e.target.value)}
                        placeholder="كلمة المرور"
                        className="pl-10"
                        data-testid="input-parent-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowParentPassword(!showParentPassword)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showParentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>الجنس</Label>
                    <Select value={parentGender} onValueChange={setParentGender}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleCreateParentAccount}
                  disabled={!parentName || !parentUsername || !parentPassword || !parentAccountPhone || selectedStudentIds.length === 0 || parentSubmitting}
                  className="w-full"
                  data-testid="button-confirm-create-parent"
                >
                  {parentSubmitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  إنشاء حساب ولي الأمر ({selectedStudentIds.length} طالب)
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-create-family-link">
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
          </div>
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
