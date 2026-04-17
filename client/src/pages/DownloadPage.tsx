import { useEffect, useState } from "react";
import { Download, Shield, Smartphone, CheckCircle2 } from "lucide-react";

interface VersionInfo {
  latestVersion: string;
  downloadUrl: string;
}

export default function DownloadPage() {
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    fetch("/api/app/version-check?platform=android&version=0.0.0", { credentials: "omit" })
      .then(r => r.json())
      .then((d) => setInfo({ latestVersion: d.latestVersion, downloadUrl: d.downloadUrl }))
      .catch(() => setInfo({ latestVersion: "1.1.0", downloadUrl: "/api/app/download" }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex w-20 h-20 bg-emerald-700 text-white rounded-2xl items-center justify-center mb-4 shadow-lg">
            <Smartphone className="w-10 h-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            تنزيل تطبيق سِرَاجُ الْقُرْآنِ
          </h1>
          <p className="text-gray-600">
            نظام إدارة حلقات القرآن الكريم — للأندرويد
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
          {info && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">الإصدار الحالي</div>
              <div className="text-2xl font-bold text-emerald-700 font-mono">
                v{info.latestVersion}
              </div>
            </div>
          )}

          <a
            href={info?.downloadUrl || "/api/app/download"}
            className="w-full inline-flex items-center justify-center gap-3 bg-emerald-700 hover:bg-emerald-800 text-white text-lg font-bold py-4 px-6 rounded-xl transition-colors shadow-lg"
          >
            <Download className="w-6 h-6" />
            تنزيل APK الآن
          </a>

          <div className="border-t pt-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              تعليمات التثبيت:
            </h3>
            <ol className="space-y-2 text-gray-700 text-sm pr-5 list-decimal">
              <li>اضغط على زر "تنزيل APK" بالأعلى.</li>
              <li>افتح الملف بعد اكتمال التنزيل.</li>
              <li>
                إذا ظهر تحذير "مصادر غير معروفة" — اذهب إلى
                <span className="font-bold"> الإعدادات ← الأمان</span> وفعّل
                السماح بالتثبيت من هذا المصدر.
              </li>
              <li>اضغط "تثبيت" واتبع التعليمات.</li>
              <li>عند اكتمال التثبيت، افتح التطبيق وسجّل الدخول.</li>
            </ol>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-800">
              <div className="font-bold mb-1">آمن وموثوق</div>
              <div className="text-xs text-gray-600 leading-relaxed">
                التطبيق موقّع رقمياً ويخضع لمراجعة أمنية دورية. البيانات مشفرة
                بالكامل ولا تُشارك مع أي طرف ثالث.
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} سِرَاجُ الْقُرْآنِ — وقف مجاني لخدمة كتاب الله
        </p>
      </div>
    </div>
  );
}
