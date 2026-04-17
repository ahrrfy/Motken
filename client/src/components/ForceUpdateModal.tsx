import { useEffect, useState } from "react";
import { AlertCircle, Download, RefreshCw } from "lucide-react";

interface ForceUpdateModalProps {
  message: string;
  downloadUrl: string;
  minVersion: string;
}

export default function ForceUpdateModal({ message, downloadUrl, minVersion }: ForceUpdateModalProps) {
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCanRetry(true), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-l from-emerald-700 to-emerald-600 text-white p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold">تحديث إلزامي</h2>
          <p className="text-sm opacity-90 mt-1">سِرَاجُ الْقُرْآنِ</p>
        </div>

        <div className="p-6 space-y-4 text-center">
          <p className="text-gray-800 leading-relaxed whitespace-pre-line">
            {message}
          </p>
          <p className="text-xs text-muted-foreground">
            الحد الأدنى المطلوب: <span className="font-mono font-bold">{minVersion}</span>
          </p>

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener"
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
          >
            <Download className="w-5 h-5" />
            تنزيل النسخة الجديدة
          </a>

          {canRetry && (
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-primary text-sm py-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              حدّثت؟ أعد المحاولة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
