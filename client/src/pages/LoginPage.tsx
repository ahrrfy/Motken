import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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


  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-islamic-pattern px-3 py-6 sm:p-4 font-sans" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border-primary/10 overflow-hidden backdrop-blur-sm bg-card/95">
        <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary w-full" />
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto w-20 h-20 mb-2">
             <img src="/favicon.svg" alt="مُتْقِن" className="w-full h-full rounded-full shadow-lg" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary font-serif">نظام مُتْقِن</CardTitle>
          <CardDescription>نظام إدارة حلقات التحفيظ</CardDescription>
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/50 pl-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-toggle-password"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11" disabled={loading} data-testid="button-login">
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

        </CardContent>
        <CardFooter className="flex justify-center border-t bg-muted/20 py-4">
          <p className="text-xs text-muted-foreground text-center space-y-1">
            <span className="block font-semibold">النظام وقف لله تعالى</span>
            <span className="block">برمجة وتطوير أحمد خالد الزبيدي</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
