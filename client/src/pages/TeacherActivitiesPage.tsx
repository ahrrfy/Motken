import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ClipboardList, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr } from "@/lib/utils";

interface ActivityLog {
  id: string;
  userId: string | null;
  userName: string;
  userRole: string | null;
  mosqueId: string | null;
  action: string;
  module: string;
  details: string | null;
  status: string;
  createdAt: string;
}

export default function TeacherActivitiesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher-activities", { credentials: "include" })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Failed to load");
      })
      .then(data => setLogs(data))
      .catch(() => {
        toast({ title: "خطأ", description: "فشل في تحميل أنشطة الأساتذة", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(log =>
    log.userName.includes(searchTerm) || log.action.includes(searchTerm) || log.module.includes(searchTerm)
  );

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString("ar-IQ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      assignments: "الواجبات",
      exams: "الامتحانات",
      ratings: "التقييمات",
      students: "الطلاب",
      users: "المستخدمين",
    };
    return labels[module] || module;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">أنشطة الأساتذة</h1>
        <p className="text-muted-foreground">متابعة جميع الأنشطة التي يقوم بها الأساتذة في الجامع/المركز</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              سجل أنشطة الأساتذة
            </CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                className="pr-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-3 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="status-loading">
              <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
              <span>جاري التحميل...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="status-empty">
              لا توجد أنشطة مسجلة حتى الآن
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الأستاذ</TableHead>
                    <TableHead className="text-right">النشاط</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">القسم</TableHead>
                    <TableHead className="text-right hidden md:table-cell">التفاصيل</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-activity-${log.id}`}>
                      <TableCell className="font-bold" data-testid={`text-teacher-${log.id}`}>{log.userName}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="bg-slate-100">{getModuleLabel(log.module)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{log.details || "—"}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell" dir="ltr">{formatDate(log.createdAt)}</TableCell>
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
