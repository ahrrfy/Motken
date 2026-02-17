import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, UserX, Calendar, TrendingDown, Bell, AlertTriangle, AlertCircle, Info, Loader2, PartyPopper } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getWhatsAppUrl } from "@/lib/phone-utils";

interface AlertItem {
  id: string | number;
  name?: string;
  date?: string;
  grade?: number;
  subject?: string;
  examName?: string;
  message?: string;
  [key: string]: any;
}

interface SmartAlertsData {
  studentsWithoutAssignments: AlertItem[];
  inactiveTeachers: AlertItem[];
  upcomingExams: AlertItem[];
  lowGrades: AlertItem[];
}

const defaultData: SmartAlertsData = {
  studentsWithoutAssignments: [],
  inactiveTeachers: [],
  upcomingExams: [],
  lowGrades: [],
};

export default function SmartAlertsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<SmartAlertsData>(defaultData);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/smart-alerts", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast({ title: "خطأ", description: "فشل في تحميل التنبيهات", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const criticalCount = data.inactiveTeachers.length;
  const warningCount = data.studentsWithoutAssignments.length;
  const infoCount = data.upcomingExams.length + data.lowGrades.length;
  const totalCount = criticalCount + warningCount + infoCount;

  const summaryCards = [
    { title: "إجمالي التنبيهات", value: totalCount, icon: Bell, color: "text-gray-600", bg: "bg-gray-100" },
    { title: "تنبيهات حرجة", value: criticalCount, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
    { title: "تحذيرات", value: warningCount, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-100" },
    { title: "معلومات", value: infoCount, icon: Info, color: "text-blue-600", bg: "bg-blue-100" },
  ];

  const sections = [
    {
      key: "studentsWithoutAssignments",
      title: "طلاب بدون واجبات",
      subtitle: "أكثر من 7 أيام بدون واجب",
      icon: BookOpen,
      color: "text-orange-600",
      bgIcon: "bg-orange-100",
      cardBg: "bg-orange-50 dark:bg-orange-950 border-orange-200",
      badgeVariant: "outline" as const,
      items: data.studentsWithoutAssignments,
      renderItem: (item: AlertItem) => (
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background/50" data-testid={`alert-item-student-${item.id}`}>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{item.name}</p>
            {item.date && <p className="text-xs text-muted-foreground">آخر واجب: {item.date}</p>}
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-xs" data-testid={`button-create-assignment-${item.id}`} onClick={() => setLocation(`/assignments?studentId=${item.id}&action=create`)}>
            إنشاء واجب
          </Button>
        </div>
      ),
    },
    {
      key: "inactiveTeachers",
      title: "أساتذة غير نشطين",
      subtitle: "أكثر من 7 أيام بدون نشاط",
      icon: UserX,
      color: "text-red-600",
      bgIcon: "bg-red-100",
      cardBg: "bg-red-50 dark:bg-red-950 border-red-200",
      badgeVariant: "outline" as const,
      items: data.inactiveTeachers,
      renderItem: (item: AlertItem) => (
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background/50" data-testid={`alert-item-teacher-${item.id}`}>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{item.name}</p>
            {item.date && <p className="text-xs text-muted-foreground">آخر نشاط: {item.date}</p>}
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-xs" data-testid={`button-send-message-${item.id}`} onClick={() => setLocation(`/messages?userId=${item.id}`)}>
            إرسال رسالة
          </Button>
        </div>
      ),
    },
    {
      key: "upcomingExams",
      title: "امتحانات قادمة",
      subtitle: "خلال 3 أيام القادمة",
      icon: Calendar,
      color: "text-blue-600",
      bgIcon: "bg-blue-100",
      cardBg: "bg-blue-50 dark:bg-blue-950 border-blue-200",
      badgeVariant: "outline" as const,
      items: data.upcomingExams,
      renderItem: (item: AlertItem) => (
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background/50" data-testid={`alert-item-exam-${item.id}`}>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{item.examName || item.name}</p>
            {item.date && <p className="text-xs text-muted-foreground">التاريخ: {item.date}</p>}
            {item.subject && <p className="text-xs text-muted-foreground">المادة: {item.subject}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "lowGrades",
      title: "درجات منخفضة",
      subtitle: "أقل من 60 درجة",
      icon: TrendingDown,
      color: "text-yellow-600",
      bgIcon: "bg-yellow-100",
      cardBg: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200",
      badgeVariant: "outline" as const,
      items: data.lowGrades,
      renderItem: (item: AlertItem) => (
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background/50" data-testid={`alert-item-grade-${item.id}`}>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{item.name}</p>
            {item.grade !== undefined && <p className="text-xs text-muted-foreground">الدرجة: {item.grade}</p>}
            {item.subject && <p className="text-xs text-muted-foreground">المادة: {item.subject}</p>}
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-xs" data-testid={`button-contact-parent-${item.id}`} onClick={() => {
              if (item.parentPhone) {
                window.open(getWhatsAppUrl(item.parentPhone, `تنبيه: درجة الطالب ${item.name} منخفضة (${item.grade})`), "_blank");
              } else {
                toast({ title: "تنبيه", description: "لا يوجد رقم هاتف لولي الأمر", variant: "destructive" });
              }
            }}>
            تواصل مع ولي الأمر
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="loading-smart-alerts">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl" data-testid="smart-alerts-page">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-serif" data-testid="text-page-title">التنبيهات الذكية</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">مراقبة وتنبيهات تلقائية للنظام</p>
        </div>
        <Button variant="outline" onClick={fetchAlerts} data-testid="button-refresh-alerts">
          <Bell className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {summaryCards.map((card, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow" data-testid={`card-summary-${i}`}>
            <CardContent className="p-3 md:p-6 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">{card.title}</p>
                <h3 className="text-lg md:text-2xl font-bold" data-testid={`text-summary-value-${i}`}>{card.value}</h3>
              </div>
              <div className={`p-2 md:p-3 rounded-full ${card.bg} shrink-0`}>
                <card.icon className={`w-4 h-4 md:w-6 md:h-6 ${card.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalCount === 0 ? (
        <Card className="shadow-sm border-none" data-testid="empty-state-alerts">
          <CardContent className="p-8 text-center text-muted-foreground">
            <PartyPopper className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium" data-testid="text-empty-message">لا توجد تنبيهات! كل شيء يسير بشكل ممتاز</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sections.map((section) => {
            if (section.items.length === 0) return null;
            const SectionIcon = section.icon;
            return (
              <Card key={section.key} className={`shadow-sm border ${section.cardBg}`} data-testid={`card-section-${section.key}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <div className={`p-2 rounded-full ${section.bgIcon} shrink-0`}>
                      <SectionIcon className={`w-4 h-4 ${section.color}`} />
                    </div>
                    <span>{section.title}</span>
                    <Badge variant={section.badgeVariant} className="mr-auto" data-testid={`badge-count-${section.key}`}>
                      {section.items.length}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                </CardHeader>
                <CardContent className="space-y-2" data-testid={`list-${section.key}`}>
                  {section.items.map((item) => (
                    <div key={item.id}>
                      {section.renderItem(item)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
