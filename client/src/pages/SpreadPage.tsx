import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Share2, MessageCircle, Copy, CheckCircle2, Globe, Users, QrCode, Link2, AlertCircle } from "lucide-react";
import { usePublicConfig } from "@/lib/public-config";

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
  const [noMosque, setNoMosque] = useState(false);
  const { appUrl: publicAppUrl } = usePublicConfig();

  const generalUrl = `${publicAppUrl}/welcome`;
  const generalWhatsappText = `السلام عليكم 🕌\n\nنظام *سِرَاجُ الْقُرْآنِ* لإدارة حلقات القرآن الكريم — مجاني تماماً ووقف لله تعالى.\n\n✅ تتبع حضور الطلاب\n✅ متابعة الحفظ آية بآية\n✅ تقارير لأولياء الأمور بضغطة واحدة\n✅ يعمل على الجوال مباشرة بدون تطبيق\n\n🔗 اكتشف النظام وسجّل مسجدك/مركزك:\n${generalUrl}\n\nنظام وقفي مجاني لخدمة كتاب الله 📖`;

  useEffect(() => {
    fetch("/api/my-invite-code", { credentials: "include" })
      .then(r => {
        if (r.ok) return r.json();
        if (r.status === 400) {
          setNoMosque(true);
          return null;
        }
        return null;
      })
      .then(d => {
        if (d) {
          setData({
            ...d,
            inviteUrl: `${origin}/welcome?ref=${d.inviteCode}`,
            whatsappText: `السلام عليكم 🕌\n\nنحن في *${d.mosqueName}* نستخدم نظام *سِرَاجُ الْقُرْآنِ* لإدارة حلقات القرآن الكريم — مجاني تماماً ووقف لله تعالى.\n\n✅ تتبع حضور الطلاب\n✅ متابعة الحفظ آية بآية\n✅ تقارير لأولياء الأمور بضغطة واحدة\n✅ يعمل على الجوال مباشرة بدون تطبيق\n\n🔗 اكتشف النظام وسجّل مسجدك/مركزك:\n${origin}/welcome?ref=${d.inviteCode}\n\nنظام وقفي مجاني لخدمة كتاب الله 📖`,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const shareUrl = data?.inviteUrl || generalUrl;
  const shareText = data?.whatsappText || generalWhatsappText;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      toast({ title: "تم نسخ الرابط", description: "يمكنك لصقه في أي محادثة" });
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: "سِرَاجُ الْقُرْآنِ", text: shareText, url: shareUrl });
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="status-loading-spread">
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
          <h1 className="text-2xl font-bold font-serif text-primary" data-testid="text-page-title-spread">انشر النظام</h1>
          <p className="text-sm text-muted-foreground">ساهم في نشر الخير — شارك النظام مع مساجد أخرى</p>
        </div>
      </div>

      {noMosque && !data && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">حسابك غير مرتبط بمسجد حالياً</p>
              <p className="text-sm text-amber-700 mt-1">يمكنك مشاركة الرابط العام للنظام أدناه. لتفعيل رابط الدعوة الخاص بمسجدك، تأكد من ربط حسابك بمسجد من صفحة الإعدادات.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="w-5 h-5 text-emerald-600" />
            {data ? "رابط الدعوة الخاص بمسجدك/مركزك" : "رابط النظام العام"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-emerald-200 p-3">
            <code className="flex-1 text-sm text-gray-700 truncate select-all" dir="ltr" data-testid="text-invite-url">
              {shareUrl}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0" data-testid="btn-copy-link">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "تم" : "نسخ"}
            </Button>
          </div>
          <p className="text-xs text-emerald-700">
            {data ? "عندما يسجّل مسجد/مركز جديد عبر هذا الرابط، يُحتسب لكم الأجر إن شاء الله" : "شارك هذا الرابط مع أي مسجد أو مركز قرآني"}
          </p>
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

      {data?.stats && (
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
    </div>
  );
}
