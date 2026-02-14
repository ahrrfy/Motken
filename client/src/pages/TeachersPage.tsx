import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Mail, Phone, Download, Printer, Upload } from "lucide-react";

const teachers = [
  { id: 1, name: "الشيخ أحمد", students: 15, specialization: "تجويد", status: "active", phone: "07701234567" },
  { id: 2, name: "الشيخ عبد الله", students: 22, specialization: "حفظ", status: "active", phone: "07801234567" },
  { id: 3, name: "الشيخ محمد", students: 10, specialization: "قراءات", status: "vacation", phone: "07901234567" },
];

export default function TeachersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTeachers = teachers.filter(t => t.name.includes(searchTerm));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">الأساتذة</h1>
          <p className="text-muted-foreground">إدارة هيئة التدريس والمشرفين</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            استيراد
          </Button>
          <Button variant="outline" className="gap-2">
             <Download className="w-4 h-4" />
             تصدير
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" />
            إضافة أستاذ
          </Button>
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
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">التخصص</TableHead>
                <TableHead className="text-right">عدد الطلاب</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">تواصل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.specialization}</TableCell>
                  <TableCell>{teacher.students}</TableCell>
                  <TableCell dir="ltr" className="text-right">{teacher.phone}</TableCell>
                  <TableCell>
                    <Badge variant={teacher.status === "active" ? "default" : "secondary"} className={teacher.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-200 border-none" : "bg-orange-100 text-orange-700 border-none"}>
                      {teacher.status === "active" ? "نشط" : "إجازة"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon"><Mail className="w-4 h-4 text-gray-500" /></Button>
                      <Button variant="ghost" size="icon"><Phone className="w-4 h-4 text-gray-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
