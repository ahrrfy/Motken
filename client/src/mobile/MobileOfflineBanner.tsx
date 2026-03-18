import { useOnlineStatus } from "@/hooks/use-online";
import { WifiOff, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function MobileOfflineBanner() {
  const isOnline = useOnlineStatus();
  const [retrying, setRetrying] = useState(false);

  if (isOnline) return null;

  const handleRetry = async () => {
    setRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-amber-600 dark:text-amber-400" />
      </div>
      <h2 className="text-xl font-bold mb-2">لا يوجد اتصال بالإنترنت</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        تحقق من اتصالك بالشبكة وحاول مرة أخرى. سيعاد الاتصال تلقائياً عند عودة الإنترنت.
      </p>
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-95 transition-transform disabled:opacity-50"
        data-testid="button-retry-connection"
      >
        <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? "جاري المحاولة..." : "إعادة المحاولة"}
      </button>
    </div>
  );
}
