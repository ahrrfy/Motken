import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Plus, FileText, QrCode, Upload, Printer } from "lucide-react";
import * as XLSX from 'xlsx';

const mockStudents = [
  { id: 1, name: "أحمد محمد", level: "الجزء 5", progress: 85, status: "active", teacher: "الشيخ عبد الله" },
  { id: 2, name: "يوسف علي", level: "الجزء 2", progress: 45, status: "active", teacher: "الشيخ عبد الله" },
  { id: 3, name: "عمر خالد", level: "الجزء 10", progress: 92, status: "active", teacher: "الشيخ أحمد" },
  { id: 4, name: "سعيد حسن", level: "الجزء 1", progress: 15, status: "inactive", teacher: "الشيخ أحمد" },
  { id: 5, name: "كريم محمود", level: "الجزء 3", progress: 60, status: "active", teacher: "الشيخ عبد الله" },
];

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(mockStudents);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "students_list.xlsx");
  };

  const filteredStudents = mockStudents.filter(s => s.name.includes(searchTerm));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">الطلاب</h1>
          <p className="text-muted-foreground">إدارة بيانات الطلاب ومتابعة تقدمهم</p>
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
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            تصدير
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" />
            إضافة طالب
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">قائمة الطلاب</CardTitle>
            <div className="relative w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث عن طالب..." 
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
                <TableHead className="text-right">المستوى الحالي</TableHead>
                <TableHead className="text-right">الأستاذ المشرف</TableHead>
                <TableHead className="text-right">التقدم</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.level}</TableCell>
                  <TableCell>{student.teacher}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden w-24">
                        <div className="bg-primary h-full" style={{ width: `${student.progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{student.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.status === "active" ? "default" : "destructive"} className={student.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-200 border-none" : ""}>
                      {student.status === "active" ? "نشط" : "متوقف"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" title="التفاصيل"><FileText className="w-4 h-4 text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" title="الهوية"><QrCode className="w-4 h-4 text-purple-600" /></Button>
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
