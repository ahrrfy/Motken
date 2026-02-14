import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<string>("student");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      login(role as any);
      setLocation("/dashboard");
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-islamic-pattern px-3 py-6 sm:p-4 font-sans" dir="rtl">
      <div className="absolute top-4 left-4">
        {/* Placeholder for Lang toggle */}
      </div>

      <Card className="w-full max-w-md shadow-2xl border-primary/10 overflow-hidden backdrop-blur-sm bg-card/95">
        <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary w-full" />
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 border-2 border-primary/20">
             <span className="text-3xl font-bold text-primary">ح</span>
          </div>
          <CardTitle className="text-2xl font-bold text-primary font-serif">منصة الحفاظ</CardTitle>
          <CardDescription>نظام تعليمي متكامل لحلقات التحفيظ</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input id="username" placeholder="أدخل اسم المستخدم" defaultValue="user123" className="bg-white/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" placeholder="••••••••" defaultValue="password" className="bg-white/50" />
            </div>
            
            <div className="space-y-2">
              <Label>الدخول بصفة</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder="اختر الصفة" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="student">طالب</SelectItem>
                  <SelectItem value="teacher">أستاذ</SelectItem>
                  <SelectItem value="supervisor">مشرف</SelectItem>
                  <SelectItem value="admin">مدير النظام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11" disabled={loading}>
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t bg-muted/20 py-4">
          <p className="text-xs text-muted-foreground text-center">
            جميع الحقوق محفوظة © 2026 منصة الحفاظ
            <br />
            نظام آمن ومحمي بأحدث التقنيات
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
