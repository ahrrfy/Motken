import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function PrivacyPolicyPage() {
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-islamic-pattern p-4" dir="rtl">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif text-primary">
            سياسة الخصوصية وشروط الاستخدام
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            نظام مُتْقِن لإدارة حلقات القرآن الكريم
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[400px] rounded-lg border p-4 text-sm leading-relaxed">
            <div className="space-y-4">
              <h3 className="font-bold text-primary text-base">بسم الله الرحمن الرحيم</h3>

              <div>
                <h4 className="font-bold mb-1">المقدمة</h4>
                <p>
                  مرحباً بكم في نظام مُتْقِن لإدارة حلقات القرآن الكريم. هذا النظام مخصص لإدارة وتنظيم حلقات تحفيظ القرآن الكريم في الجوامع ومراكز التحفيظ. باستخدامك لهذا النظام فإنك توافق على الالتزام بالشروط والأحكام التالية.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-1">1. الغرض من النظام</h4>
                <p>
                  نظام مُتْقِن هو نظام وقفي لله تعالى، صُمم خصيصاً لخدمة كتاب الله الكريم من خلال تسهيل إدارة حلقات التحفيظ والمراجعة، ومتابعة تقدم الطلاب، وتنظيم العملية التعليمية بين الأساتذة والطلاب والمشرفين.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-1">2. جمع البيانات واستخدامها</h4>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>يتم جمع البيانات الشخصية (الاسم، رقم الهاتف، العنوان) لغرض إدارة الحسابات والتواصل فقط.</li>
                  <li>لا يتم مشاركة أي بيانات شخصية مع أطراف خارجية.</li>
                  <li>تُستخدم بيانات الموقع الجغرافي (إن تم السماح) فقط لحساب أوقات الصلاة.</li>
                  <li>الصور الشخصية تُستخدم فقط لبطاقات التعريف داخل النظام.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-1">3. حماية البيانات</h4>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>يتم تشفير كلمات المرور باستخدام خوارزميات تشفير قوية.</li>
                  <li>الجلسات محمية ومؤمنة بشكل كامل.</li>
                  <li>البيانات معزولة بين الجوامع والمراكز المختلفة لضمان الخصوصية.</li>
                  <li>يتم تسجيل جميع الأنشطة لأغراض الأمان والمراقبة.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-1">4. قواعد الاستخدام</h4>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>يجب استخدام النظام فقط للأغراض المحددة (إدارة حلقات القرآن الكريم).</li>
                  <li>يُمنع استخدام النظام لنشر أو تبادل أي محتوى مخالف للشريعة الإسلامية.</li>
                  <li>يُمنع منعاً باتاً استخدام ألفاظ بذيئة أو مسيئة أو تحريضية.</li>
                  <li>يُمنع نشر أي محتوى يروّج للتطرف أو الإرهاب أو الطائفية.</li>
                  <li>يُمنع استخدام النظام لأي أغراض تجارية أو دعائية.</li>
                  <li>يجب الحفاظ على سرية بيانات الدخول وعدم مشاركتها مع الغير.</li>
                  <li>يُمنع محاولة الوصول غير المصرح به إلى بيانات المستخدمين الآخرين.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-1">5. المحتوى المحظور</h4>
                <p>يقوم النظام تلقائياً بفلترة ومنع أي محتوى يحتوي على:</p>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>ألفاظ بذيئة أو نابية أو مسيئة.</li>
                  <li>عبارات تحريضية أو إرهابية أو طائفية.</li>
                  <li>محتوى مخالف للآداب العامة والأخلاق الإسلامية.</li>
                  <li>أي محتوى لا يتناسب مع الغرض الأساسي للنظام.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-1">6. صلاحيات الإدارة</h4>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>يحق لإدارة النظام تعليق أو حذف أي حساب يخالف شروط الاستخدام.</li>
                  <li>يحق لإدارة النظام حظر المستخدمين المخالفين بشكل دائم.</li>
                  <li>يتم تسجيل ومراقبة جميع الأنشطة داخل النظام.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-1">7. حقوق المستخدم</h4>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>لك الحق في الاطلاع على بياناتك الشخصية المسجلة في النظام.</li>
                  <li>لك الحق في طلب تعديل بياناتك الشخصية.</li>
                  <li>لك الحق في طلب حذف حسابك من خلال التواصل مع الإدارة.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-1">8. إخلاء المسؤولية</h4>
                <p>
                  النظام مقدم كخدمة وقفية مجانية لوجه الله تعالى. لا يتحمل مطورو النظام أي مسؤولية عن أي أضرار ناتجة عن سوء استخدام النظام أو انقطاع الخدمة.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-1">9. التعديلات على السياسة</h4>
                <p>
                  يحق لإدارة النظام تعديل هذه السياسة في أي وقت. سيتم إعلام المستخدمين بأي تغييرات جوهرية.
                </p>
              </div>

              <div className="pt-2 text-center text-muted-foreground text-xs">
                آخر تحديث: فبراير 2026
              </div>
            </div>
          </ScrollArea>

          <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3 border">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              data-testid="checkbox-agree-privacy"
            />
            <label htmlFor="agree" className="text-sm cursor-pointer leading-relaxed">
              لقد قرأت وفهمت سياسة الخصوصية وشروط الاستخدام، وأوافق على الالتزام بجميع الشروط والأحكام المذكورة أعلاه.
            </label>
          </div>

          <Button
            onClick={handleAccept}
            disabled={!agreed || submitting}
            className="w-full text-base py-5"
            data-testid="button-accept-privacy"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin ml-2" />
            ) : (
              <Shield className="w-5 h-5 ml-2" />
            )}
            أوافق على سياسة الخصوصية وشروط الاستخدام
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
