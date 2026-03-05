import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Share2, MessageCircle, Copy, CheckCircle2, Globe, Users, QrCode, Link2 } from "lucide-react";

interface SpreadData {
  inviteCode: string;
  mosqueName: string;
  inviteUrl: string;
  whatsappText: string;
  stats: {
    totalInvites: number;
    joinedFromInvite: number;
  };
}

export default function SpreadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<SpreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/my-invite-code", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          const origin = window.location.origin;
          setData({
            ...d,
            inviteUrl: `${origin}/welcome?ref=${d.inviteCode}`,
            whatsappText: `السلام عليكم 🕌\n\nنحن في *${d.mosqueName}* نستخدم نظام *مُتْقِن* لإدارة حلقات القرآن الكريم — مجاني تماماً ووقف لله تعالى.\n\n✅ تتبع حضور الطلاب\n✅ متابعة الحفظ آية بآية\n✅ تقارير لأولياء الأمور بضغطة واحدة\n✅ يعمل على الجوال مباشرة بدون تطبيق\n\n🔗 اكتشف النظام وسجّل مسجدك/مركزك:\n${origin}/welcome?ref=${d.inviteCode}\n\nنظام وقفي مجاني لخدمة كتاب الله 📖`,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopyLink = () => {
    if (!data) return;
    navigator.clipboard?.writeText(data.inviteUrl).then(() => {
      setCopied(true);
      toast({ title: "تم نسخ الرابط", description: "يمكنك لصقه في أي محادثة" });
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleShareWhatsApp = () => {
    if (!data) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(data.whatsappText)}`, "_blank");
  };

  const handleShareTelegram = () => {
    if (!data) return;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(data.inviteUrl)}&text=${encodeURIComponent(data.whatsappText)}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (!data || !navigator.share) return;
    try {
      await navigator.share({ title: "نظام مُتْقِن", text: data.whatsappText, url: data.inviteUrl });
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="status-loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Share2 className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-serif text-primary" data-testid="text-page-title">انشر النظام</h1>
          <p className="text-sm text-muted-foreground">ساهم في نشر الخير — شارك النظام مع مساجد أخرى</p>
        </div>
      </div>

      {data && (
        <>
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-600" />
                رابط الدعوة الخاص بمسجدك/مركزك
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 bg-white rounded-lg border border-emerald-200 p-3">
                <code className="flex-1 text-sm text-gray-700 truncate select-all" dir="ltr" data-testid="text-invite-url">
                  {data.inviteUrl}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0" data-testid="btn-copy-link">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? "تم" : "نسخ"}
                </Button>
              </div>
              <p className="text-xs text-emerald-700">عندما يسجّل مسجد/مركز جديد عبر هذا الرابط، يُحتسب لكم الأجر إن شاء الله</p>
            </CardContent>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleShareWhatsApp} data-testid="card-share-whatsapp">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-[#16213e]">شارك عبر واتساب</h3>
                  <p className="text-sm text-gray-500">أرسل رسالة جاهزة لمجموعاتك</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleShareTelegram} data-testid="card-share-telegram">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <Globe className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-bold text-[#16213e]">شارك عبر تيليغرام</h3>
                  <p className="text-sm text-gray-500">أرسل الرابط لقنوات تيليغرام</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {"share" in navigator && (
            <Button onClick={handleNativeShare} variant="outline" className="w-full h-12 text-base" data-testid="btn-native-share">
              <Share2 className="w-5 h-5 ml-2" />
              مشاركة عبر تطبيقات الجهاز
            </Button>
          )}

          {data.stats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  إحصائيات الانتشار
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-gray-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-[#16213e]">{data.stats.totalInvites || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">مرة تم فتح الرابط</p>
                  </div>
                  <div className="text-center bg-emerald-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-emerald-700">{data.stats.joinedFromInvite || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">مسجد/مركز انضم عبر رابطك</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-5 text-center">
              <p className="text-lg font-bold text-amber-800 font-serif mb-2">الدال على الخير كفاعله</p>
              <p className="text-sm text-amber-700">كل مسجد ينضم عبر دعوتك، لك أجره إن شاء الله. ساهم في نشر النظام لخدمة كتاب الله تعالى.</p>
            </CardContent>
          </Card>
        </>
      )}

      {!data && (
        <Card>
          <CardContent className="p-12 text-center">
            <Share2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">لا يمكن تحميل بيانات الدعوة حالياً</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
