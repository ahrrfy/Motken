import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Search, Building2, Shield, GraduationCap, BookOpen, Trash2, Edit, Printer, Download } from "lucide-react";
import { openPrintWindow } from "@/lib/print-utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import UsernameInput from "@/components/UsernameInput";

interface Mosque {
  id: string;
  name: string;
  city: string;
}

interface UserRecord {
  id: string;
  username: string;
  name: string;
  role: string;
  mosqueId?: string | null;
  phone?: string;
  gender?: string | null;
  isActive?: boolean;
  canPrintIds?: boolean;
}

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  supervisor: "مشرف",
  teacher: "أستاذ",
  student: "طالب",
};

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  supervisor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  teacher: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  student: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const roleIcons: Record<string, any> = {
  admin: Shield,
  supervisor: Shield,
  teacher: GraduationCap,
  student: BookOpen,
};

export default function AllUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterMosque, setFilterMosque] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "supervisor",
    mosqueId: "",
    phone: "",
  });

  const fetchData = async () => {
    try {
      const [usersRes, mosquesRes] = await Promise.all([
        fetch("/api/users", { credentials: "include" }),
        fetch("/api/mosques", { credentials: "include" }),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (mosquesRes.ok) setMosques(await mosquesRes.json());
    } catch {
      toast({ title: "خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setForm({ username: "", password: "", name: "", role: "supervisor", mosqueId: "", phone: "" });
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    if (!form.username || !form.name || (!editingUser && !form.password)) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (form.role !== "admin" && !form.mosqueId) {
      toast({ title: "يرجى اختيار الجامع/المركز", variant: "destructive" });
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";
      const body: any = { ...form };
      if (form.role === "admin") body.mosqueId = null;
      if (editingUser && !form.password) delete body.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (res.ok) {
        toast({ title: editingUser ? "تم تحديث المستخدم بنجاح" : "تم إضافة المستخدم بنجاح" });
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم حذف المستخدم بنجاح" });
        fetchData();
      } else {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const handleTogglePrint = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/toggle-print`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم تحديث صلاحية الطباعة" });
        fetchData();
      } else {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
  };

  const openEdit = (u: UserRecord) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      password: "",
      name: u.name,
      role: u.role,
      mosqueId: u.mosqueId || "",
      phone: u.phone || "",
    });
    setDialogOpen(true);
  };

  if (user?.role !== "admin") {
    return <div className="p-8 text-center text-muted-foreground">غير مصرح بالوصول</div>;
  }

  const getMosqueName = (mosqueId?: string | null) => {
    if (!mosqueId) return "—";
    return mosques.find((m) => m.id === mosqueId)?.name || "—";
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.includes(search) || u.username.includes(search);
    const matchesRole = filterRole === "all" || u.role === filterRole;
    const matchesMosque = filterMosque === "all" || u.mosqueId === filterMosque;
    return matchesSearch && matchesRole && matchesMosque;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    supervisors: users.filter((u) => u.role === "supervisor").length,
    teachers: users.filter((u) => u.role === "teacher").length,
    students: users.filter((u) => u.role === "student").length,
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold" data-testid="text-page-title">جميع المستخدمين</h1>
          <p className="text-muted-foreground text-sm">إدارة جميع حسابات المستخدمين في النظام</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" data-testid="button-print-users" onClick={() => {
            const roleMap: Record<string, string> = { admin: "مدير", supervisor: "مشرف", teacher: "أستاذ", student: "طالب" };
            const tableHtml = `
              <h3 class="section-title">جميع المستخدمين (${filteredUsers.length})</h3>
              <table>
                <thead>
                  <tr><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الجامع/المركز</th><th>الهاتف</th></tr>
                </thead>
                <tbody>
                  ${filteredUsers.map((u, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${u.name}</td>
                      <td>${u.username}</td>
                      <td>${roleMap[u.role] || u.role}</td>
                      <td>${getMosqueName(u.mosqueId)}</td>
                      <td>${u.phone || "—"}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            `;
            openPrintWindow("جميع المستخدمين", tableHtml);
          }}>
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <UserPlus className="w-4 h-4 ml-2" />
              إضافة مستخدم
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>الاسم الكامل *</Label>
                  <Input data-testid="input-user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="الاسم" />
                </div>
                <UsernameInput
                  value={form.username}
                  onChange={(v) => setForm({ ...form, username: v })}
                  editingUserId={editingUser?.id}
                  testId="input-user-username"
                />
              </div>
              <div>
                <Label>{editingUser ? "كلمة المرور (اتركها فارغة لعدم التغيير)" : "كلمة المرور *"}</Label>
                <Input data-testid="input-user-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" dir="ltr" />
              </div>
              <div>
                <Label>الدور *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="select-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير النظام</SelectItem>
                    <SelectItem value="supervisor">مشرف</SelectItem>
                    <SelectItem value="teacher">أستاذ</SelectItem>
                    <SelectItem value="student">طالب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role !== "admin" && (
                <div>
                  <Label>الجامع/المركز *</Label>
                  <Select value={form.mosqueId} onValueChange={(v) => setForm({ ...form, mosqueId: v })}>
                    <SelectTrigger data-testid="select-user-mosque">
                      <SelectValue placeholder="اختر الجامع/المركز" />
                    </SelectTrigger>
                    <SelectContent>
                      {mosques.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name} - {m.city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>رقم الهاتف</Label>
                <Input data-testid="input-user-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xxxxxxxxx" dir="ltr" />
              </div>
              <Button className="w-full" onClick={handleSubmit} data-testid="button-submit-user">
                {editingUser ? "تحديث" : "إضافة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-gray-500">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</div>
            <div className="text-xs text-muted-foreground">الإجمالي</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-stat-admins">{stats.admins}</div>
            <div className="text-xs text-muted-foreground">مديرون</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-stat-supervisors">{stats.supervisors}</div>
            <div className="text-xs text-muted-foreground">مشرفون</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-stat-teachers">{stats.teachers}</div>
            <div className="text-xs text-muted-foreground">أساتذة</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-stat-students">{stats.students}</div>
            <div className="text-xs text-muted-foreground">طلاب</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-search-users"
                placeholder="بحث بالاسم أو اسم المستخدم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأدوار</SelectItem>
                <SelectItem value="admin">مديرون</SelectItem>
                <SelectItem value="supervisor">مشرفون</SelectItem>
                <SelectItem value="teacher">أساتذة</SelectItem>
                <SelectItem value="student">طلاب</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMosque} onValueChange={setFilterMosque}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-mosque">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الجوامع والمراكز</SelectItem>
                {mosques.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد نتائج</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-right py-3 px-2 font-medium">الاسم</th>
                    <th className="text-right py-3 px-2 font-medium hidden sm:table-cell">اسم المستخدم</th>
                    <th className="text-right py-3 px-2 font-medium hidden md:table-cell">الجنس</th>
                    <th className="text-right py-3 px-2 font-medium">الدور</th>
                    <th className="text-right py-3 px-2 font-medium hidden md:table-cell">الجامع/المركز</th>
                    <th className="text-right py-3 px-2 font-medium hidden lg:table-cell">الهاتف</th>
                    <th className="text-center py-3 px-2 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const RoleIcon = roleIcons[u.role] || Users;
                    return (
                      <tr key={u.id} className="border-b hover:bg-muted/50 transition-colors" data-testid={`row-user-${u.id}`}>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              {u.name?.charAt(0)}
                            </div>
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell" dir="ltr">{u.username}</td>
                        <td className="py-3 px-2 hidden md:table-cell" data-testid={`text-gender-${u.id}`}>{u.gender === "female" ? "أنثى" : "ذكر"}</td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary" className={`${roleColors[u.role]} text-xs gap-1`}>
                            <RoleIcon className="w-3 h-3" />
                            {roleLabels[u.role]}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <div className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Building2 className="w-3 h-3" />
                            {getMosqueName(u.mosqueId)}
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden lg:table-cell text-muted-foreground" dir="ltr">{u.phone || "—"}</td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {(u.role === "supervisor" || u.role === "teacher") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${u.canPrintIds ? "text-green-600" : "text-muted-foreground"}`}
                                onClick={() => handleTogglePrint(u.id)}
                                title={u.canPrintIds ? "إلغاء صلاحية الطباعة" : "منح صلاحية الطباعة"}
                                data-testid={`button-toggle-print-${u.id}`}
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)} data-testid={`button-edit-user-${u.id}`}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            {u.id !== user?.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" data-testid={`button-delete-user-${u.id}`}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      هل أنت متأكد من حذف المستخدم "{u.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-row-reverse gap-2">
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(u.id)} className="bg-red-600 hover:bg-red-700">
                                      حذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
