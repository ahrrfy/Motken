import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Filter, Search, ShieldAlert, ShieldCheck, Printer, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr } from "@/lib/utils";
import { openPrintWindow } from "@/lib/print-utils";

interface ActivityLog {
  id: string;
  userId: string | null;
  userName: string;
  mosqueId: string | null;
  action: string;
  module: string;
  details: string | null;
  ipAddress: string | null;
  status: string;
  createdAt: string;
}

export default function ActivityLogsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity-logs", { credentials: "include" })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Failed to load");
      })
      .then(data => setLogs(data))
      .catch(() => {
        toast({ title: "خطأ", description: "فشل في تحميل سجل الحركات", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(log =>
    (log.userName.includes(searchTerm) || log.action.includes(searchTerm)) &&
    (filterType === "all" || log.status === filterType)
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

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">سجل الحركات</h1>
          <p className="text-muted-foreground">مراقبة وتتبع جميع العمليات داخل النظام</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button variant="outline" className="gap-2" onClick={() => {
            const tableHtml = `
              <h3 class="section-title">سجل الحركات (${filteredLogs.length})</h3>
              <table>
                <thead>
                  <tr><th>#</th><th>المستخدم</th><th>العملية</th><th>القسم</th><th>الحالة</th><th>التاريخ</th></tr>
                </thead>
                <tbody>
                  ${filteredLogs.map((log, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${log.userName}</td>
                      <td>${log.action}</td>
                      <td>${log.module}</td>
                      <td>${log.status === "success" ? "ناجح" : "فشل"}</td>
                      <td>${formatDate(log.createdAt)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            `;
            openPrintWindow("سجل الحركات", tableHtml, { landscape: true });
          }} data-testid="button-print">
            <Printer className="w-4 h-4" />
            طباعة السجل
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-export">
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
                  data-testid="input-search"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]" data-testid="select-filter">
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
          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="status-loading">
              <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
              <span>جاري التحميل...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="status-empty">
              لا توجد بيانات
            </div>
          ) : (
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
                    <TableRow key={log.id} className={log.status === 'danger' ? 'bg-red-50/50' : ''} data-testid={`row-log-${log.id}`}>
                      <TableCell className="font-bold" data-testid={`text-user-${log.id}`}>{log.userName}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-100">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{log.details || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ipAddress || "—"}</TableCell>
                      <TableCell className="text-sm" dir="ltr">{formatDate(log.createdAt)}</TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none" data-testid={`status-log-${log.id}`}>ناجح</Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1" data-testid={`status-log-${log.id}`}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
