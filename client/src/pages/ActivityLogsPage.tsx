import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Filter, Search, ShieldAlert, ShieldCheck, Printer } from "lucide-react";

const logs = [
  { id: 1, user: "مدير النظام", action: "تسجيل دخول", module: "الأمان", details: "تم تسجيل الدخول بنجاح", ip: "192.168.1.1", time: "2024-02-14 08:30:00", status: "success" },
  { id: 2, user: "الشيخ أحمد", action: "تحديث بيانات طالب", module: "الطلاب", details: "تحديث سجل الطالب عمر خالد", ip: "192.168.1.45", time: "2024-02-14 09:15:00", status: "success" },
  { id: 3, user: "مشرف النظام", action: "تصدير تقرير", module: "التقارير", details: "تصدير تقرير الحفظ الشهري", ip: "192.168.1.20", time: "2024-02-14 10:00:00", status: "success" },
  { id: 4, user: "مجهول", action: "محاولة دخول خاطئة", module: "الأمان", details: "كلمة مرور غير صحيحة", ip: "10.0.0.5", time: "2024-02-14 11:20:00", status: "danger" },
  { id: 5, user: "د. عبد الله", action: "إضافة أستاذ جديد", module: "الأساتذة", details: "إضافة الشيخ محمد للقائمة", ip: "192.168.1.1", time: "2024-02-14 12:45:00", status: "success" },
  { id: 6, user: "الشيخ أحمد", action: "تسجيل تسميع", module: "الحلقات", details: "تسجيل تسميع سورة البقرة", ip: "192.168.1.45", time: "2024-02-14 13:10:00", status: "success" },
];

export default function ActivityLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredLogs = logs.filter(log => 
    (log.user.includes(searchTerm) || log.action.includes(searchTerm)) &&
    (filterType === "all" || log.status === filterType)
  );

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary">سجل الحركات</h1>
          <p className="text-muted-foreground">مراقبة وتتبع جميع العمليات داخل النظام</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            طباعة السجل
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            تصدير Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              العمليات المسجلة
            </CardTitle>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="بحث في السجل..." 
                  className="pr-9" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
                  <SelectValue placeholder="تصفية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="success">عمليات ناجحة</SelectItem>
                  <SelectItem value="danger">تنبيهات أمنية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">الحدث / الحركة</TableHead>
                <TableHead className="text-right">القسم</TableHead>
                <TableHead className="text-right">التفاصيل</TableHead>
                <TableHead className="text-right">IP Address</TableHead>
                <TableHead className="text-right">الوقت والتاريخ</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className={log.status === 'danger' ? 'bg-red-50/50' : ''}>
                  <TableCell className="font-bold">{log.user}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-100">{log.module}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{log.details}</TableCell>
                  <TableCell className="font-mono text-xs">{log.ip}</TableCell>
                  <TableCell className="text-sm" dir="ltr">{log.time}</TableCell>
                  <TableCell>
                    {log.status === 'success' ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">ناجح</Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        تنبيه
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
