import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { language } = useTheme();

  const isEn = language === "en";
  const dir = isEn ? "ltr" : "rtl";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(username, password);
    if (result.ok) {
      setLocation("/dashboard");
    } else {
      setError(result.message || (isEn ? "Login failed" : "فشل تسجيل الدخول"));
    }
    setLoading(false);
  };


  return (
    <div className="min-h-screen w-full flex items-center justify-center px-3 py-6 sm:p-4 font-sans relative overflow-hidden" dir={dir} style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      <div className="absolute inset-0 opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="islamic-bg" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="white" strokeWidth="0.5"/>
              <circle cx="30" cy="30" r="12" fill="none" stroke="white" strokeWidth="0.5"/>
              <circle cx="30" cy="30" r="6" fill="none" stroke="white" strokeWidth="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#islamic-bg)"/>
        </svg>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden backdrop-blur-sm bg-card/95 relative z-10">
        <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 w-full" />
        <CardHeader className="text-center space-y-3 pb-2 pt-6">
          <p className="text-lg text-muted-foreground font-serif">﷽</p>
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 mb-2 relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
            <img src="/favicon.svg" alt="مُتْقِن" className="w-full h-full rounded-full shadow-lg relative z-10" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary font-serif">{isEn ? "Mutqin System" : "نظام مُتْقِن"}</CardTitle>
          <CardDescription>{isEn ? "Quran Memorization Management System" : "نظام إدارة حلقات التحفيظ"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center" data-testid="text-login-error">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">{isEn ? "Username" : "اسم المستخدم"}</Label>
              <Input
                id="username"
                placeholder={isEn ? "Enter username" : "أدخل اسم المستخدم"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/50"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{isEn ? "Password" : "كلمة المرور"}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`bg-white/50 ${isEn ? "pr-10" : "pl-10"}`}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isEn ? "right-2" : "left-2"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors`}
                  data-testid="button-toggle-password"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11" disabled={loading} data-testid="button-login">
              {loading ? (isEn ? "Signing in..." : "جاري الدخول...") : (isEn ? "Sign In" : "تسجيل الدخول")}
            </Button>
          </form>

        </CardContent>
        <div className="h-1 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 w-full" />
        <CardFooter className="flex justify-center border-t bg-muted/20 py-4">
          <p className="text-xs text-muted-foreground text-center space-y-1">
            <span className="block font-semibold">{isEn ? "This system is a Waqf for Allah" : "النظام وقف لله تعالى"}</span>
            <span className="block">{isEn ? "Developed by Ahmed Khaled Al-Zubaidi" : "برمجة وتطوير أحمد خالد الزبيدي"}</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
