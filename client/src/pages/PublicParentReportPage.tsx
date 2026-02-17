import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Calendar, Printer, AlertTriangle } from "lucide-react";

export default function PublicParentReportPage() {
  const [, params] = useRoute("/parent-report/:token");
  const token = params?.token;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/parent-report/${token}`)
      .then(res => {
        if (res.status === 404) throw new Error("التقرير غير موجود أو تم حذفه");
        if (res.status === 410) throw new Error("انتهت صلاحية هذا التقرير");
        if (!res.ok) throw new Error("حدث خطأ في تحميل التقرير");
        return res.json();
      })
      .then(data => { setReport(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [token]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "م" : "ص";
    const h12 = hours % 12 || 12;
    return `${day}/${month}/${year} ${h12}:${minutes} ${period}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto">
            <img src="/logo.png" alt="مُتْقِن" className="w-full h-full rounded-lg" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" data-testid="loading-spinner" />
          <p className="text-muted-foreground text-sm">جاري تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background" dir="rtl">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="w-16 h-16 mx-auto">
            <img src="/logo.png" alt="مُتْقِن" className="w-full h-full rounded-lg" />
          </div>
          <div className="bg-destructive/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground font-serif" data-testid="text-error-title">تعذّر عرض التقرير</h2>
          <p className="text-muted-foreground" data-testid="text-error-message">{error}</p>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">نظام مُتقِن - إدارة حلقات تحفيظ القرآن الكريم</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background" dir="rtl">
      <div className="bg-primary text-primary-foreground py-4 px-6 print:bg-white print:text-black">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src="/logo.png" alt="متقن" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-xl font-bold font-serif" data-testid="text-brand-title">نظام مُتقِن</h1>
            <p className="text-sm opacity-80">نظام إدارة حلقات تحفيظ القرآن الكريم</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2" data-testid="text-report-title">
                <FileText className="w-5 h-5" />
                تقرير تقدم الطالب{report.studentName ? `: ${report.studentName}` : ""}
              </CardTitle>
              <Badge variant={report.reportType === "weekly" ? "default" : "secondary"} data-testid="badge-report-type">
                {report.reportType === "weekly" ? "أسبوعي" : "شهري"}
              </Badge>
            </div>
            {report.mosqueName && (
              <p className="text-sm text-primary font-medium mt-1" data-testid="text-mosque-name">{report.mosqueName}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Calendar className="w-4 h-4" />
              <span data-testid="text-created-date">تاريخ الإنشاء: {formatDate(report.createdAt)}</span>
            </div>
            {report.expiresAt && (
              <p className="text-xs text-muted-foreground" data-testid="text-expires-date">
                صالح حتى: {formatDate(report.expiresAt)}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/30 rounded-lg p-4 border" data-testid="text-report-content">
              {report.content}
            </pre>
          </CardContent>
        </Card>

        <div className="flex justify-center print:hidden">
          <Button variant="outline" onClick={() => window.print()} className="gap-2" data-testid="button-print-report">
            <Printer className="w-4 h-4" />
            طباعة التقرير
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground py-4 print:hidden">
          <p>نظام مُتقِن - إدارة حلقات تحفيظ القرآن الكريم</p>
        </div>
      </div>
    </div>
  );
}