import { useState, useEffect } from "react";
import { Camera, MapPin, Bell, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type PermissionStatus = "granted" | "denied" | "prompt" | "unsupported";

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
  const cameraStatus = usePermissionStatus("camera" as PermissionName);
  const geoStatus = usePermissionStatus("geolocation" as PermissionName);
  const notifStatus = usePermissionStatus("notifications" as PermissionName);

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
          <div key={perm.name} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30" data-testid={`permission-row-${perm.name}`}>
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
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
