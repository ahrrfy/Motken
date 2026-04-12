import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/hooks/use-toast";
import { apiPost } from "@/lib/api";
import { InternationalPhoneInput } from "@/components/international-phone-input";
import { Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";

const PROVINCES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "كربلاء", "الأنبار", "صلاح الدين",
  "ديالى", "كركوك", "بابل", "واسط", "ذي قار", "ميسان", "المثنى", "القادسية", "دهوك", "السليمانية"
];

const PROVINCES_EN = [
  "Baghdad", "Basra", "Nineveh", "Erbil", "Najaf", "Karbala", "Anbar", "Saladin",
  "Diyala", "Kirkuk", "Babylon", "Wasit", "Dhi Qar", "Maysan", "Muthanna", "Qadisiyah", "Duhok", "Sulaymaniyah"
];

export default function RegisterMosquePage() {
  const { language } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isEn = language === "en";
  const dir = isEn ? "ltr" : "rtl";

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    mosqueName: "",
    province: "",
    city: "",
    area: "",
    landmark: "",
    mosquePhone: "",
    applicantName: "",
    applicantPhone: "",
    requestedUsername: "",
    requestedPassword: "",
    confirmPassword: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.requestedPassword !== formData.confirmPassword) {
      toast({
        title: isEn ? "Error" : "خطأ",
        description: isEn ? "Passwords do not match" : "كلمات المرور غير متطابقة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost("/api/register-mosque", formData);
      if (res.ok) {
        setSuccess(true);
      } else {
        const errorData = await res.json();
        toast({
          title: isEn ? "Error" : "خطأ",
          description: errorData.message || (isEn ? "Registration failed" : "فشل التسجيل"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: isEn ? "Error" : "خطأ",
        description: isEn ? "Connection error" : "خطأ في الاتصال",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-3 py-6 sm:p-4 font-sans relative overflow-hidden" dir={dir} style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
        <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden backdrop-blur-sm bg-card/95 relative z-10 text-center p-8">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="w-20 h-20 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-bold mb-4">
            {isEn ? "Registration Request Received" : "تم استلام طلب التسجيل بنجاح"}
          </CardTitle>
          <CardDescription className="text-lg mb-8">
            {isEn 
              ? "Your request has been submitted for review. Our team will contact you soon." 
              : "تم إرسال طلبك للمراجعة. سيقوم فريقنا بالتواصل معك قريباً بعد مراجعة البيانات."}
          </CardDescription>
          <Button 
            className="w-full" 
            onClick={() => setLocation("/")}
            data-testid="button-back-to-login"
          >
            {isEn ? "Back to Login" : "العودة لتسجيل الدخول"}
          </Button>
        </Card>
      </div>
    );
  }

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

      <Card className="w-full max-w-2xl shadow-2xl border-0 overflow-hidden backdrop-blur-sm bg-card/95 relative z-10 my-8">
        <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 w-full" />
        <CardHeader className="text-center space-y-3 pb-2 pt-6">
          <p className="text-lg text-muted-foreground font-serif">﷽</p>
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 mb-2 relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
            <img src="/logo.png" alt="سِرَاجُ الْقُرْآنِ" className="w-full h-full rounded-2xl shadow-lg relative z-10" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary font-serif">
            {isEn ? "Mosque Registration" : "تسجيل مسجد / مركز جديد"}
          </CardTitle>
          <CardDescription>
            {isEn ? "Join Siraj Al-Quran to manage your Quran circles" : "انضم لنظام سِرَاجُ الْقُرْآنِ لإدارة حلقات التحفيظ في مسجدك/مركزك"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2 text-primary">
                {isEn ? "Mosque Information" : "بيانات المسجد"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mosqueName">{isEn ? "Mosque/Center Name" : "اسم المسجد/المركز"} <span className="text-destructive">*</span></Label>
                  <Input 
                    id="mosqueName" 
                    required 
                    value={formData.mosqueName}
                    onChange={(e) => handleChange("mosqueName", e.target.value)}
                    data-testid="input-mosqueName"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">{isEn ? "Province" : "المحافظة"} <span className="text-destructive">*</span></Label>
                  <SearchableSelect
                    options={PROVINCES.map((p, i) => ({ value: p, label: isEn ? PROVINCES_EN[i] : p }))}
                    value={formData.province}
                    onValueChange={(v) => handleChange("province", v)}
                    placeholder={isEn ? "Select province" : "اختر المحافظة"}
                    searchPlaceholder={isEn ? "Search..." : "ابحث عن محافظة..."}
                    emptyText={isEn ? "No results" : "لا توجد نتائج"}
                    data-testid="select-province"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{isEn ? "City / District" : "القضاء / المدينة"} <span className="text-destructive">*</span></Label>
                  <Input 
                    id="city" 
                    required 
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    data-testid="input-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">{isEn ? "Area / Neighborhood" : "المنطقة / الحي"} <span className="text-destructive">*</span></Label>
                  <Input 
                    id="area" 
                    required 
                    value={formData.area}
                    onChange={(e) => handleChange("area", e.target.value)}
                    data-testid="input-area"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landmark">{isEn ? "Landmark" : "أقرب نقطة دالة"} ({isEn ? "Optional" : "اختياري"})</Label>
                  <Input 
                    id="landmark" 
                    value={formData.landmark}
                    onChange={(e) => handleChange("landmark", e.target.value)}
                    data-testid="input-landmark"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isEn ? "Mosque Phone" : "رقم هاتف المسجد/المركز"} ({isEn ? "Optional" : "اختياري"})</Label>
                  <InternationalPhoneInput
                    value={formData.mosquePhone}
                    onChange={(full) => handleChange("mosquePhone", full)}
                    placeholder={isEn ? "Mosque phone" : "رقم هاتف المسجد/المركز"}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2 text-primary">
                {isEn ? "Administrator Information" : "بيانات المسؤول"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applicantName">{isEn ? "Full Name" : "الاسم الكامل"} <span className="text-destructive">*</span></Label>
                  <Input 
                    id="applicantName" 
                    required 
                    value={formData.applicantName}
                    onChange={(e) => handleChange("applicantName", e.target.value)}
                    data-testid="input-applicantName"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isEn ? "Phone Number" : "رقم الهاتف"} <span className="text-destructive">*</span></Label>
                  <InternationalPhoneInput
                    value={formData.applicantPhone}
                    onChange={(full) => handleChange("applicantPhone", full)}
                    placeholder={isEn ? "Phone number" : "رقم هاتف المسؤول"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestedUsername">{isEn ? "Desired Username" : "اسم المستخدم المطلوب"} <span className="text-destructive">*</span></Label>
                  <Input 
                    id="requestedUsername" 
                    required 
                    value={formData.requestedUsername}
                    onChange={(e) => handleChange("requestedUsername", e.target.value)}
                    data-testid="input-requestedUsername"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestedPassword">{isEn ? "Password" : "كلمة المرور"} <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input 
                      id="requestedPassword" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={formData.requestedPassword}
                      onChange={(e) => handleChange("requestedPassword", e.target.value)}
                      data-testid="input-requestedPassword"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute ${isEn ? "right-2" : "left-2"} top-1/2 -translate-y-1/2 text-muted-foreground`}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{isEn ? "Confirm Password" : "تأكيد كلمة المرور"} <span className="text-destructive">*</span></Label>
                  <Input 
                    id="confirmPassword" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    data-testid="input-confirmPassword"
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11" 
              disabled={loading}
              data-testid="button-submit-registration"
            >
              {loading ? (isEn ? "Submitting..." : "جاري الإرسال...") : (isEn ? "Submit Registration Request" : "إرسال طلب التسجيل")}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center border-t bg-muted/20 py-4 space-y-4">
          <Link href="/">
            <a className="text-sm text-primary hover:underline flex items-center gap-2" data-testid="link-back-to-login">
              {isEn ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              {isEn ? "Already have an account? Sign In" : "لديك حساب بالفعل؟ تسجيل الدخول"}
            </a>
          </Link>
          <p className="text-xs text-muted-foreground text-center space-y-1">
            <span className="block font-semibold">{isEn ? "This system is a Waqf for Allah" : "النظام وقف لله تعالى"}</span>
            <span className="block">{isEn ? "Developed by Ahmed Khaled Al-Zubaidi" : "برمجة وتطوير أحمد خالد الزبيدي"}</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
