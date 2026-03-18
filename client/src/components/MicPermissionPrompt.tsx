import { useState, useEffect } from "react";
import { Mic, CheckCircle2, AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const STORAGE_KEY = "mic_permission_granted";

function detectBrowser(): string {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  if (/CriOS/i.test(ua)) return "chrome-ios";
  if (/Safari/i.test(ua) && /iPhone|iPad|iPod/i.test(ua) && !/CriOS/i.test(ua)) return "safari-ios";
  if (isAndroid && /Chrome/i.test(ua)) return "chrome-android";
  if (isAndroid) return "android-other";
  return "desktop";
}

function getDeniedInstructions(browser: string): { steps: string[]; extra?: string } {
  switch (browser) {
    case "chrome-android":
      return {
        steps: [
          "اضغط على أيقونة القفل 🔒 في شريط العنوان",
          "اضغط \"الأذونات\" ثم \"الميكروفون\"",
          "اختر \"سماح\" ثم أعد تحميل الصفحة",
        ],
        extra: "إعدادات الهاتف ← التطبيقات ← Chrome ← الأذونات ← الميكروفون ← سماح"
      };
    case "android-other":
      return {
        steps: [
          "اضغط القفل أو النقاط الثلاث ⋮ في المتصفح",
          "ابحث عن أذونات الموقع وفعّل الميكروفون",
          "أعد تحميل الصفحة",
        ],
        extra: "إعدادات الهاتف ← التطبيقات ← المتصفح ← الأذونات ← الميكروفون"
      };
    case "safari-ios":
      return {
        steps: [
          "الإعدادات ← Safari ← الميكروفون",
          "فعّل السماح لهذا الموقع",
          "ارجع وأعد تحميل الصفحة",
        ]
      };
    case "chrome-ios":
      return {
        steps: [
          "الإعدادات ← Chrome ← الميكروفون ← سماح",
          "ارجع وأعد تحميل الصفحة",
        ]
      };
    default:
      return {
        steps: [
          "اضغط على أيقونة القفل 🔒 بجانب عنوان الموقع",
          "اختر \"سماح\" للميكروفون",
          "أعد تحميل الصفحة",
        ]
      };
  }
}

export default function MicPermissionPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"asking" | "requesting" | "granted" | "denied">("asking");
  const browser = detectBrowser();

  useEffect(() => {
    if (!user) return;
    if (!["student", "teacher"].includes(user.role)) return;
    if (!navigator.mediaDevices?.getUserMedia) return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;

    const check = async () => {
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
          if (result.state === "granted") {
            localStorage.setItem(STORAGE_KEY, "true");
            return;
          }
          if (result.state === "denied") {
            setStatus("denied");
            setShow(true);
            return;
          }
        } catch {}
      }
      setShow(true);
    };

    const timer = setTimeout(check, 1500);
    return () => clearTimeout(timer);
  }, [user]);

  const requestPermission = async () => {
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setStatus("granted");
      localStorage.setItem(STORAGE_KEY, "true");
      setTimeout(() => setShow(false), 2000);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("denied");
      } else {
        setShow(false);
      }
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "skipped");
  };

  if (!show) return null;

  const instructions = getDeniedInstructions(browser);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        
        {status === "granted" ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <p className="font-bold text-green-800 text-lg">ممتاز! المايكروفون جاهز ✓</p>
            <p className="text-sm text-green-600 mt-1">يمكنك الآن تسجيل التسميع بسهولة</p>
          </div>
        ) : status === "denied" ? (
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <p className="font-bold text-gray-800">المايكروفون محظور</p>
              </div>
              <button onClick={dismiss} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              لتسجيل التسميع الصوتي يجب السماح بالمايكروفون. اتبع هذه الخطوات:
            </p>
            <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-200">
              <ol className="text-sm text-amber-800 space-y-1.5 list-decimal mr-4">
                {instructions.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              {instructions.extra && (
                <p className="text-xs text-amber-600 mt-2 pt-2 border-t border-amber-200">
                  💡 {instructions.extra}
                </p>
              )}
            </div>
            <Button
              className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4" />
              إعادة تحميل الصفحة بعد السماح
            </Button>
          </div>
        ) : (
          <div className="p-5">
            <button onClick={dismiss} className="absolute top-3 left-3 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mic className="w-8 h-8 text-violet-600" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-1">السماح بالمايكروفون</h3>
              <p className="text-sm text-gray-500">
                يحتاج التطبيق إذن المايكروفون لتسجيل التسميع الصوتي وإرساله للمعلم
              </p>
            </div>

            <div className="bg-violet-50 rounded-xl p-3 mb-4 text-xs text-violet-700 border border-violet-200">
              <p className="font-semibold mb-1">📋 عند ظهور نافذة المتصفح:</p>
              <p>اضغط <strong>"سماح" أو "Allow"</strong> للموافقة على استخدام المايكروفون</p>
            </div>

            <Button
              className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white h-12 text-base"
              onClick={requestPermission}
              disabled={status === "requesting"}
            >
              <Mic className="w-5 h-5" />
              {status === "requesting" ? "جاري طلب الإذن..." : "السماح بالمايكروفون"}
            </Button>
            <button
              onClick={dismiss}
              className="w-full text-center text-xs text-gray-400 mt-2 py-1 hover:text-gray-600"
            >
              تخطي الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
