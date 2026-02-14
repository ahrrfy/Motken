import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(username, password);
    if (result.ok) {
      setLocation("/dashboard");
    } else {
      setError(result.message || "فشل تسجيل الدخول");
    }
    setLoading(false);
  };

  const quickLogin = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setLoading(true);
    setError("");
    const result = await login(user, pass);
    if (result.ok) {
      setLocation("/dashboard");
    } else {
      setError(result.message || "فشل تسجيل الدخول");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-islamic-pattern px-3 py-6 sm:p-4 font-sans" dir="rtl">
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
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center" data-testid="text-login-error">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/50"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/50"
                data-testid="input-password"
              />
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11" disabled={loading} data-testid="button-login">
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

          <div className="mt-6 space-y-2">
            <p className="text-xs text-muted-foreground text-center mb-2">دخول سريع (للتجربة):</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => quickLogin("admin", "admin123")} disabled={loading} className="text-xs" data-testid="button-quick-admin">
                مدير النظام
              </Button>
              <Button variant="outline" size="sm" onClick={() => quickLogin("teacher1", "teacher123")} disabled={loading} className="text-xs" data-testid="button-quick-teacher">
                أستاذ
              </Button>
              <Button variant="outline" size="sm" onClick={() => quickLogin("student1", "student123")} disabled={loading} className="text-xs" data-testid="button-quick-student">
                طالب
              </Button>
              <Button variant="outline" size="sm" onClick={() => quickLogin("supervisor1", "super123")} disabled={loading} className="text-xs" data-testid="button-quick-supervisor">
                مشرف
              </Button>
            </div>
          </div>
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
