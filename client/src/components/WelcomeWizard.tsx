import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Users, ClipboardCheck, GraduationCap, MessageSquare,
  BarChart3, Star, ChevronLeft, ChevronRight, Rocket, CheckCircle2
} from "lucide-react";

interface WelcomeWizardProps {
  role: string;
  userName: string;
  onComplete: () => void;
}

const roleSteps: Record<string, { icon: any; title: string; description: string }[]> = {
  teacher: [
    { icon: Users, title: "إضافة الطلاب", description: "ابدأ بإضافة طلابك من صفحة الطلاب. يمكنك إدخال بياناتهم الأساسية ورقم هاتف ولي الأمر." },
    { icon: ClipboardCheck, title: "تسجيل الحضور", description: "سجّل حضور طلابك يومياً. النظام يرسل تنبيهات تلقائية عند الغياب المتكرر." },
    { icon: BookOpen, title: "إنشاء الواجبات", description: "أنشئ واجبات حفظ ومراجعة لكل طالب. حدد السورة والآيات والموعد المطلوب." },
    { icon: Star, title: "التقييم والمتابعة", description: "قيّم أداء طلابك وتابع تقدمهم. النظام يحسب النقاط والمستويات تلقائياً." },
  ],
  supervisor: [
    { icon: Users, title: "إدارة الأساتذة", description: "أضف الأساتذة وعيّن لهم الطلاب. يمكنك متابعة أدائهم من صفحة أنشطة الأساتذة." },
    { icon: GraduationCap, title: "متابعة التعليم", description: "تابع مستوى الطلاب وحضورهم ونتائجهم. راجع تقارير الأداء الأسبوعية." },
    { icon: MessageSquare, title: "التواصل", description: "تواصل مع الأساتذة وأولياء الأمور عبر الرسائل الداخلية وتقارير الواتساب." },
    { icon: BarChart3, title: "التقارير", description: "اطلع على التقارير الشاملة والإحصائيات. صدّر البيانات إلى Excel عند الحاجة." },
  ],
  student: [
    { icon: BookOpen, title: "واجباتك", description: "تابع واجبات الحفظ والمراجعة المطلوبة منك. اطلع على الملاحظات والدرجات." },
    { icon: Star, title: "نقاطك وإنجازاتك", description: "تابع نقاطك ومستواك. اجمع الأوسمة وتنافس مع زملائك." },
    { icon: ClipboardCheck, title: "تقدمك في الحفظ", description: "شاهد شجرة حفظك وتقدمك في القرآن الكريم. النظام يتتبع كل ما حفظته." },
  ],
  admin: [
    { icon: Users, title: "إنشاء المساجد", description: "ابدأ بإنشاء المساجد وتعيين المشرفين لكل مسجد." },
    { icon: BarChart3, title: "لوحة التحكم", description: "تابع إحصائيات جميع المساجد والمستخدمين من لوحة التحكم الرئيسية." },
    { icon: GraduationCap, title: "إدارة النظام", description: "تحكم في الميزات والإعدادات والأمان والنسخ الاحتياطي." },
    { icon: MessageSquare, title: "التواصل", description: "أرسل إشعارات جماعية وتواصل مع المشرفين عبر نظام الرسائل." },
  ],
};

export default function WelcomeWizard({ role, userName, onComplete }: WelcomeWizardProps) {
  const [step, setStep] = useState(0);
  const steps = roleSteps[role] || roleSteps.teacher;
  const totalSteps = steps.length + 1;
  const isIntro = step === 0;
  const isLastStep = step === totalSteps - 1;
  const currentStep = isIntro ? null : steps[step - 1];

  const handleComplete = () => {
    localStorage.setItem("mutqin_onboarding_done", "true");
    onComplete();
  };

  const roleNames: Record<string, string> = {
    admin: "المدير",
    supervisor: "المشرف",
    teacher: "الأستاذ",
    student: "الطالب",
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden" dir="rtl">
        <div className="bg-gradient-to-bl from-primary/10 via-background to-primary/5 p-6">
          {isIntro ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Rocket className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold" data-testid="text-welcome-title">
                أهلاً بك يا {userName}!
              </h2>
              <Badge variant="outline" className="text-sm px-3 py-1">
                {roleNames[role] || role}
              </Badge>
              <p className="text-muted-foreground leading-relaxed">
                مرحباً بك في نظام <strong>مُتْقِن</strong> لإدارة حلقات تحفيظ القرآن الكريم.
                دعنا نعرّفك على أهم الخطوات للبدء.
              </p>
            </div>
          ) : currentStep ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <currentStep.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold" data-testid={`text-step-title-${step}`}>
                {currentStep.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed px-4">
                {currentStep.description}
              </p>
              <div className="flex justify-center gap-1.5 pt-2">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === step - 1 ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-4 flex items-center justify-between border-t">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} data-testid="button-wizard-back">
              <ChevronRight className="w-4 h-4 ml-1" />
              السابق
            </Button>
          ) : (
            <div />
          )}

          {isLastStep ? (
            <Button onClick={handleComplete} data-testid="button-wizard-start" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              ابدأ الاستخدام
            </Button>
          ) : (
            <Button onClick={() => setStep(step + 1)} data-testid="button-wizard-next">
              {isIntro ? "هيا نبدأ" : "التالي"}
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          )}
        </div>

        {!isIntro && (
          <div className="px-4 pb-3 text-center">
            <button
              onClick={handleComplete}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-wizard-skip"
            >
              تخطي الشرح
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
