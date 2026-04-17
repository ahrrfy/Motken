import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { Loader2, Save, ShieldAlert, ShieldCheck, Plus, X } from "lucide-react";

interface Config {
  platform: string;
  latestVersion: string;
  minimumVersion: string;
  downloadUrl: string;
  forceUpdateMessage: string | null;
  softUpdateMessage: string | null;
  blockedUserAgents: string[];
}

export default function AppVersionPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBlockedUA, setNewBlockedUA] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/app-version");
      setConfig(await res.json());
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/app-version", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latestVersion: config.latestVersion,
          minimumVersion: config.minimumVersion,
          downloadUrl: config.downloadUrl,
          forceUpdateMessage: config.forceUpdateMessage,
          softUpdateMessage: config.softUpdateMessage,
          blockedUserAgents: config.blockedUserAgents,
        }),
      });
      toast({ title: "تم الحفظ", description: "تم تحديث الإعدادات" });
      await load();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleBlockOldApk = async () => {
    if (!config) return;
    const OLD_UA = "SirajAlQuran-Android/1.0";
    const isBlocked = config.blockedUserAgents.includes(OLD_UA);
    try {
      const res = await apiFetch("/api/admin/app-version/block-ua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAgent: OLD_UA,
          action: isBlocked ? "unblock" : "block",
        }),
      });
      const data = await res.json();
      setConfig({ ...config, blockedUserAgents: data.blockedUserAgents });
      toast({
        title: isBlocked ? "تم إلغاء الحظر" : "تم تفعيل الحظر",
        description: isBlocked
          ? "APK v1.0 يعمل مجدداً"
          : "APK v1.0 سيتوقف عن العمل فوراً",
      });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const addCustomUA = () => {
    if (!config || !newBlockedUA.trim()) return;
    if (config.blockedUserAgents.includes(newBlockedUA.trim())) return;
    setConfig({
      ...config,
      blockedUserAgents: [...config.blockedUserAgents, newBlockedUA.trim()],
    });
    setNewBlockedUA("");
  };

  const removeUA = (ua: string) => {
    if (!config) return;
    setConfig({
      ...config,
      blockedUserAgents: config.blockedUserAgents.filter(b => b !== ua),
    });
  };

  if (loading || !config) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const oldApkBlocked = config.blockedUserAgents.includes("SirajAlQuran-Android/1.0");

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">إدارة إصدار التطبيق</h1>
        <p className="text-sm text-muted-foreground mt-1">
          تحكم في الحد الأدنى للإصدار المسموح وإلزام المستخدمين بالتحديث.
        </p>
      </div>

      <Card className="mb-4 border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {oldApkBlocked ? (
              <><ShieldAlert className="w-5 h-5 text-red-600" /> APK القديم (v1.0) محظور</>
            ) : (
              <><ShieldCheck className="w-5 h-5 text-emerald-600" /> APK القديم (v1.0) يعمل</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            تفعيل الحظر يُوقف جميع طلبات APK v1.0 ويُظهر رسالة إلزام بالتحديث.
            يوصى بتفعيله بعد 7 أيام من توزيع APK الجديد.
          </p>
          <Button
            variant={oldApkBlocked ? "outline" : "destructive"}
            onClick={toggleBlockOldApk}
          >
            {oldApkBlocked ? "إلغاء الحظر" : "تفعيل حظر APK v1.0"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>إعدادات الإصدار</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>أحدث إصدار</Label>
              <Input
                value={config.latestVersion}
                onChange={(e) => setConfig({ ...config, latestVersion: e.target.value })}
                dir="ltr"
              />
            </div>
            <div>
              <Label>الحد الأدنى للإصدار</Label>
              <Input
                value={config.minimumVersion}
                onChange={(e) => setConfig({ ...config, minimumVersion: e.target.value })}
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <Label>رابط تنزيل APK</Label>
            <Input
              value={config.downloadUrl}
              onChange={(e) => setConfig({ ...config, downloadUrl: e.target.value })}
              dir="ltr"
            />
          </div>
          <div>
            <Label>رسالة التحديث الإلزامي</Label>
            <Textarea
              value={config.forceUpdateMessage || ""}
              onChange={(e) => setConfig({ ...config, forceUpdateMessage: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label>رسالة التحديث الاختياري</Label>
            <Textarea
              value={config.softUpdateMessage || ""}
              onChange={(e) => setConfig({ ...config, softUpdateMessage: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>User-Agents المحظورة</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {config.blockedUserAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد User-Agents محظورة</p>
            ) : config.blockedUserAgents.map(ua => (
              <Badge key={ua} variant="destructive" className="gap-1 pr-1">
                <span className="font-mono text-xs">{ua}</span>
                <button onClick={() => removeUA(ua)} className="hover:bg-white/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newBlockedUA}
              onChange={(e) => setNewBlockedUA(e.target.value)}
              placeholder="SirajAlQuran-Android/0.9.0"
              dir="ltr"
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={addCustomUA} disabled={!newBlockedUA.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
        حفظ التغييرات
      </Button>
    </div>
  );
}
