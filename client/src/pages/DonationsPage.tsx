import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Heart, History } from "lucide-react";

export default function DonationsPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary">التبرع ودعم النظام</h1>
        <p className="text-muted-foreground">ساهم في استمرار تطوير منصة الحفاظ وخدمة كتاب الله</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              تبرع سريع
            </CardTitle>
            <CardDescription>الدفع الآمن عبر ماستر كارد (MasterCard)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button variant="outline" className="border-primary/20 hover:bg-primary/5">10,000 د.ع</Button>
              <Button variant="outline" className="border-primary/20 hover:bg-primary/5">25,000 د.ع</Button>
              <Button variant="outline" className="border-primary/20 hover:bg-primary/5">50,000 د.ع</Button>
            </div>
            
            <div className="space-y-2">
              <Label>مبلغ آخر</Label>
              <div className="relative">
                <Input type="number" placeholder="أدخل المبلغ" className="pl-12" />
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">د.ع</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>رقم البطاقة</Label>
              <Input placeholder="0000 0000 0000 0000" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ الانتهاء</Label>
                <Input placeholder="MM/YY" />
              </div>
              <div className="space-y-2">
                <Label>CVC</Label>
                <Input placeholder="123" />
              </div>
            </div>

            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 mt-4">
              <Heart className="w-4 h-4 ml-2 fill-current" />
              تبرع الآن
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              سجل تبرعاتك
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border">
                <div>
                  <p className="font-bold">كفالة طالب علم</p>
                  <p className="text-xs text-muted-foreground">12 فبراير 2026</p>
                </div>
                <span className="font-bold text-green-600">50,000 د.ع</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border">
                <div>
                  <p className="font-bold">دعم تقني للمنصة</p>
                  <p className="text-xs text-muted-foreground">01 يناير 2026</p>
                </div>
                <span className="font-bold text-green-600">25,000 د.ع</span>
              </div>
              
              <div className="mt-8 p-4 bg-primary/10 rounded-lg text-sm text-primary-foreground/80 leading-relaxed">
                قال رسول الله ﷺ: "خيركم من تعلم القرآن وعلمه".
                <br/>
                مساهمتك تساعد في تطوير أدوات تحفيظ القرآن الكريم ونشر العلم النافع.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
