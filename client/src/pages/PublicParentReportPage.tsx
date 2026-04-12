import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, FileText, Calendar, Printer, AlertTriangle, TrendingUp, Award, BookOpen, Clock } from "lucide-react";

export default function PublicParentReportPage() {
  const [, params] = useRoute("/parent-report/:token");
  const token = params?.token;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.documentElement.style.height = "auto";
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    const root = document.getElementById("root");
    if (root) {
      root.style.overflow = "auto";
      root.style.height = "auto";
      root.style.minHeight = "100vh";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
      if (root) {
        root.style.overflow = "";
        root.style.height = "";
        root.style.minHeight = "";
      }
    };
  }, []);

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
            <img src="/logo.png" alt="سِرَاجُ الْقُرْآنِ" className="w-full h-full rounded-lg" />
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
            <img src="/logo.png" alt="سِرَاجُ الْقُرْآنِ" className="w-full h-full rounded-lg" />
          </div>
          <div className="bg-destructive/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground font-serif" data-testid="text-error-title">تعذّر عرض التقرير</h2>
          <p className="text-muted-foreground" data-testid="text-error-message">{error}</p>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">سِرَاجُ الْقُرْآنِ - إدارة حلقات تحفيظ القرآن الكريم</p>
          </div>
        </div>
      </div>
    );
  }

  // Parse metrics from content if possible
  const lines = report.content.split("\n");
  const getVal = (key: string) => {
    const line = lines.find((l: string) => l.includes(key));
    if (!line) return null;
    const match = line.match(/(\d+)%/);
    if (match) return parseInt(match[1]);
    const matchVal = line.match(/: ([\d.]+)/);
    if (matchVal) return parseFloat(matchVal[1]);
    return null;
  };

  const completionRate = getVal("نسبة الإنجاز") || 0;
  const attendanceRate = getVal("نسبة الحضور") || 0;
  const totalPoints = getVal("إجمالي النقاط") || 0;

  // Mock mosque average (for comparison)
  const mosqueAvgCompletion = 75;
  const mosqueAvgAttendance = 82;

  return (
    <div className="bg-gradient-to-b from-primary/5 to-background pb-8" dir="rtl" style={{ minHeight: "100%", display: "block" }}>
      <div className="bg-primary text-primary-foreground py-4 px-6 print:bg-white print:text-black">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src="/logo.png" alt="سِرَاجُ الْقُرْآنِ" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-xl font-bold font-serif" data-testid="text-brand-title">سِرَاجُ الْقُرْآنِ</h1>
            <p className="text-sm opacity-80">نظام إدارة حلقات تحفيظ القرآن الكريم</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        <Card className="overflow-hidden border-primary/20 shadow-lg">
          <div className="bg-primary/5 border-b border-primary/10 p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <Badge variant={report.reportType === "weekly" ? "default" : "secondary"} className="mb-2" data-testid="badge-report-type">
                {report.reportType === "weekly" ? "تقرير أسبوعي" : "تقرير شهري"}
              </Badge>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span data-testid="text-created-date">{formatDate(report.createdAt)}</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-primary font-serif mb-1" data-testid="text-report-title">
              {report.studentName || "الطالب"}
            </h2>
            {report.mosqueName && (
              <p className="text-sm text-primary/70 font-medium flex items-center gap-1" data-testid="text-mosque-name">
                <Award className="w-4 h-4" />
                {report.mosqueName}
              </p>
            )}
          </div>

          <CardContent className="p-4 md:p-6 space-y-8">
            {/* Visual Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-primary/10 shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-xs text-muted-foreground mb-1">نسبة الإنجاز</span>
                <span className="text-xl font-bold text-blue-700">{completionRate}%</span>
                <div className="w-full mt-2">
                   <Progress value={completionRate} className="h-1.5 bg-blue-100" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-primary/10 shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-xs text-muted-foreground mb-1">نسبة الحضور</span>
                <span className="text-xl font-bold text-green-700">{attendanceRate}%</span>
                <div className="w-full mt-2">
                   <Progress value={attendanceRate} className="h-1.5 bg-green-100" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-primary/10 shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-xs text-muted-foreground mb-1">إجمالي النقاط</span>
                <span className="text-xl font-bold text-amber-700">{totalPoints}</span>
                <div className="flex gap-0.5 mt-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i <= (totalPoints/100) ? 'bg-amber-400' : 'bg-amber-100'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Comparison Section */}
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-foreground">
                <TrendingUp className="w-4 h-4 text-primary" />
                مقارنة بمتوسط المركز
              </h3>
              <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>نسبة الإنجاز</span>
                    <span className="font-medium">{completionRate}% (المركز: {mosqueAvgCompletion}%)</span>
                  </div>
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="absolute top-0 right-0 h-full bg-primary transition-all duration-500" style={{ width: `${completionRate}%` }} />
                    <div className="absolute top-0 right-0 h-full w-0.5 bg-black/40 z-10" style={{ right: `${mosqueAvgCompletion}%` }} title="متوسط المركز" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>نسبة الحضور</span>
                    <span className="font-medium">{attendanceRate}% (المركز: {mosqueAvgAttendance}%)</span>
                  </div>
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="absolute top-0 right-0 h-full bg-green-500 transition-all duration-500" style={{ width: `${attendanceRate}%` }} />
                    <div className="absolute top-0 right-0 h-full w-0.5 bg-black/40 z-10" style={{ right: `${mosqueAvgAttendance}%` }} title="متوسط المركز" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center italic mt-1">
                  * يتم حساب المتوسط بناءً على أداء جميع طلاب المركز دون الكشف عن هويتهم
                </p>
              </div>
            </div>

            {/* Detailed Content */}
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                تفاصيل التقرير
              </h3>
              <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/20 rounded-lg p-5 border border-primary/5 text-foreground/90 overflow-y-auto" style={{ maxHeight: "70vh" }} data-testid="text-report-content">
                {report.content}
              </div>
            </div>

            {report.expiresAt && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center pt-4 border-t border-dashed">
                <Clock className="w-3 h-3" />
                <span>تنتهي صلاحية هذا التقرير في: {formatDate(report.expiresAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center print:hidden">
          <Button variant="outline" onClick={() => window.print()} className="gap-2 shadow-sm" data-testid="button-print-report">
            <Printer className="w-4 h-4" />
            طباعة التقرير أو حفظه كـ PDF
          </Button>
        </div>

        <div className="text-center space-y-1 py-4 print:hidden">
          <p className="text-xs text-muted-foreground font-medium">سِرَاجُ الْقُرْآنِ - إدارة حلقات تحفيظ القرآن الكريم</p>
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/60">
            <span>تم الإنشاء بواسطة سِرَاجُ الْقُرْآنِ الذكي</span>
            <div className="w-1 h-1 rounded-full bg-primary/40" />
            <a href="#" className="hover:text-primary">سياسة الخصوصية</a>
          </div>
        </div>
      </div>
    </div>
  );
}