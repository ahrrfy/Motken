import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CredentialsShareDialogProps {
  open: boolean;
  onClose: () => void;
  name: string;
  username: string;
  password: string;
  phone?: string;
  role: string;
  mosqueName?: string;
}

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  supervisor: "مشرف",
  teacher: "أستاذ",
  student: "طالب",
};

export default function CredentialsShareDialog({
  open,
  onClose,
  name,
  username,
  password,
  phone,
  role,
  mosqueName,
}: CredentialsShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const appUrl = window.location.origin;

  const getMessage = () => {
    let msg = `بسم الله الرحمن الرحيم\n\n`;
    msg += `نظام مُتْقِن لإدارة حلقات القرآن الكريم\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `الاسم: ${name}\n`;
    msg += `الصفة: ${roleLabels[role] || role}\n`;
    if (mosqueName) {
      msg += `الجامع/المركز: ${mosqueName}\n`;
    }
    msg += `\n`;
    msg += `بيانات الدخول:\n`;
    msg += `اسم المستخدم: ${username}\n`;
    msg += `كلمة المرور: ${password}\n`;
    msg += `\n`;
    msg += `رابط الدخول للنظام:\n${appUrl}\n`;
    msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `يرجى الاحتفاظ ببيانات الدخول وعدم مشاركتها مع أحد`;
    return msg;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getMessage());
      setCopied(true);
      toast({
        title: "تم النسخ",
        description: "تم نسخ بيانات الدخول بنجاح",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = getMessage();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      toast({
        title: "تم النسخ",
        description: "تم نسخ بيانات الدخول بنجاح",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(getMessage());
    const phoneNumber = phone ? phone.replace(/[^0-9+]/g, "") : "";
    let waUrl: string;
    if (phoneNumber) {
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber.slice(1) : phoneNumber.startsWith("0") ? "964" + phoneNumber.slice(1) : phoneNumber;
      waUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    } else {
      waUrl = `https://wa.me/?text=${message}`;
    }
    window.open(waUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center font-serif text-lg">
            تم إنشاء الحساب بنجاح
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm border" dir="rtl">
            <div className="text-center font-bold text-primary mb-3">
              بيانات الدخول
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الاسم:</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الصفة:</span>
                <span className="font-medium">{roleLabels[role] || role}</span>
              </div>
              {mosqueName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الجامع/المركز:</span>
                  <span className="font-medium text-left" style={{ maxWidth: "60%" }}>{mosqueName}</span>
                </div>
              )}
              <hr className="my-2 border-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">اسم المستخدم:</span>
                <span className="font-bold text-primary" dir="ltr">{username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">كلمة المرور:</span>
                <span className="font-bold text-primary" dir="ltr">{password}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full gap-2"
              data-testid="button-copy-credentials"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "تم النسخ!" : "نسخ بيانات الدخول"}
            </Button>

            <Button
              onClick={handleWhatsApp}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-share-whatsapp"
            >
              <MessageCircle className="w-4 h-4" />
              مشاركة عبر واتساب
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              data-testid="button-close-credentials"
            >
              <X className="w-4 h-4" />
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
