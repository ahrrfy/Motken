import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Mail, Phone, Download, Printer, Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface Teacher {
  id: string;
  username: string;
  name: string;
  role: string;
  mosqueId?: string | null;
  email?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  isActive: boolean;
}

export default function TeachersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "", password: "", name: "", email: "", phone: ""
  });

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
    if (!formData.username || !formData.password || !formData.name) {
      toast({ title: "خطأ", description: "يرجى تعبئة الحقول المطلوبة", variant: "destructive" });
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
        toast({ title: "تم بنجاح", description: "تمت إضافة الأستاذ بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        setFormData({ username: "", password: "", name: "", email: "", phone: "" });
        fetchTeachers();
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

  const filteredTeachers = teachers.filter(t => t.name.includes(searchTerm));

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">الأساتذة</h1>
          <p className="text-muted-foreground">إدارة هيئة التدريس والمشرفين</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => window.print()} className="gap-2" data-testid="button-print">
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-import">
            <Upload className="w-4 h-4" />
            استيراد
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-export">
            <Download className="w-4 h-4" />
            تصدير
          </Button>
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
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>اسم المستخدم *</Label>
                    <Input data-testid="input-username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور *</Label>
                    <Input data-testid="input-password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input data-testid="input-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input data-testid="input-email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>الهاتف</Label>
                    <Input data-testid="input-phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">قائمة الأساتذة</CardTitle>
            <div className="relative w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن أستاذ..."
                className="pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
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
                    <TableHead className="text-right">البريد</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">الهاتف</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تواصل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id} data-testid={`row-teacher-${teacher.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${teacher.id}`}>{teacher.name}</TableCell>
                      <TableCell data-testid={`text-email-${teacher.id}`}>{teacher.email || "—"}</TableCell>
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
                          {teacher.email && (
                            <Button variant="ghost" size="icon" data-testid={`button-email-${teacher.id}`}>
                              <Mail className="w-4 h-4 text-gray-500" />
                            </Button>
                          )}
                          {teacher.phone && (
                            <Button variant="ghost" size="icon" data-testid={`button-phone-${teacher.id}`}>
                              <Phone className="w-4 h-4 text-gray-500" />
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
