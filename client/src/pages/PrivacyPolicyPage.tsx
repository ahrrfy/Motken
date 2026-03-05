import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Loader2, LogOut, AlertTriangle, BookOpen, Lock, Eye, Scale, UserCheck, Gavel, FileWarning, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const sections = [
  {
    icon: BookOpen,
    title: "المقدمة",
    color: "text-primary",
    bg: "bg-primary/5",
    content: "مرحباً بكم في نظام مُتْقِن لإدارة حلقات القرآن الكريم. هذا النظام وقفي مجاني لوجه الله تعالى، مخصص لخدمة كتاب الله الكريم في الجوامع ومراكز التحفيظ. باستخدامك لهذا النظام فإنك تقرّ بقراءة هذه السياسة والموافقة عليها.",
  },
  {
    icon: Shield,
    title: "1. الغرض من النظام",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    content: "نظام مُتْقِن هو نظام وقفي لله تعالى، صُمِّم خصيصاً لخدمة كتاب الله الكريم من خلال تسهيل إدارة حلقات التحفيظ والمراجعة، ومتابعة تقدم الطلاب، وتنظيم العملية التعليمية بين الأساتذة والطلاب والمشرفين وأولياء الأمور.",
  },
  {
    icon: Eye,
    title: "2. البيانات التي نجمعها",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    subtitle: "يجمع النظام الأنواع التالية من البيانات لتشغيل الخدمة:",
    items: [
      "البيانات الشخصية: الاسم، رقم الهاتف، العنوان، العمر، الجنس، الصورة الشخصية، معرّف تيليغرام",
      "بيانات ولي الأمر: رقم هاتف ولي الأمر، والروابط العائلية (علاقة الأخوة وغيرها)",
      "بيانات أكاديمية: الواجبات، الحضور والغياب، الدرجات، النقاط، الشارات، الشهادات، تقدم حفظ القرآن الكريم",
      "بيانات تقنية: عنوان IP، نوع المتصفح، نظام التشغيل، نوع الجهاز — لأغراض الأمان ومنع الاختراق",
      "بصمة الجهاز: تُستخدم فقط في حالات الحظر الأمني للمخالفين",
      "سجلات النشاط: تُحفظ لمدة 90 يوماً لأغراض الأمان ومراجعة الإدارة",
    ],
  },
  {
    icon: Lock,
    title: "3. البيانات الحساسة",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    subtitle: "قد يحتوي النظام على بيانات تصنف حساسة تستوجب عناية خاصة:",
    items: [
      "بيانات ذوي الاحتياجات الخاصة: تُستخدم فقط لتقديم دعم تعليمي مناسب",
      "بيانات الأيتام: تُستخدم فقط لتقديم الرعاية والمتابعة المناسبة",
      "لا تُشارك هذه البيانات الحساسة مع أي جهة خارجية تحت أي ظرف",
      "الوصول إليها مقيّد بالمشرفين والمسؤولين المعنيين داخل كل مسجد فقط",
    ],
  },
  {
    icon: Lock,
    title: "4. حماية البيانات",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    items: [
      "تشفير كلمات المرور بخوارزمية scrypt مع salt عشوائي — لا يمكن استرجاعها حتى للإدارة",
      "الجلسات محمية بمفتاح تشفير ثابت وآمن، ومحدودة بجلستين نشطتين في آن واحد",
      "عزل كامل للبيانات بين المساجد — لا يمكن لمسجد الاطلاع على بيانات مسجد آخر",
      "حماية CSRF وHTTP Security Headers على جميع طلبات API",
      "تقييد محاولات تسجيل الدخول: 5 محاولات كحد أقصى قبل الحظر المؤقت",
    ],
  },
  {
    icon: Scale,
    title: "5. كيف نستخدم البيانات",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    items: [
      "إدارة حسابات الطلاب والمعلمين والمشرفين داخل النظام",
      "إرسال تقارير دورية لأولياء الأمور عبر روابط واتساب (بإذن المعلم فقط)",
      "إرسال تنبيهات تلقائية عند الغياب المتكرر للمعلم المسؤول",
      "إنشاء شارات ونقاط تحفيزية تلقائياً عند إتمام الواجبات وحفظ السور",
      "إنشاء روابط تقارير مؤقتة لأولياء الأمور (تنتهي صلاحيتها تلقائياً)",
      "لا تُستخدم البيانات لأي أغراض إعلانية أو تجارية أو دراسات خارجية",
    ],
  },
  {
    icon: Scale,
    title: "6. قواعد الاستخدام",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    items: [
      "يجب استخدام النظام فقط لإدارة حلقات تحفيظ القرآن الكريم",
      "يُمنع استخدام النظام لنشر أي محتوى مخالف للشريعة الإسلامية",
      "يُمنع منعاً باتاً استخدام ألفاظ بذيئة أو مسيئة أو تحريضية",
      "يُمنع نشر أي محتوى يروّج للتطرف أو الإرهاب أو الطائفية",
      "يجب الحفاظ على سرية بيانات الدخول وعدم مشاركتها",
      "يُمنع محاولة الوصول غير المصرح به إلى بيانات الآخرين",
    ],
  },
  {
    icon: FileWarning,
    title: "7. حماية بيانات الأطفال والقاصرين",
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-950/30",
    subtitle: "بما أن النظام يخدم طلاباً من الأطفال، نلتزم بالتالي:",
    items: [
      "لا تُجمع بيانات الطلاب القاصرين إلا بموافقة ولي الأمر المسجّل في النظام",
      "حسابات الطلاب تُنشأ فقط من قِبل المعلم أو المشرف المعتمد، وليس ذاتياً",
      "بيانات الطلاب لا تُشارك مع أي جهة خارجية تحت أي مسمى",
      "أولياء الأمور يملكون صلاحية الاطلاع على بيانات أبنائهم عبر رابط التقرير",
      "يحق لولي الأمر طلب حذف بيانات ابنه بالتواصل مع إدارة المسجد",
    ],
  },
  {
    icon: Gavel,
    title: "8. صلاحيات الإدارة والمراقبة",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    items: [
      "يحق لإدارة النظام تعليق أو حذف أي حساب يخالف شروط الاستخدام",
      "يتم تشغيل وظائف تلقائية دورية لمراجعة صحة البيانات وتنظيفها",
      "تُرسل تنبيهات تلقائية للمشرفين عند اكتشاف أنماط غياب متكررة",
      "يتم حذف سجلات النشاط القديمة (أكثر من 90 يوماً) تلقائياً",
      "يتم حذف الإشعارات المقروءة (أكثر من 30 يوماً) تلقائياً",
    ],
  },
  {
    icon: UserCheck,
    title: "9. حقوق المستخدم",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    items: [
      "حق الاطلاع: يمكنك الاطلاع على بياناتك الشخصية عبر صفحة الإعدادات",
      "حق التعديل: يمكنك تعديل بياناتك في أي وقت عبر صفحة الملف الشخصي",
      "حق الحذف: يمكنك طلب حذف حسابك بالتواصل مع مشرف مسجدك/مركزك",
      "حق الاعتراض: يمكنك الاعتراض على أي قرار إداري بالتواصل مع إدارة النظام",
      "حق نقل البيانات: يمكن تصدير بياناتك عبر ميزة النسخ الاحتياطي (للمشرفين)",
    ],
  },
  {
    icon: AlertTriangle,
    title: "10. مدة الاحتفاظ بالبيانات",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    items: [
      "بيانات الحساب: تُحفظ طوال فترة نشاط الحساب",
      "سجلات النشاط: تُحذف تلقائياً بعد 90 يوماً",
      "الإشعارات المقروءة: تُحذف تلقائياً بعد 30 يوماً",
      "تقارير أولياء الأمور المؤقتة: تنتهي صلاحيتها وتُحذف تلقائياً",
      "عند حذف الحساب: تُحذف جميع البيانات المرتبطة به نهائياً",
    ],
  },
  {
    icon: AlertTriangle,
    title: "11. إخلاء المسؤولية",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    content: "النظام مقدم كخدمة وقفية مجانية لوجه الله تعالى. لا يتحمل مطورو النظام أي مسؤولية عن أضرار ناتجة عن سوء الاستخدام أو انقطاع الخدمة أو فقدان البيانات بسبب أعطال خارجة عن السيطرة. يتحمل مشرف كل مسجد المسؤولية الكاملة عن صحة البيانات المدخلة.",
  },
  {
    icon: RefreshCw,
    title: "12. تحديثات السياسة",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    content: "يحق لإدارة النظام تعديل هذه السياسة عند الحاجة. سيتم إعلام المستخدمين بالتغييرات الجوهرية عبر إشعار داخل النظام، وستُطلب موافقة جديدة إذا كانت التعديلات تمس حقوق المستخدمين بشكل جوهري.",
  },
];

export default function PrivacyPolicyPage() {
  const { refreshUser, logout } = useAuth();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRefuseConfirm, setShowRefuseConfirm] = useState(false);
  const [refusing, setRefusing] = useState(false);

  const handleAccept = async () => {
    if (!agreed) {
      toast({ title: "يرجى الموافقة على سياسة الخصوصية أولاً", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/privacy-policy/accept", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({
          title: "تم بنجاح",
          description: "تم قبول سياسة الخصوصية",
          className: "bg-green-50 border-green-200 text-green-800",
        });
        await refreshUser();
      } else {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefuse = async () => {
    setRefusing(true);
    try {
      toast({
        title: "تم رفض سياسة الخصوصية",
        description: "سيتم تسجيل خروجك من النظام",
        variant: "destructive",
      });
      await logout();
    } catch {
      toast({ title: "خطأ في تسجيل الخروج", variant: "destructive" });
    } finally {
      setRefusing(false);
      setShowRefuseConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-islamic-pattern" dir="rtl">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold text-primary leading-tight truncate">
              سياسة الخصوصية وشروط الاستخدام
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              نظام مُتْقِن لإدارة حلقات القرآن الكريم
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-52 sm:pb-48">
        <div className="text-center mb-5 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-primary font-serif">بسم الله الرحمن الرحيم</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            يجب الموافقة على الشروط التالية للاستمرار في استخدام النظام
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {sections.map((section, idx) => (
            <div
              key={idx}
              className={`rounded-xl border ${section.bg} p-3 sm:p-4 transition-colors`}
            >
              <div className="flex items-start gap-2.5 sm:gap-3 mb-2">
                <div className={`mt-0.5 shrink-0 ${section.color}`}>
                  <section.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h3 className={`font-bold text-sm sm:text-base ${section.color}`}>
                  {section.title}
                </h3>
              </div>
              <div className="mr-6 sm:mr-8">
                {section.subtitle && (
                  <p className="text-xs sm:text-sm text-foreground/80 mb-2">{section.subtitle}</p>
                )}
                {section.content && (
                  <p className="text-xs sm:text-sm leading-relaxed text-foreground/80">
                    {section.content}
                  </p>
                )}
                {section.items && (
                  <ul className="space-y-1.5 sm:space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/80">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${section.color} bg-current opacity-60`} />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-[10px] sm:text-xs text-muted-foreground mt-4">
          آخر تحديث: مارس 2026 — الإصدار 2.0
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3">
          <label
            htmlFor="agree"
            className="flex items-start gap-3 bg-muted/50 rounded-lg p-2.5 sm:p-3 border cursor-pointer hover:bg-muted/70 transition-colors"
          >
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
              data-testid="checkbox-agree-privacy"
            />
            <span className="text-xs sm:text-sm leading-relaxed select-none">
              لقد قرأت وفهمت سياسة الخصوصية وشروط الاستخدام، وأوافق على الالتزام بجميع الشروط والأحكام المذكورة أعلاه.
            </span>
          </label>

          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={handleAccept}
              disabled={!agreed || submitting}
              className="flex-1 text-sm sm:text-base h-10 sm:h-12"
              data-testid="button-accept-privacy"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin ml-2" />
              ) : (
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              )}
              أوافق وأستمر
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRefuseConfirm(true)}
              disabled={submitting || refusing}
              className="h-10 sm:h-12 px-4 sm:px-6 text-sm sm:text-base"
              data-testid="button-refuse-privacy"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">أرفض</span>
              <span className="sm:hidden">رفض</span>
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showRefuseConfirm} onOpenChange={setShowRefuseConfirm}>
        <AlertDialogContent dir="rtl" className="max-w-[90vw] sm:max-w-md rounded-xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 mx-auto bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-center text-base sm:text-lg">
              تأكيد رفض سياسة الخصوصية
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm sm:text-base leading-relaxed">
              في حال رفض سياسة الخصوصية، سيتم تسجيل خروجك فوراً ولن تتمكن من استخدام النظام حتى تقبل السياسة عند تسجيل الدخول مجدداً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            <AlertDialogCancel className="w-full sm:w-auto" data-testid="button-cancel-refuse">
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefuse}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              disabled={refusing}
              data-testid="button-confirm-refuse"
            >
              {refusing ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <LogOut className="w-4 h-4 ml-2" />
              )}
              أرفض وسجّل خروجي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
