import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { usePhoneValidation, phoneInputClassName, isValidPhone } from "@/lib/phone-utils";
import { InternationalPhoneInput } from "@/components/international-phone-input";
import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, AArrowUp, AArrowDown, RotateCcw, Minus, Plus, Camera, AlertTriangle, Trash2, Loader2, Shield, Users, UserCheck, UserX, Download, Upload, CheckCircle, Database, HardDrive, Building2, GraduationCap, BookOpen, ClipboardList, Award, FileText, Clock, CalendarDays, FolderDown, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr, formatDateTimeAr } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import DevicePermissions from "@/components/DevicePermissions";

const FONT_SIZE_KEY = "mutqin_font_size";
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 28;

const FONT_PRESETS = [
  { label: "صغير جداً", size: 12 },
  { label: "صغير", size: 14 },
  { label: "متوسط", size: 16 },
  { label: "كبير", size: 18 },
  { label: "كبير جداً", size: 22 },
  { label: "ضخم", size: 28 },
];

function getFontCategory(size: number): string {
  if (size <= 12) return "صغير جداً";
  if (size <= 14) return "صغير";
  if (size <= 16) return "متوسط";
  if (size <= 18) return "كبير";
  if (size <= 22) return "كبير جداً";
  return "ضخم";
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isDark, toggleDark, language, setLanguage } = useTheme();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const defaultTab = isAdmin ? "profile" : "mosque";
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatar);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const phoneValidation = usePhoneValidation(phone, user?.id);
  const [address, setAddress] = useState(user?.address || "");
  const [gender, setGender] = useState(user?.gender || "male");
  const [username, setUsername] = useState(user?.username || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_FONT_SIZE;
  });

  const [halaqatAlerts, setHalaqatAlerts] = useState(() => {
    const saved = localStorage.getItem("mutqin_notif_halaqat");
    return saved !== null ? saved === "true" : true;
  });
  const [dailyReminder, setDailyReminder] = useState(() => {
    const saved = localStorage.getItem("mutqin_notif_daily");
    return saved !== null ? saved === "true" : true;
  });
  const [adminMessages, setAdminMessages] = useState(() => {
    const saved = localStorage.getItem("mutqin_notif_admin");
    return saved !== null ? saved === "true" : true;
  });

  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => {
    const saved = localStorage.getItem("mutqin_shortcuts_enabled");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("mutqin_shortcuts_enabled", String(shortcutsEnabled));
  }, [shortcutsEnabled]);

  useEffect(() => {
    if (!shortcutsEnabled) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Alt + S for Settings
      if (e.altKey && e.key === "s") {
        e.preventDefault();
        window.location.hash = "/settings";
      }
      // Alt + D for Dashboard
      if (e.altKey && e.key === "d") {
        e.preventDefault();
        window.location.hash = "/";
      }
      // Alt + M for Messages
      if (e.altKey && e.key === "m") {
        e.preventDefault();
        window.location.hash = "/messages";
      }
      // Alt + Q for Quran Tracker
      if (e.altKey && e.key === "q") {
        e.preventDefault();
        window.location.hash = "/quran-tracker";
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [shortcutsEnabled]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
  }, [fontSize]);

  const increaseFontSize = useCallback(() => {
    setFontSize(prev => Math.min(prev + 1, MAX_FONT_SIZE));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize(prev => Math.max(prev - 1, MIN_FONT_SIZE));
  }, []);

  const resetFontSize = useCallback(() => {
    setFontSize(DEFAULT_FONT_SIZE);
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى اختيار ملف صورة", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64.length > 500000) {
        toast({ title: "خطأ", description: "حجم الصورة كبير جداً (الحد الأقصى ~375KB)", variant: "destructive" });
        return;
      }
      setAvatarPreview(base64);
      setUploadingAvatar(true);
      try {
        const res = await fetch(`/api/users/${user?.id}/avatar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ avatar: base64 }),
        });
        if (res.ok) {
          toast({ title: "تم بنجاح", description: "تم تحديث الصورة الشخصية", className: "bg-green-50 border-green-200 text-green-800" });
        } else {
          const data = await res.json();
          toast({ title: "خطأ", description: data.message || "فشل في تحديث الصورة", variant: "destructive" });
          setAvatarPreview(user?.avatar);
        }
      } catch {
        toast({ title: "خطأ", description: "حدث خطأ في الاتصال", variant: "destructive" });
        setAvatarPreview(user?.avatar);
      }
      setUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [message, setMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [accountMessageType, setAccountMessageType] = useState<"success" | "error">("success");

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, phone, address, gender }),
      });
      if (res.ok) {
        setMessage("تم حفظ التغييرات بنجاح. ستظهر التغييرات بعد تسجيل الخروج وإعادة الدخول");
        setMessageType("success");
      } else {
        const data = await res.json();
        setMessage(data.message || "فشل في حفظ التغييرات");
        setMessageType("error");
      }
    } catch {
      setMessage("حدث خطأ في الاتصال");
      setMessageType("error");
    }
    setSaving(false);
  };

  const handleSaveAccount = async () => {
    setAccountMessage("");

    if (newPassword && newPassword !== confirmPassword) {
      setAccountMessage("كلمة المرور الجديدة غير متطابقة");
      setAccountMessageType("error");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setAccountMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      setAccountMessageType("error");
      return;
    }

    if (!username.trim()) {
      setAccountMessage("اسم المستخدم مطلوب");
      setAccountMessageType("error");
      return;
    }

    setSavingAccount(true);
    try {
      const updateData: any = {};
      if (username !== user?.username) updateData.username = username;
      if (newPassword) updateData.password = newPassword;

      if (Object.keys(updateData).length === 0) {
        setAccountMessage("لم يتم تغيير أي بيانات");
        setAccountMessageType("error");
        setSavingAccount(false);
        return;
      }

      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        setAccountMessage("تم حفظ التغييرات بنجاح. سيتم تسجيل خروجك الآن لتفعيل التغييرات...");
        setAccountMessageType("success");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        const data = await res.json();
        setAccountMessage(data.message || "فشل في حفظ التغييرات");
        setAccountMessageType("error");
      }
    } catch {
      setAccountMessage("حدث خطأ في الاتصال");
      setAccountMessageType("error");
    }
    setSavingAccount(false);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary">الإعدادات</h1>
      
      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="h-12 bg-muted/50 p-1">
            {!isAdmin && (
              <TabsTrigger value="mosque" className="flex-1 max-w-[200px] whitespace-nowrap">بيانات الجامع/المركز</TabsTrigger>
            )}
            <TabsTrigger value="profile" className="flex-1 max-w-[200px] whitespace-nowrap">الملف الشخصي</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="account" className="flex-1 max-w-[200px] whitespace-nowrap">حساب المدير</TabsTrigger>
            )}
            <TabsTrigger value="general" className="flex-1 max-w-[200px] whitespace-nowrap">إعدادات النظام</TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 max-w-[200px] whitespace-nowrap">الإشعارات</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="privacy-policy" className="flex-1 max-w-[200px] whitespace-nowrap">سياسة الخصوصية</TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="backup" className="flex-1 max-w-[200px] whitespace-nowrap">النسخ الاحتياطي</TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="system-management" className="flex-1 max-w-[200px] whitespace-nowrap text-red-600">إدارة النظام</TabsTrigger>
            )}
          </TabsList>
        </div>

        {!isAdmin && (
          <TabsContent value="mosque" className="space-y-6 mt-6">
             <Card>
              <CardHeader>
                <CardTitle>الملف التعريفي للجامع/المركز</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم الجامع/المركز</Label>
                    <Input defaultValue={user?.mosqueName || ""} readOnly disabled className="bg-muted cursor-not-allowed" />
                    <p className="text-xs text-muted-foreground">لتغيير اسم الجامع/المركز تواصل مع مدير النظام</p>
                  </div>
                  <div className="space-y-2">
                    <Label>العنوان</Label>
                    <Input defaultValue="" />
                  </div>
                  <div className="space-y-2">
                    <Label>الإمام والخطيب</Label>
                    <Input defaultValue="" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input defaultValue="" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>نبذة تعريفية</Label>
                    <Textarea placeholder="اكتب نبذة عن نشاطات الجامع/المركز..." className="min-h-[100px]" />
                  </div>
                </div>
                <Button className="bg-primary text-white">حفظ بيانات الجامع/المركز</Button>
              </CardContent>
             </Card>
          </TabsContent>
        )}

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>بيانات المستخدم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-primary object-cover" data-testid="img-settings-avatar" />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    data-testid="input-avatar-file"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="gap-2"
                    data-testid="button-change-avatar"
                  >
                    <Camera className="w-4 h-4" />
                    {uploadingAvatar ? "جاري الرفع..." : "تغيير الصورة"}
                  </Button>
                </div>
              </div>
              
              {message && (
                <div className={`p-3 rounded-md text-sm text-center ${messageType === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-destructive/10 text-destructive"}`}>
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-settings-name" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <InternationalPhoneInput
                    value={phone}
                    onChange={(full) => setPhone(full)}
                    error={phoneValidation.message && !phoneValidation.valid ? phoneValidation.message : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} data-testid="input-settings-address" />
                </div>
                <div className="space-y-2">
                  <Label>الجنس</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger data-testid="select-settings-gender">
                      <SelectValue placeholder="اختر الجنس" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="bg-primary text-white" onClick={handleSaveProfile} disabled={saving} data-testid="button-save-profile">
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="account" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات حساب مدير النظام</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">يمكنك تغيير اسم المستخدم وكلمة المرور. سيتم تسجيل خروجك تلقائياً بعد الحفظ لتفعيل التغييرات.</p>

                {accountMessage && (
                  <div className={`p-3 rounded-md text-sm text-center ${accountMessageType === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-destructive/10 text-destructive"}`}>
                    {accountMessage}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} data-testid="input-admin-username" />
                  </div>

                  <div className="space-y-2">
                    <Label>كلمة المرور الجديدة</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="اتركه فارغاً إذا لا تريد التغيير"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10"
                        data-testid="input-admin-new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>تأكيد كلمة المرور الجديدة</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="أعد كتابة كلمة المرور الجديدة"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        data-testid="input-admin-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button className="bg-primary text-white" onClick={handleSaveAccount} disabled={savingAccount} data-testid="button-save-account">
                  {savingAccount ? "جاري الحفظ..." : "حفظ وتسجيل الخروج"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>المظهر واللغة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">اختصارات لوحة المفاتيح</Label>
                  <p className="text-sm text-muted-foreground">تفعيل اختصارات Alt + (S, D, M, Q) للتنقل السريع</p>
                </div>
                <Switch checked={shortcutsEnabled} onCheckedChange={setShortcutsEnabled} data-testid="switch-shortcuts" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">الوضع الليلي</Label>
                  <p className="text-sm text-muted-foreground">تفعيل المظهر الداكن للتطبيق</p>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleDark} data-testid="switch-dark-mode" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">اللغة</Label>
                  <p className="text-sm text-muted-foreground">لغة واجهة المستخدم</p>
                </div>
                 <Select value={language} onValueChange={(val) => setLanguage(val as "ar" | "en")} data-testid="select-language">
                    <SelectTrigger className="w-[150px]" data-testid="select-language-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>حجم الخط</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">حجم خط الواجهة</Label>
                    <p className="text-sm text-muted-foreground">تكبير أو تصغير حجم النصوص في التطبيق</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium" data-testid="text-font-category">
                      {getFontCategory(fontSize)}
                    </span>
                    <span className="text-sm font-bold text-primary min-w-[40px] text-center" data-testid="text-font-size">{fontSize}px</span>
                    {fontSize !== DEFAULT_FONT_SIZE && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={resetFontSize}
                        className="h-8 w-8"
                        title="إعادة تعيين"
                        data-testid="button-font-reset"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decreaseFontSize}
                    disabled={fontSize <= MIN_FONT_SIZE}
                    className="h-9 w-9 shrink-0"
                    data-testid="button-font-decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>

                  <div className="flex-1 relative">
                    <Slider
                      value={[fontSize]}
                      min={MIN_FONT_SIZE}
                      max={MAX_FONT_SIZE}
                      step={1}
                      onValueChange={([val]) => setFontSize(val)}
                      className="w-full"
                      data-testid="slider-font-size"
                    />
                    <div className="flex justify-between mt-1 px-1">
                      <span className="text-[10px] text-muted-foreground">صغير</span>
                      <span className="text-[10px] text-muted-foreground">كبير</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={increaseFontSize}
                    disabled={fontSize >= MAX_FONT_SIZE}
                    className="h-9 w-9 shrink-0"
                    data-testid="button-font-increase"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {FONT_PRESETS.map((preset) => (
                    <Button
                      key={preset.size}
                      variant={fontSize === preset.size ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFontSize(preset.size)}
                      className="text-xs"
                      data-testid={`button-font-preset-${preset.size}`}
                    >
                      {preset.label} ({preset.size})
                    </Button>
                  ))}
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-2">معاينة:</p>
                  <p style={{ fontSize: `${fontSize}px` }} data-testid="text-font-preview">بسم الله الرحمن الرحيم - هذا نص تجريبي لمعاينة حجم الخط</p>
                </div>
              </div>
              <Button
                className="bg-primary text-white mt-4"
                data-testid="button-save-general"
                onClick={() => {
                  toast({
                    title: "تم بنجاح",
                    description: "تم حفظ إعدادات النظام بنجاح",
                    className: "bg-green-50 border-green-200 text-green-800",
                  });
                }}
              >
                حفظ التغييرات
              </Button>
              <p className="text-xs text-muted-foreground mt-2">التغييرات تُطبق فوراً</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6 mt-6">
           <DevicePermissions />
           <Card>
            <CardHeader>
              <CardTitle>تفضيلات الإشعارات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">تنبيهات الحلقات</Label>
                  <p className="text-sm text-muted-foreground">إشعار عند بدء الحلقة الدراسية</p>
                </div>
                <Switch checked={halaqatAlerts} onCheckedChange={setHalaqatAlerts} data-testid="switch-halaqat-alerts" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">تذكير الحفظ اليومي</Label>
                  <p className="text-sm text-muted-foreground">تذكير يومي بمراجعة الورد القرآني</p>
                </div>
                <Switch checked={dailyReminder} onCheckedChange={setDailyReminder} data-testid="switch-daily-reminder" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">رسائل الإدارة</Label>
                  <p className="text-sm text-muted-foreground">استلام تعاميم من إدارة المركز</p>
                </div>
                <Switch checked={adminMessages} onCheckedChange={setAdminMessages} data-testid="switch-admin-messages" />
              </div>
              <Button
                className="bg-primary text-white mt-4"
                data-testid="button-save-notifications"
                onClick={() => {
                  localStorage.setItem("mutqin_notif_halaqat", String(halaqatAlerts));
                  localStorage.setItem("mutqin_notif_daily", String(dailyReminder));
                  localStorage.setItem("mutqin_notif_admin", String(adminMessages));
                  toast({
                    title: "تم بنجاح",
                    description: "تم حفظ تفضيلات الإشعارات بنجاح",
                    className: "bg-green-50 border-green-200 text-green-800",
                  });
                }}
              >
                حفظ الإعدادات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="privacy-policy" className="space-y-6 mt-6">
            <PrivacyPolicySection />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="backup" className="space-y-6 mt-6">
            <BackupSection />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="system-management" className="space-y-6 mt-6">
            <SystemResetSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

interface UserData {
  id: string;
  name: string;
  username: string;
  role: string;
  acceptedPrivacyPolicy: boolean;
  mosqueName?: string;
}

const PRIVACY_POLICY_TEXT = `سياسة الخصوصية لنظام سِرَاجُ الْقُرْآنِ

أولاً: جمع البيانات واستخدامها
يقوم نظام سِرَاجُ الْقُرْآنِ بجمع البيانات الشخصية التالية لأغراض تشغيل النظام التعليمي:
• الاسم الكامل ومعلومات التواصل (رقم الهاتف، العنوان)
• بيانات الحساب (اسم المستخدم وكلمة المرور المشفرة)
• بيانات التعلم والتقييم (سجلات الحفظ، الدرجات، الواجبات)
• بيانات الحضور والانصراف
• الصور الشخصية (في حال رفعها)
تُستخدم هذه البيانات حصرياً لتقديم الخدمات التعليمية وإدارة الحلقات القرآنية.

ثانياً: حقوق المستخدم
يحق لكل مستخدم:
• الاطلاع على بياناته الشخصية المحفوظة في النظام
• طلب تصحيح أي معلومات غير دقيقة
• طلب حذف حسابه وبياناته من النظام
• الحصول على نسخة من بياناته الشخصية
• الاعتراض على أي معالجة لبياناته الشخصية

ثالثاً: مشاركة البيانات
• لا يتم مشاركة البيانات الشخصية مع أي أطراف خارجية
• يمكن للمشرفين والأساتذة الاطلاع على بيانات الطلاب المرتبطين بهم فقط
• يحق لمدير النظام الاطلاع على جميع البيانات لأغراض الإدارة
• لا يتم بيع أو تأجير البيانات الشخصية لأي جهة

رابعاً: أمن البيانات
• يتم تشفير كلمات المرور باستخدام خوارزميات تشفير قوية
• يتم حماية الاتصال بالنظام عبر بروتوكول HTTPS
• يتم إجراء نسخ احتياطية دورية للبيانات
• يتم تقييد الوصول للبيانات بناءً على صلاحيات المستخدم

خامساً: معلومات التواصل
لأي استفسارات تتعلق بسياسة الخصوصية أو لممارسة حقوقك، يرجى التواصل مع إدارة النظام عبر القنوات الرسمية المتاحة في التطبيق.

تاريخ آخر تحديث: فبراير 2026`;

function PrivacyPolicySection() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const totalUsers = users.filter(u => u.role !== "admin").length;
  const acceptedUsers = users.filter(u => u.role !== "admin" && u.acceptedPrivacyPolicy).length;
  const nonCompliantUsers = users.filter(u => u.role !== "admin" && !u.acceptedPrivacyPolicy);

  const getRoleName = (role: string) => {
    switch (role) {
      case "teacher": return "أستاذ";
      case "student": return "طالب";
      case "supervisor": return "مشرف";
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            نص سياسة الخصوصية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={PRIVACY_POLICY_TEXT}
            readOnly
            className="min-h-[400px] text-sm leading-relaxed font-medium bg-muted/30 resize-none"
            dir="rtl"
            data-testid="textarea-privacy-policy"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-total-users">
                  {loading ? "..." : totalUsers}
                </p>
              </div>
              <Users className="w-10 h-10 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قبلوا السياسة</p>
                <p className="text-3xl font-bold text-green-600" data-testid="text-accepted-users">
                  {loading ? "..." : acceptedUsers}
                </p>
              </div>
              <UserCheck className="w-10 h-10 text-green-600/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">لم يقبلوا بعد</p>
                <p className="text-3xl font-bold text-red-600" data-testid="text-noncompliant-users">
                  {loading ? "..." : nonCompliantUsers.length}
                </p>
              </div>
              <UserX className="w-10 h-10 text-red-600/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-400">قبول سياسة الخصوصية إلزامي لجميع المستخدمين</p>
              <p className="text-sm text-green-600/80 dark:text-green-500/80 mt-1">يُطلب من جميع المستخدمين قبول سياسة الخصوصية قبل استخدام النظام. لا يمكن تعطيل هذا الإعداد.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            المستخدمون الذين لم يقبلوا السياسة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : nonCompliantUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-2 text-green-500/50" />
              <p>جميع المستخدمين قبلوا سياسة الخصوصية</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {nonCompliantUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                  data-testid={`row-noncompliant-user-${u.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 text-sm font-bold">
                      {u.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.username}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getRoleName(u.role)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BackupSection() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [backupData, setBackupData] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [restorePassword, setRestorePassword] = useState("");
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/system/backup/stats", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative = "";
    if (diffMins < 1) relative = "الآن";
    else if (diffMins < 60) relative = `منذ ${diffMins} دقيقة`;
    else if (diffHours < 24) relative = `منذ ${diffHours} ساعة`;
    else if (diffDays < 30) relative = `منذ ${diffDays} يوم`;
    else relative = `منذ ${Math.floor(diffDays / 30)} شهر`;

    const formatted = formatDateTimeAr(d);
    return { relative, formatted };
  };

  const saveBlob = async (blob: Blob, fileName: string) => {
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: "JSON Backup",
            accept: { "application/json": [".json"] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err: any) {
        if (err.name === "AbortError") return false;
        throw err;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/system/backup", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const dateStr = new Date().toISOString().split("T")[0];
        const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
        const fileName = `mutqin_backup_${dateStr}_${timeStr}.json`;
        const saved = await saveBlob(blob, fileName);
        if (saved) {
          const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
          toast({ title: "تم بنجاح", description: `تم حفظ النسخة الاحتياطية (${sizeMB} MB)`, className: "bg-green-50 border-green-200 text-green-800" });
          setStats((prev: any) => prev ? { ...prev, lastBackupDate: new Date().toISOString() } : prev);
        }
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء النسخة الاحتياطية", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValidationResult(null);
    setBackupData(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setBackupData(parsed);

      setValidating(true);
      const res = await fetch("/api/system/backup/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(parsed),
      });
      const result = await res.json();
      setValidationResult(result);
    } catch {
      setValidationResult({ valid: false, summary: null, errors: ["فشل في قراءة الملف أو تحليله. تأكد أنه ملف JSON صالح."] });
    } finally {
      setValidating(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRestore = async () => {
    if (!restorePassword) {
      toast({ title: "خطأ", description: "يرجى إدخال كلمة مرور المدير", variant: "destructive" });
      return;
    }
    setRestoring(true);
    try {
      const res = await fetch("/api/system/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: restorePassword, backup: backupData }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم استعادة النسخة الاحتياطية بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setRestoreDialogOpen(false);
        setRestorePassword("");
        setBackupData(null);
        setValidationResult(null);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في استعادة النسخة الاحتياطية", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  const lastBackup = stats?.lastBackupDate ? formatDate(stats.lastBackupDate) : null;

  const statItems = stats ? [
    { label: "المساجد", value: stats.mosques, icon: Building2, color: "text-emerald-600" },
    { label: "المشرفون", value: stats.supervisors, icon: Shield, color: "text-violet-600" },
    { label: "الأساتذة", value: stats.teachers, icon: GraduationCap, color: "text-blue-600" },
    { label: "الطلاب", value: stats.students, icon: Users, color: "text-sky-600" },
    { label: "الواجبات", value: stats.assignments, icon: BookOpen, color: "text-amber-600" },
    { label: "الحضور", value: stats.attendance, icon: ClipboardList, color: "text-teal-600" },
    { label: "الدورات", value: stats.courses, icon: FileText, color: "text-indigo-600" },
    { label: "الشهادات", value: stats.certificates, icon: Award, color: "text-rose-600" },
    { label: "الامتحانات", value: stats.exams, icon: ClipboardList, color: "text-orange-600" },
  ] : [];

  return (
    <div className="space-y-6">
      {lastBackup && (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-gradient-to-l from-primary/5 to-transparent">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">آخر نسخة احتياطية</p>
            <p className="text-base font-bold text-primary">{lastBackup.relative}</p>
          </div>
          <div className="text-left shrink-0">
            <p className="text-xs text-muted-foreground">{lastBackup.formatted}</p>
          </div>
        </div>
      )}
      {!lastBackup && !statsLoading && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">لم يتم إنشاء أي نسخة احتياطية بعد</p>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            ملخص بيانات النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {statItems.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <span className="text-xl font-bold" data-testid={`text-backup-stat-${item.label}`}>{item.value.toLocaleString("ar-SA")}</span>
                  <span className="text-[11px] text-muted-foreground text-center leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderDown className="w-5 h-5" />
            تصدير نسخة احتياطية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <HardDrive className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">تصدير جميع بيانات النظام</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">سيتم إنشاء ملف JSON يحتوي على جميع البيانات. يمكنك اختيار مكان حفظ الملف على جهازك.</p>
              </div>
            </div>
          </div>
          <Button onClick={handleExport} disabled={exporting} className="gap-2" size="lg" data-testid="button-export-backup">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {exporting ? "جاري إنشاء النسخة..." : "إنشاء نسخة احتياطية وحفظها"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            استيراد واستعادة نسخة احتياطية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">تحذير: استعادة النسخة الاحتياطية ستحل محل جميع البيانات الحالية</p>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">تأكد من أخذ نسخة احتياطية من البيانات الحالية قبل الاستعادة.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>اختر ملف النسخة الاحتياطية (.json)</Label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              data-testid="input-backup-file"
            />
          </div>

          {validating && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">جاري التحقق من صحة الملف...</span>
            </div>
          )}

          {validationResult && (
            <div className={`p-4 rounded-lg border ${validationResult.valid ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"}`}>
              <div className="flex items-center gap-2 mb-3">
                {validationResult.valid ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-300">الملف صالح وجاهز للاستعادة</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800 dark:text-red-300">الملف غير صالح</span>
                  </>
                )}
              </div>

              {validationResult.summary && (
                <div className="space-y-2 mb-3">
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">عدد الجداول: <strong>{validationResult.summary.tables}</strong></span>
                    <span className="text-muted-foreground">إجمالي السجلات: <strong>{validationResult.summary.totalRecords}</strong></span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {validationResult.summary.details?.filter((d: any) => d.count > 0).map((d: any) => (
                      <span key={d.tableName} className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                        {d.tableName}: {d.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.errors?.length > 0 && (
                <div className="space-y-1">
                  {validationResult.errors.map((err: string, i: number) => (
                    <p key={i} className="text-sm text-red-600 dark:text-red-400">• {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {validationResult?.valid && backupData && (
            <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" data-testid="button-open-restore">
                  <Shield className="w-4 h-4" />
                  تنفيذ النسخة الاحتياطية
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    تأكيد استعادة النسخة الاحتياطية
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-right">
                    سيتم استبدال جميع البيانات الحالية ببيانات النسخة الاحتياطية. يرجى إدخال كلمة مرور المدير للتأكيد.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>كلمة مرور المدير</Label>
                    <div className="relative">
                      <Input
                        type={showRestorePassword ? "text" : "password"}
                        value={restorePassword}
                        onChange={(e) => setRestorePassword(e.target.value)}
                        placeholder="أدخل كلمة مرور المدير"
                        className="pl-10"
                        data-testid="input-restore-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRestorePassword(!showRestorePassword)}
                        className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showRestorePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogCancel data-testid="button-cancel-restore">إلغاء</AlertDialogCancel>
                  <Button
                    onClick={handleRestore}
                    disabled={restoring || !restorePassword}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-confirm-restore"
                  >
                    {restoring && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                    تأكيد الاستعادة
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SystemResetSection() {
  const { toast } = useToast();
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleReset = async () => {
    if (!resetPassword) {
      toast({ title: "خطأ", description: "يرجى إدخال كلمة مرور المدير", variant: "destructive" });
      return;
    }
    if (confirmText !== "تصفير النظام") {
      toast({ title: "خطأ", description: "يرجى كتابة 'تصفير النظام' للتأكيد", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/system/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: resetPassword }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم تصفير النظام بالكامل", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        setResetPassword("");
        setConfirmText("");
        window.location.reload();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في تصفير النظام", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900">
      <CardHeader>
        <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          منطقة الخطر - تصفير النظام
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-red-100/50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-2">تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
          <p className="text-sm text-red-700 dark:text-red-400">سيتم حذف جميع البيانات التالية نهائياً:</p>
          <ul className="text-sm text-red-700 dark:text-red-400 mt-2 space-y-1 list-disc list-inside">
            <li>جميع المساجد المسجلة</li>
            <li>جميع حسابات المشرفين والأساتذة والطلاب</li>
            <li>جميع الواجبات والامتحانات والتقييمات</li>
            <li>جميع الدورات والشهادات</li>
            <li>جميع الإشعارات وسجلات النشاط</li>
          </ul>
          <p className="text-sm text-red-800 dark:text-red-300 font-medium mt-3">سيبقى حساب المدير فقط.</p>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto" data-testid="button-open-reset">
              <Trash2 className="w-4 h-4 ml-2" />
              مسح جميع البيانات وتصفير النظام
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                تأكيد تصفير النظام
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                هذا الإجراء سيحذف جميع البيانات المدخلة بشكل نهائي ولا يمكن التراجع عنه.
                يرجى إدخال كلمة مرور المدير وكتابة "تصفير النظام" للتأكيد.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>كلمة مرور المدير</Label>
                <div className="relative">
                  <Input
                    type={showResetPassword ? "text" : "password"}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="أدخل كلمة مرور المدير"
                    className="pl-10"
                    data-testid="input-reset-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>اكتب "تصفير النظام" للتأكيد</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='اكتب: تصفير النظام'
                  dir="rtl"
                  data-testid="input-reset-confirm"
                />
              </div>
            </div>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel data-testid="button-cancel-reset">إلغاء</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={resetting || !resetPassword || confirmText !== "تصفير النظام"}
                data-testid="button-confirm-reset"
              >
                {resetting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                تأكيد التصفير النهائي
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
