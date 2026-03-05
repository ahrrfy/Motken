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
    content: "مرحباً بكم في نظام مُتْقِن لإدارة حلقات القرآن الكريم. هذا النظام مخصص لإدارة وتنظيم حلقات تحفيظ القرآن الكريم في الجوامع ومراكز التحفيظ. باستخدامك لهذا النظام فإنك توافق على الالتزام بالشروط والأحكام التالية.",
  },
  {
    icon: Shield,
    title: "1. الغرض من النظام",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    content: "نظام مُتْقِن هو نظام وقفي لله تعالى، صُمم خصيصاً لخدمة كتاب الله الكريم من خلال تسهيل إدارة حلقات التحفيظ والمراجعة، ومتابعة تقدم الطلاب، وتنظيم العملية التعليمية بين الأساتذة والطلاب والمشرفين.",
  },
  {
    icon: Eye,
    title: "2. جمع البيانات واستخدامها",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    items: [
      "يتم جمع البيانات الشخصية (الاسم، رقم الهاتف، العنوان) لغرض إدارة الحسابات والتواصل فقط",
      "لا يتم مشاركة أي بيانات شخصية مع أطراف خارجية",
      "تُستخدم بيانات الموقع الجغرافي (إن تم السماح) فقط لحساب أوقات الصلاة",
      "الصور الشخصية تُستخدم فقط لبطاقات التعريف داخل النظام",
    ],
  },
  {
    icon: Lock,
    title: "3. حماية البيانات",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    items: [
      "يتم تشفير كلمات المرور باستخدام خوارزميات تشفير قوية",
      "الجلسات محمية ومؤمنة بشكل كامل",
      "البيانات معزولة بين الجوامع والمراكز المختلفة لضمان الخصوصية",
      "يتم تسجيل جميع الأنشطة لأغراض الأمان والمراقبة",
    ],
  },
  {
    icon: Scale,
    title: "4. قواعد الاستخدام",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    items: [
      "يجب استخدام النظام فقط للأغراض المحددة (إدارة حلقات القرآن الكريم)",
      "يُمنع استخدام النظام لنشر أو تبادل أي محتوى مخالف للشريعة الإسلامية",
      "يُمنع منعاً باتاً استخدام ألفاظ بذيئة أو مسيئة أو تحريضية",
      "يُمنع نشر أي محتوى يروّج للتطرف أو الإرهاب أو الطائفية",
      "يُمنع استخدام النظام لأي أغراض تجارية أو دعائية",
      "يجب الحفاظ على سرية بيانات الدخول وعدم مشاركتها مع الغير",
      "يُمنع محاولة الوصول غير المصرح به إلى بيانات المستخدمين الآخرين",
    ],
  },
  {
    icon: FileWarning,
    title: "5. المحتوى المحظور",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    subtitle: "يقوم النظام تلقائياً بفلترة ومنع أي محتوى يحتوي على:",
    items: [
      "ألفاظ بذيئة أو نابية أو مسيئة",
      "عبارات تحريضية أو إرهابية أو طائفية",
      "محتوى مخالف للآداب العامة والأخلاق الإسلامية",
      "أي محتوى لا يتناسب مع الغرض الأساسي للنظام",
    ],
  },
  {
    icon: Gavel,
    title: "6. صلاحيات الإدارة",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    items: [
      "يحق لإدارة النظام تعليق أو حذف أي حساب يخالف شروط الاستخدام",
      "يحق لإدارة النظام حظر المستخدمين المخالفين بشكل دائم",
      "يتم تسجيل ومراقبة جميع الأنشطة داخل النظام",
    ],
  },
  {
    icon: UserCheck,
    title: "7. حقوق المستخدم",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    items: [
      "لك الحق في الاطلاع على بياناتك الشخصية المسجلة في النظام",
      "لك الحق في طلب تعديل بياناتك الشخصية",
      "لك الحق في طلب حذف حسابك من خلال التواصل مع الإدارة",
    ],
  },
  {
    icon: AlertTriangle,
    title: "8. إخلاء المسؤولية",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    content: "النظام مقدم كخدمة وقفية مجانية لوجه الله تعالى. لا يتحمل مطورو النظام أي مسؤولية عن أي أضرار ناتجة عن سوء استخدام النظام أو انقطاع الخدمة.",
  },
  {
    icon: RefreshCw,
    title: "9. التعديلات على السياسة",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    content: "يحق لإدارة النظام تعديل هذه السياسة في أي وقت. سيتم إعلام المستخدمين بأي تغييرات جوهرية.",
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
          آخر تحديث: فبراير 2026
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
