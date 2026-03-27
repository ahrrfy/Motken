import { useState, useEffect, useRef } from "react";
import { Camera, MapPin, Bell, Mic, CheckCircle, XCircle, AlertCircle, Volume2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type PermissionStatus = "granted" | "denied" | "prompt" | "unsupported";

function detectBrowser(): string {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  if (/CriOS/i.test(ua)) return "chrome-ios";
  if (/FxiOS/i.test(ua)) return "firefox-ios";
  if (/Safari/i.test(ua) && /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua)) return "safari-ios";
  if (isAndroid && /Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) return "chrome-android";
  if (isAndroid) return "android-other";
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) return "chrome";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Edg/i.test(ua)) return "edge";
  if (/Safari/i.test(ua)) return "safari";
  return "other";
}

function getMicInstructions(browser: string): { steps: string[]; extra?: string } {
  switch (browser) {
    case "chrome-android":
      return {
        steps: [
          "اضغط على أيقونة القفل 🔒 في شريط العنوان أعلى الشاشة",
          "اضغط على \"الأذونات\"",
          "اضغط على \"الميكروفون\" واختر \"سماح\"",
          "أعد تحميل الصفحة",
        ],
        extra: "إذا لم تجده: إعدادات الهاتف ← التطبيقات ← Chrome ← الأذونات ← الميكروفون ← سماح"
      };
    case "android-other":
      return {
        steps: [
          "اضغط على النقاط الثلاث ⋮ أو القفل في المتصفح",
          "ابحث عن إعدادات الموقع أو الأذونات",
          "فعّل إذن الميكروفون ثم أعد التحميل",
        ],
        extra: "أو: إعدادات الهاتف ← التطبيقات ← المتصفح ← الأذونات ← الميكروفون"
      };
    case "chrome":
    case "edge":
      return {
        steps: [
          "اضغط على أيقونة القفل 🔒 بجانب عنوان الموقع",
          "ابحث عن \"الميكروفون\" واختر \"سماح\"",
          "أعد تحميل الصفحة",
        ]
      };
    case "safari":
      return {
        steps: [
          "اذهب إلى Safari ← الإعدادات ← المواقع ← الميكروفون",
          "اختر \"سماح\" لهذا الموقع",
          "أعد تحميل الصفحة",
        ]
      };
    case "safari-ios":
      return {
        steps: [
          "اذهب إلى الإعدادات ← Safari ← الميكروفون",
          "تأكد أن \"السماح\" مفعّل",
          "ارجع وأعد تحميل الصفحة",
        ]
      };
    case "chrome-ios":
      return {
        steps: [
          "اذهب إلى الإعدادات ← Chrome ← الميكروفون",
          "تأكد أن الميكروفون مفعّل",
          "ارجع وأعد تحميل الصفحة",
        ]
      };
    case "firefox":
      return {
        steps: [
          "اضغط على أيقونة القفل بجانب عنوان الموقع",
          "اضغط \"مسح الأذونات\" ثم أعد التحميل",
        ]
      };
    default:
      return {
        steps: [
          "افتح إعدادات المتصفح واسمح بالميكروفون لهذا الموقع",
          "أعد تحميل الصفحة",
        ]
      };
  }
}

function usePermissionStatus(name: PermissionName): PermissionStatus {
  const [status, setStatus] = useState<PermissionStatus>("prompt");

  useEffect(() => {
    if (!navigator.permissions) {
      setStatus("unsupported");
      return;
    }
    navigator.permissions.query({ name }).then(result => {
      setStatus(result.state as PermissionStatus);
      result.onchange = () => setStatus(result.state as PermissionStatus);
    }).catch(() => setStatus("unsupported"));
  }, [name]);

  return status;
}

export default function DevicePermissions() {
  const { toast } = useToast();
  const micStatus = usePermissionStatus("microphone" as PermissionName);
  const cameraStatus = usePermissionStatus("camera" as PermissionName);
  const geoStatus = usePermissionStatus("geolocation" as PermissionName);
  const notifStatus = usePermissionStatus("notifications" as PermissionName);
  const [testingMic, setTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [showMicHelp, setShowMicHelp] = useState(false);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const browser = detectBrowser();

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      toast({ title: "تم", description: "تم منح إذن الميكروفون بنجاح ✓", className: "bg-green-50 border-green-200 text-green-800" });
      setShowMicHelp(false);
    } catch {
      setShowMicHelp(true);
      toast({ title: "تنبيه", description: "تم رفض إذن الميكروفون — اتبع التعليمات أدناه", variant: "destructive" });
    }
  };

  const testMicrophone = async () => {
    setTestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const updateLevel = () => {
        if (!analyzerRef.current) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      setTimeout(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        analyzerRef.current = null;
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close();
        setTestingMic(false);
        setMicLevel(0);
      }, 5000);

      toast({ title: "المايكروفون يعمل ✓", description: "تحدث الآن لاختبار الصوت", className: "bg-green-50 border-green-200 text-green-800" });
    } catch {
      setTestingMic(false);
      setShowMicHelp(true);
      toast({ title: "فشل الاختبار", description: "لا يمكن الوصول للمايكروفون", variant: "destructive" });
    }
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      toast({ title: "تم", description: "تم منح إذن الكاميرا بنجاح" });
    } catch {
      toast({ title: "تنبيه", description: "تم رفض إذن الكاميرا", variant: "destructive" });
    }
  };

  const requestGeolocation = async () => {
    navigator.geolocation.getCurrentPosition(
      () => toast({ title: "تم", description: "تم منح إذن الموقع بنجاح" }),
      () => toast({ title: "تنبيه", description: "تم رفض إذن الموقع", variant: "destructive" })
    );
  };

  const requestNotification = async () => {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      toast({ title: "تم", description: "تم منح إذن الإشعارات" });
    } else {
      toast({ title: "تنبيه", description: "تم رفض إذن الإشعارات", variant: "destructive" });
    }
  };

  const getStatusIcon = (status: PermissionStatus) => {
    switch (status) {
      case "granted": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "denied": return <XCircle className="w-5 h-5 text-red-500" />;
      case "unsupported": return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default: return <AlertCircle className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusText = (status: PermissionStatus) => {
    switch (status) {
      case "granted": return "مسموح";
      case "denied": return "مرفوض";
      case "unsupported": return "غير مدعوم";
      default: return "لم يُحدد";
    }
  };

  const permissions = [
    { name: "الميكروفون", description: "مطلوب لتسجيل التسميع الصوتي", icon: Mic, status: micStatus, request: requestMicrophone },
    { name: "الكاميرا", description: "مطلوب لمسح رمز QR", icon: Camera, status: cameraStatus, request: requestCamera },
    { name: "الموقع الجغرافي", description: "لتحديد مواقيت الصلاة تلقائياً", icon: MapPin, status: geoStatus, request: requestGeolocation },
    { name: "الإشعارات", description: "لاستقبال التنبيهات والتذكيرات", icon: Bell, status: notifStatus, request: requestNotification },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>أذونات الجهاز</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissions.map((perm) => (
          <div key={perm.name}>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30" data-testid={`permission-row-${perm.name}`}>
              <div className="flex items-center gap-3">
                <perm.icon className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{perm.name}</p>
                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(perm.status)}
                  <span className="text-xs">{getStatusText(perm.status)}</span>
                </div>
                {perm.status !== "granted" && perm.status !== "unsupported" && (
                  <Button size="sm" variant="outline" onClick={perm.request} data-testid={`button-request-${perm.name}`}>
                    طلب الإذن
                  </Button>
                )}
                {perm.name === "الميكروفون" && perm.status === "granted" && !testingMic && (
                  <Button size="sm" variant="outline" onClick={testMicrophone} data-testid="button-test-mic">
                    <Volume2 className="w-3 h-3 ml-1" />
                    اختبار
                  </Button>
                )}
              </div>
            </div>

            {perm.name === "الميكروفون" && testingMic && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-bold text-green-800">اختبار المايكروفون — تحدث الآن</span>
                </div>
                <div className="w-full bg-green-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-green-500 h-4 rounded-full transition-all duration-100"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
                <p className="text-xs text-green-600 mt-1 text-center">
                  {micLevel > 20 ? "ممتاز! المايكروفون يلتقط صوتك بوضوح ✓" : "تحدث بصوت أعلى قليلاً..."}
                </p>
              </div>
            )}

            {perm.name === "الميكروفون" && (showMicHelp || perm.status === "denied") && (
              <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs font-bold text-amber-800 mb-2">كيف تسمح بالمايكروفون:</p>
                <ol className="text-xs text-amber-700 space-y-1 list-decimal mr-5 mb-2">
                  {getMicInstructions(browser).steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                {getMicInstructions(browser).extra && (
                  <p className="text-[10px] text-amber-600 bg-amber-100 rounded p-1.5 mb-2">
                    💡 {getMicInstructions(browser).extra}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="w-3 h-3 ml-1" />
                  إعادة تحميل الصفحة
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
