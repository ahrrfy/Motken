import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldCheck, Zap, Wrench, BookOpen } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  type: "feature" | "improvement" | "fix" | "security";
  title: string;
  items: string[];
}

const typeConfig = {
  feature: { label: "ميزة جديدة", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: Sparkles },
  improvement: { label: "تحسين", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Zap },
  fix: { label: "إصلاح", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", icon: Wrench },
  security: { label: "أمان", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: ShieldCheck },
};

const changelog: ChangelogEntry[] = [
  {
    version: "2.8",
    date: "2026/03/14",
    type: "feature",
    title: "شاشة ترحيب وسجل التغييرات",
    items: [
      "شاشة ترحيب تفاعلية للمستخدمين الجدد تشرح الخطوات الأساسية حسب الدور",
      "صفحة سجل التغييرات لعرض آخر التحديثات",
      "بيانات أولية لأحكام التجويد والآيات المتشابهة",
    ],
  },
  {
    version: "2.7",
    date: "2026/03/14",
    type: "improvement",
    title: "تحسينات الأداء والتحديثات",
    items: [
      "تحسين سرعة تحميل لوحة العائلة (استعلامات متوازية)",
      "ضمان وصول التحديثات فوراً لجميع المستخدمين",
      "رفع إصدار الكاش لتحديث المتصفحات القديمة تلقائياً",
      "إضافة رؤوس no-cache لصفحة HTML الرئيسية وService Worker",
    ],
  },
  {
    version: "2.6",
    date: "2026/03/13",
    type: "feature",
    title: "أدوات التحليل والتواصل",
    items: [
      "تبويب أداء الأساتذة — عرض إحصائيات تفصيلية لكل أستاذ",
      "تبويب نقاط الضعف الجماعية — تحليل السور ذات الدرجات المنخفضة",
      "سجل التواصل مع أولياء الأمور (هاتف، واتساب، رسالة، شخصياً)",
      "إدارة قوالب الرسائل (إنشاء وحذف) للمشرفين والمدراء",
      "زر تصدير Excel في صفحتي الحضور والواجبات",
    ],
  },
  {
    version: "2.5",
    date: "2026/03/10",
    type: "feature",
    title: "نظام التسميع الصوتي",
    items: [
      "تسجيل تلاوة صوتية للطالب (10 دقائق كحد أقصى)",
      "الأستاذ يستمع بسرعات مختلفة (0.5x - 2x)",
      "حذف الملف الصوتي تلقائياً بعد 5 دقائق من التقييم",
    ],
  },
  {
    version: "2.4",
    date: "2026/03/07",
    type: "feature",
    title: "نظام التسجيل والتزكية",
    items: [
      "تسجيل مساجد جديدة مع موافقة المدير",
      "نظام التزكية — مشرف حالي يزكي مسجداً جديداً",
      "لوحة تحكم لكل مسجد مع إحصائيات مفصلة",
      "نظام المراسلة بين المدير والمشرفين",
    ],
  },
  {
    version: "2.3",
    date: "2026/03/04",
    type: "improvement",
    title: "تحسينات الذكاء والأتمتة",
    items: [
      "نقاط تلقائية على الحضور والتقييم والانتظام",
      "اقتراح الواجب التالي تلقائياً بناءً على تاريخ الطالب",
      "إنشاء واجب مراجعة تلقائي عند الدرجة المنخفضة",
      "ملخص يومي ذكي وقياس صحة المسجد",
    ],
  },
  {
    version: "2.2",
    date: "2026/03/01",
    type: "security",
    title: "تعزيزات أمنية شاملة",
    items: [
      "فحص أمني معمّق وإصلاح جميع الثغرات",
      "حماية من XSS وCSRF وحقن SQL",
      "تحديد معدل الطلبات وحظر IP المشبوه",
      "تشفير كلمات المرور بخوارزمية Scrypt",
    ],
  },
  {
    version: "2.1",
    date: "2026/02/25",
    type: "feature",
    title: "المحتوى التعليمي والمكتبة",
    items: [
      "أحكام التجويد مع أمثلة ومراجع قرآنية",
      "الآيات المتشابهة مع شرح الفروقات",
      "المكتبة الإسلامية مع أكثر من 50 كتاباً",
      "تتبع تقدم الحفظ بشجرة بصرية تفاعلية",
    ],
  },
  {
    version: "2.0",
    date: "2026/02/20",
    type: "feature",
    title: "الإطلاق الرئيسي",
    items: [
      "نظام متعدد المساجد مع عزل كامل للبيانات",
      "أربعة أدوار: مدير، مشرف، أستاذ، طالب",
      "إدارة الطلاب والحضور والواجبات والامتحانات",
      "نظام النقاط والأوسمة والمسابقات",
      "تصميم كامل بالعربية (RTL) مع وضع داكن",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="container mx-auto p-4 max-w-3xl" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-changelog-title">سجل التغييرات</h1>
      </div>
      <p className="text-muted-foreground mb-6">آخر التحديثات والتحسينات على النظام</p>

      <div className="space-y-4">
        {changelog.map((entry, idx) => {
          const config = typeConfig[entry.type];
          const Icon = config.icon;
          return (
            <Card key={idx} data-testid={`card-changelog-${idx}`} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{entry.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">v{entry.version}</Badge>
                    <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-1.5 shrink-0">●</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
