import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { API_BASE } from "@/lib/capacitor";
import { Loader2, Upload, CheckCircle2, Trash2, RefreshCw } from "lucide-react";

interface Bundle {
  id: string;
  version: string;
  size: number;
  channel: string;
  release_notes: string | null;
  is_active: boolean;
  min_native_version: string | null;
  created_at: string;
}

export default function OtaUpdatesPage() {
  const { toast } = useToast();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [minNative, setMinNative] = useState("");
  const [activate, setActivate] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchBundles = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/ota/bundles");
      setBundles(await res.json());
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBundles(); }, []);

  const handleUpload = async () => {
    if (!file || !version.trim()) {
      toast({ title: "خطأ", description: "الإصدار وملف الحزمة مطلوبان", variant: "destructive" });
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("version", version.trim());
      fd.append("releaseNotes", releaseNotes);
      fd.append("minNativeVersion", minNative);
      fd.append("activate", activate ? "true" : "false");

      const xhr = new XMLHttpRequest();
      const result = await new Promise<any>((resolve, reject) => {
        xhr.open("POST", API_BASE + "/api/admin/ota/bundles");
        xhr.withCredentials = true;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(new Error(data.message || "فشل"));
          } catch { reject(new Error("استجابة غير صالحة")); }
        };
        xhr.onerror = () => reject(new Error("فشل الاتصال"));
        xhr.send(fd);
      });

      toast({ title: "تم النشر", description: `الإصدار ${result.version} جاهز` });
      setFile(null);
      setVersion("");
      setReleaseNotes("");
      setMinNative("");
      await fetchBundles();
    } catch (e: any) {
      toast({ title: "فشل النشر", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (b: Bundle) => {
    try {
      await apiFetch(`/api/admin/ota/bundles/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !b.is_active }),
      });
      await fetchBundles();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const deleteBundle = async (b: Bundle) => {
    if (!confirm(`حذف الإصدار ${b.version}؟`)) return;
    try {
      await apiFetch(`/api/admin/ota/bundles/${b.id}`, { method: "DELETE" });
      await fetchBundles();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">تحديثات الواجهة (OTA)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          انشر تحديثات الواجهة مباشرة لكل مستخدمي APK بدون بناء APK جديد.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            نشر حزمة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>رقم الإصدار (X.Y.Z) *</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.2.0" dir="ltr" />
            </div>
            <div>
              <Label>الحد الأدنى للإصدار الأصلي</Label>
              <Input value={minNative} onChange={(e) => setMinNative(e.target.value)} placeholder="1.1.0" dir="ltr" />
            </div>
          </div>
          <div>
            <Label>ملف الحزمة (bundle.zip) *</Label>
            <Input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              ناتج: <span className="font-mono">npm run build → zip -r dist/public</span>
            </p>
          </div>
          <div>
            <Label>ملاحظات الإصدار</Label>
            <Textarea value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} rows={3} placeholder="ما الجديد في هذا التحديث؟" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={activate} onCheckedChange={setActivate} id="activate" />
            <Label htmlFor="activate">تفعيله فوراً بعد النشر</Label>
          </div>
          {uploading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              جارٍ الرفع... {progress}%
            </div>
          )}
          <Button onClick={handleUpload} disabled={uploading || !file || !version.trim()} className="w-full">
            {uploading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Upload className="w-4 h-4 ml-2" />}
            نشر التحديث
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>الإصدارات المنشورة</span>
            <Button variant="ghost" size="sm" onClick={fetchBundles}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : bundles.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">لا توجد حزم منشورة بعد.</p>
          ) : (
            <div className="space-y-2">
              {bundles.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold">v{b.version}</span>
                      {b.is_active && <Badge className="bg-emerald-600">نشط</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {(b.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    {b.release_notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{b.release_notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant={b.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleActive(b)}
                    >
                      {b.is_active ? "تعطيل" : <><CheckCircle2 className="w-4 h-4 ml-1" />تفعيل</>}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteBundle(b)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
