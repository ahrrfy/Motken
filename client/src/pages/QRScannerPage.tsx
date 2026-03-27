import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QrCode, ShieldCheck, ShieldAlert, Loader2, Scan, Camera, CameraOff, Search, User, MapPin, Phone, Calendar, X } from "lucide-react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { formatDateAr } from "@/lib/utils";

const ROLE_MAP: Record<string, string> = {
  student: "طالب",
  teacher: "أستاذ",
  supervisor: "مشرف",
  admin: "مدير",
};

function formatManualId(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length <= 3) return clean;
  if (clean.length <= 7) return clean.slice(0, 3) + "-" + clean.slice(3);
  return clean.slice(0, 3) + "-" + clean.slice(3, 7) + "-" + clean.slice(7, 11);
}

export default function QRScannerPage() {
  const [cameraActive, setCameraActive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [error, setError] = useState("");
  const [manualId, setManualId] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);

  const verifyUser = useCallback(async (data: string) => {
    if (verifying) return;
    setVerifying(true);
    setError("");
    setVerifiedUser(null);

    try {
      let userId = "";
      try {
        const parsed = JSON.parse(data);
        userId = parsed.id || "";
      } catch {
        userId = data.trim();
      }

      if (!userId) {
        setError("رمز QR غير صالح");
        setVerifying(false);
        return;
      }

      const res = await fetch(`/api/verify-user/${encodeURIComponent(userId)}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        setError(err.message || "فشل التحقق");
        setVerifying(false);
        return;
      }

      const user = await res.json();
      setVerifiedUser(user);
    } catch {
      setError("حدث خطأ أثناء التحقق");
    }
    setVerifying(false);
  }, [verifying]);

  const stopCamera = useCallback(async () => {
    scanningRef.current = false;
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setError("");
    setVerifiedUser(null);

    if (scannerRef.current) {
      await stopCamera();
    }

    try {
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;
      scanningRef.current = true;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decodedText) => {
          if (!scanningRef.current) return;
          scanningRef.current = false;
          try {
            await scanner.stop();
            scanner.clear();
          } catch {}
          scannerRef.current = null;
          setCameraActive(false);
          verifyUser(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      setError("لا يمكن الوصول إلى الكاميرا. تأكد من منح الإذن.");
    }
  };

  const handleManualSearch = () => {
    const trimmed = manualId.trim();
    if (trimmed) {
      verifyUser(trimmed);
    }
  };

  const handleManualIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatManualId(e.target.value);
    setManualId(formatted);
  };

  const resetScan = () => {
    setVerifiedUser(null);
    setError("");
    setManualId("");
  };

  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            scannerRef.current.stop().then(() => {
              scannerRef.current?.clear();
            }).catch(() => {});
          }
        } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6" dir="rtl">
      <div className="text-center space-y-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-qr-title">
          التحقق من الهوية
        </h1>
        <p className="text-muted-foreground">مسح رمز QR أو إدخال معرف المستخدم للتحقق</p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ width: "100%", minHeight: "300px" }}>
              <div id="qr-reader" style={{ width: "100%", minHeight: "300px" }} />
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className="w-[250px] h-[250px] relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400/50 animate-pulse" style={{ animationDuration: "1.5s" }} />
                  </div>
                </div>
              )}
              {!cameraActive && !verifying && !verifiedUser && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-4">
                  <QrCode className="w-20 h-20" />
                  <p className="text-sm">اضغط لتشغيل الكاميرا ومسح رمز QR</p>
                </div>
              )}
              {verifying && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-20">
                  <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                  <p className="text-white/80 text-sm">جاري التحقق...</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!cameraActive ? (
                <Button
                  onClick={startCamera}
                  className="flex-1"
                  data-testid="button-start-camera"
                >
                  <Camera className="w-4 h-4 ml-2" />
                  تشغيل الكاميرا
                </Button>
              ) : (
                <Button
                  onClick={stopCamera}
                  variant="destructive"
                  className="flex-1"
                  data-testid="button-stop-camera"
                >
                  <CameraOff className="w-4 h-4 ml-2" />
                  إيقاف الكاميرا
                </Button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">أو ابحث يدوياً</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="MTQ-2026-XXXX"
                value={manualId}
                onChange={handleManualIdChange}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                className="flex-1 font-mono tracking-wider"
                dir="ltr"
                maxLength={13}
                data-testid="input-manual-id"
              />
              <Button
                onClick={handleManualSearch}
                disabled={!manualId.trim() || verifying}
                data-testid="button-manual-search"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-red-700">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-bold">فشل التحقق</p>
                  <p className="text-sm">{error}</p>
                </div>
                <Button variant="ghost" size="icon" className="mr-auto" onClick={resetScan}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {verifiedUser && (
          <Card className="border-t-4 border-t-emerald-500" data-testid="card-verified-user">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-bold text-sm">تم التحقق بنجاح</span>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {verifiedUser.avatar ? (
                    <img src={verifiedUser.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {verifiedUser.name?.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold" data-testid="text-verified-name">{verifiedUser.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={verifiedUser.isActive ? "default" : "destructive"}>
                      {verifiedUser.isActive ? "نشط" : "معطّل"}
                    </Badge>
                    <Badge variant="outline">{ROLE_MAP[verifiedUser.role] || verifiedUser.role}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t">
                {verifiedUser.mosqueName && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{verifiedUser.mosqueName}</span>
                  </div>
                )}
                {verifiedUser.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span dir="ltr">{verifiedUser.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs" dir="ltr">{verifiedUser.username}</span>
                </div>
                {verifiedUser.createdAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{formatDateAr(verifiedUser.createdAt)}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t">
                <Button variant="outline" className="w-full" onClick={resetScan} data-testid="button-scan-again">
                  <Scan className="w-4 h-4 ml-2" />
                  مسح آخر
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
